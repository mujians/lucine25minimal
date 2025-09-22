import OpenAI from "openai";
import { readFileSync } from 'fs';
import { join } from 'path';
import { addWhatsAppUser, findUserBySession } from '../utils/whatsapp-storage.js';
import { logConversation, detectIntent } from '../utils/sheets-logger.js';

// Rate limiting semplice (in memoria)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minuto
const RATE_LIMIT_MAX = 10; // Max 10 richieste per minuto

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-ID');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const startTime = Date.now();
    
    // Rate limiting
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const now = Date.now();
    const clientKey = `${clientIP}`;
    
    if (!rateLimitMap.has(clientKey)) {
      rateLimitMap.set(clientKey, { count: 0, resetTime: now + RATE_LIMIT_WINDOW });
    }
    
    const clientData = rateLimitMap.get(clientKey);
    if (now > clientData.resetTime) {
      clientData.count = 0;
      clientData.resetTime = now + RATE_LIMIT_WINDOW;
    }
    
    if (clientData.count >= RATE_LIMIT_MAX) {
      return res.status(429).json({ 
        error: "Troppi messaggi. Riprova tra qualche istante.",
        escapeRoutes: getEscapeRoutes('rate_limit')
      });
    }
    clientData.count++;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "Servizio temporaneamente non disponibile.",
        escapeRoutes: getEscapeRoutes('error')
      });
    }

    const { message, sessionId } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Messaggio richiesto." });
    }

    // Carica knowledge base
    const knowledgeBase = loadKnowledgeBase();
    
    // Real-time info rimosso - sempre dati statici da knowledge base
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Context basato solo su knowledge base statica
    const context = buildContextFromKnowledgeBase(knowledgeBase);

    const resp = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: context },
        { role: "user", content: message }
      ],
      max_tokens: 250,
      temperature: 0.3
    });

    let reply = resp?.choices?.[0]?.message?.content?.trim();
    
    // Gestione raccolta numero WhatsApp
    if (reply.includes('WHATSAPP_REQUEST') || message.toLowerCase().includes('whatsapp') || 
        message.toLowerCase().includes('notifiche') || message.toLowerCase().includes('aggiornamenti')) {
      
      // Verifica se ha già fornito un numero
      const phonePattern = /(\+39\s?)?(\d{3}\s?\d{3}\s?\d{4}|\d{10})/;
      const phoneMatch = message.match(phonePattern);
      
      if (phoneMatch) {
        // Numero fornito - salvalo e conferma
        const phoneNumber = phoneMatch[0].replace(/\s/g, '');
        const formattedPhone = phoneNumber.startsWith('+39') ? phoneNumber : '+39' + phoneNumber;
        
        // Salva nel database
        const currentSessionId = sessionId || generateSessionId();
        const saved = addWhatsAppUser(currentSessionId, formattedPhone, {
          source: 'chatbot',
          user_agent: req.headers['user-agent'],
          ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
        });
        
        if (saved) {
          // Invia notifica di benvenuto WhatsApp
          try {
            await fetch(`${req.protocol}://${req.get('host')}/api/whatsapp`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'send_template',
                to: formattedPhone,
                templateName: 'welcome',
                templateData: {
                  name: 'Visitatore',
                  event: 'Lucine di Natale Leggiuno'
                }
              })
            });
          } catch (error) {
            console.error('❌ Errore invio benvenuto WhatsApp:', error);
          }
        }
        
        return res.status(200).json({
          reply: `✅ Perfetto! Ho salvato il tuo numero WhatsApp: ${formattedPhone}\n\nRiceverai notifiche per:\n📱 Aggiornamenti biglietti\n🎫 Conferme prenotazione\n💬 Supporto diretto\n\n${saved ? '🟢 Sistema attivo' : '🟡 Salvato localmente'}\n\nPer disattivare scrivi "STOP WhatsApp"`,
          sessionId: currentSessionId,
          whatsapp_number: formattedPhone,
          whatsapp_saved: saved
        });
      } else {
        // Richiedi il numero
        return res.status(200).json({
          reply: `📱 **Attiva notifiche WhatsApp**\n\nPer ricevere aggiornamenti istantanei su biglietti e supporto, condividi il tuo numero WhatsApp:\n\n**Esempio:** +39 123 456 7890\n\n✨ Riceverai:\n🎫 Conferme prenotazione\n📱 Aggiornamenti evento\n💬 Supporto prioritario\n\n*Rispetta la privacy - solo notifiche essenziali*`,
          sessionId: sessionId || generateSessionId()
        });
      }
    }

    // Se OpenAI ha riconosciuto una richiesta di prenotazione
    if (reply.includes('BOOKING_REQUEST')) {
      const bookingRequest = parseBookingRequest(message);
      
      if (bookingRequest.dates.length > 0) {
        // Controlla date chiuse (24 e 31 dicembre)
        const closedDates = ['2024-12-24', '2024-12-31'];
        const invalidDates = bookingRequest.dates.filter(date => 
          closedDates.includes(date.formatted)
        );
        
        if (invalidDates.length > 0) {
          const invalidDatesList = invalidDates.map(d => `${d.day} ${d.month === 12 ? 'dicembre' : 'gennaio'}`).join(', ');
          reply = `⚠️ Attenzione: Il parco è CHIUSO il ${invalidDatesList}.\n\nPer le altre date, usa il calendario di prenotazione:\n🎫 ${knowledgeBase.products?.main_ticket?.url}\n\nPer assistenza specifica contatta:\n📧 ${knowledgeBase.contact.email}`;
        } else {
          // Sempre mandare al calendario per selezione precisa di data e orario
          const datesList = bookingRequest.dates.map(d => 
            `${d.day} ${d.month === 12 ? 'dicembre' : 'gennaio'}`
          ).join(' e ');
          
          reply = `🎫 Per prenotare ${bookingRequest.quantity || ''} biglietti per il ${datesList}:\n\n👆 ${knowledgeBase.products?.main_ticket?.url}\n\n📅 **Seleziona data e fascia oraria**\n🎟️ **Scegli tipo biglietto** (Intero/Ridotto/SaltaFila)\n🛒 **Aggiungi al carrello**\n\n💡 Il calendario mostra la disponibilità real-time per ogni orario!`;
        }
      } else {
        // Richiesta di prenotazione senza date specifiche
        reply = `🎫 Per prenotare biglietti, usa il calendario interattivo:\n\n👆 ${knowledgeBase.products?.main_ticket?.url}\n\n📅 Seleziona data e orario\n🎟️ Scegli tipo biglietto\n🛒 Aggiungi al carrello`;
      }
    }
    
    // Regex fallback rimosso - GPT gestisce tutti gli intent tramite prompt migliorato
    
    // Controlla se la risposta è troppo generica o indica incertezza
    if (!reply || isLowConfidenceReply(reply)) {
      
      // Controlla se l'utente ha già confermato (messaggio contiene "sì" o "conferma")
      const confirmationPattern = /(sì|si|conferma|contatta|operatore|help|aiuto)/i;
      const isConfirming = confirmationPattern.test(message.toLowerCase());
      
      if (isConfirming && message.toLowerCase().includes('operatore')) {
        // Utente ha confermato - crea ticket
        const whatsappUser = findUserBySession(sessionId);
        const ticketResult = await tryCreateTicket(message, sessionId, req, whatsappUser?.phone_number);
        
        if (ticketResult.success) {
          reply = `✅ ${ticketResult.message}\n\nTicket ID: #${ticketResult.ticket_id}\n\n📧 Riceverai risposta via email entro 24h.${whatsappUser ? '\n📱 Ti contatteremo anche su WhatsApp!' : ''}`;
        } else {
          reply = `❌ Errore nella creazione del ticket. Contatta direttamente:\n📧 ${knowledgeBase.contact.email}\n📱 ${knowledgeBase.contact.whatsapp}`;
        }
      } else {
        // Prima richiesta - chiedi conferma
        return res.status(200).json({
          reply: `🤔 Non ho trovato una risposta precisa alla tua domanda.\n\n**Vuoi che contatti un operatore umano?**\n\nUn operatore potrà aiutarti con informazioni dettagliate e supporto personalizzato.\n\n✅ Rispondi **"Sì, contatta operatore"** per creare un ticket\n❌ Oppure prova:\n📧 Email: ${knowledgeBase.contact.email}\n📱 WhatsApp: ${knowledgeBase.contact.whatsapp}`,
          sessionId: sessionId || generateSessionId(),
          needsConfirmation: true,
          confirmationType: 'ticket_creation'
        });
      }
    }

    // Log semplice nella console di Vercel (visibile in realtime)
    console.log('=== CHAT LOG ===');
    console.log('Time:', new Date().toISOString());
    console.log('Session:', sessionId);
    console.log('User:', message);
    console.log('Bot:', reply);
    console.log('IP:', req.headers['x-forwarded-for'] || 'unknown');
    console.log('================');

    // Aggiungi smart actions contestuali
    const smartActions = getSmartActions(reply, message, knowledgeBase);
    // Suggerimenti esterni rimossi per richiesta utente

    // 📊 SALVA CONVERSAZIONE SU GOOGLE SHEETS
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    const intentDetected = detectIntent(message, reply);
    const whatsappUser = findUserBySession(sessionId);
    
    // Salva conversazione (async, non blocca risposta)
    logConversation({
      sessionId: sessionId || generateSessionId(),
      userMessage: message,
      botReply: reply,
      userIP: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
      smartActions: smartActions,
      responseTime: responseTime,
      intentDetected: intentDetected,
      whatsappUser: !!whatsappUser,
      userAgent: req.headers['user-agent'] || ''
    }).catch(error => {
      console.error('❌ Errore logging Google Sheets:', error);
    });

    return res.status(200).json({ 
      reply,
      smartActions,
      sessionId: sessionId || generateSessionId()
    });

  } catch (err) {
    console.error("Chat API Error:", err);
    const knowledgeBase = loadKnowledgeBase();
    return res.status(500).json({ 
      error: "Si è verificato un errore tecnico.",
      escapeRoutes: getEscapeRoutes('error', knowledgeBase)
    });
  }
}

function loadKnowledgeBase() {
  try {
    const filePath = join(process.cwd(), 'data', 'knowledge-base.json');
    const data = readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading knowledge base:', error);
    return getDefaultKnowledgeBase();
  }
}

function buildContextFromKnowledgeBase(kb) {
  const ticketUrl = kb.products?.main_ticket?.url || 'https://lucinedinatale.it/products/biglietto-parco-lucine-di-natale-2025';
  const availabilityText = '\n✅ Biglietti disponibili - usa il calendario per disponibilità real-time';

  return `Sei l'assistente virtuale delle Lucine di Natale di Leggiuno. Rispondi sempre in italiano, in modo cordiale e preciso.

EVENTO: ${kb.event.name}
Date: ${kb.event.dates.start} - ${kb.event.dates.end} (chiuso ${kb.event.dates.closed.join(', ')})
Orari: ${kb.event.hours.open}-${kb.event.hours.close} (ultimo ingresso ${kb.event.hours.lastEntry})
Luogo: ${kb.event.location.city}, ${kb.event.location.area}

BIGLIETTI:
- Intero: €${kb.tickets.prices.intero} (${kb.products?.main_ticket?.variants?.intero || 'accesso standard'})
- Ridotto (3-12 anni): €${kb.tickets.prices.ridotto} (${kb.products?.main_ticket?.variants?.ridotto || 'bambini e disabili'})
- SaltaFila: €${kb.tickets.prices.saltafila} (${kb.products?.main_ticket?.variants?.saltafila || 'accesso prioritario'})
- Open Ticket: €${kb.tickets.prices.open} (${kb.products?.main_ticket?.variants?.open || 'massima flessibilità'})
- Under 3: Gratis
- ${kb.tickets.discounts.online}
🎫 ACQUISTA: ${ticketUrl}${availabilityText}

PARCHEGGI: P1-P5, navetta gratuita ${kb.parking.shuttle.hours} ${kb.parking.shuttle.frequency}

SERVIZI:
- ${kb.services.accessibility.description}
- ${kb.services.pets.description}
- Mercatini e stand gastronomici

REGOLE IMPORTANTI:
- Se qualcuno chiede date disponibili o calendario, menziona che il sistema di prenotazione ha un calendario interattivo
- INTENT ACQUISTO/PRENOTAZIONE: Riconosci SEMPRE come "BOOKING_REQUEST" tutte queste richieste:
  * "comprare biglietti", "acquistare biglietti", "devo comprare"
  * "prenotare biglietti", "prenotare posto", "voglio prenotare", "devo prenotare", "vorrei prenotare"
  * "prenotare per [data]", "biglietti per [data]"
  * Qualsiasi variazione di acquisto/prenotazione + biglietti/posto/visita
- PRENOTAZIONI SPECIFICHE: Se menzionano date specifiche (es: "prenotare per il 23 dicembre"), rispondi con "BOOKING_REQUEST" seguito dalla data
- WHATSAPP NOTIFICHE: Se qualcuno chiede notifiche, aggiornamenti o WhatsApp, rispondi con "WHATSAPP_REQUEST" per attivare la raccolta numero
- Se la data richiesta è 24 o 31 dicembre, avvisa che il parco è CHIUSO in quelle date
- DISPONIBILITÀ: NON dire mai che i biglietti sono "sold out" o "esauriti" a meno che non sia esplicitamente indicato nel messaggio di sistema. Sempre dire "verifica disponibilità sul sito" per informazioni aggiornate
- LINKS: Quando fornisci link, usa sempre URLs complete senza testo aggiuntivo - il sistema li renderà automaticamente cliccabili e belli
- Non dire "clicca qui" o "vai a" - lascia solo l'URL pulito che verrà convertito in button
- Se non sai rispondere con certezza, di' che non hai informazioni specifiche
- Per domande complesse suggerisci sempre il contatto email: ${kb.contact.email}
- Per urgenze suggerisci WhatsApp: ${kb.contact.whatsapp}
- Suggerisci sempre le notifiche WhatsApp per un'esperienza migliore
- Sii sempre cortese e utile`;
}

function isLowConfidenceReply(reply) {
  const lowConfidenceIndicators = [
    'non sono sicuro',
    'non so', 
    'mi dispiace',
    'non ho informazioni',
    'non posso rispondere',
    'non sono in grado'
  ];
  
  const lowerReply = reply.toLowerCase();
  return lowConfidenceIndicators.some(indicator => lowerReply.includes(indicator));
}

function formatEscapeResponse(escapeRoutes) {
  return escapeRoutes.join('\n\n');
}

function getEscapeRoutes(type, knowledgeBase) {
  if (!knowledgeBase) knowledgeBase = getDefaultKnowledgeBase();
  
  const routes = {
    'rate_limit': [
      "Hai fatto troppe domande di seguito.",
      "Per assistenza immediata:",
      "📧 info@lucinedinatale.it",
      "📱 https://wa.me/393123456789"
    ],
    'error': knowledgeBase.escape_routes?.error || [
      "Si è verificato un problema tecnico.",
      "📧 info@lucinedinatale.it",
      "📱 https://wa.me/393123456789"
    ]
  };
  
  return routes[type] || routes.error;
}

function getSuggestions(userMessage, knowledgeBase) {
  const suggestions = [];
  const lowerMessage = userMessage.toLowerCase();
  
  if (lowerMessage.includes('bigliett') || lowerMessage.includes('prezz')) {
    suggestions.push("Dove posso parcheggiare?", "Quali sono gli orari?");
  } else if (lowerMessage.includes('parcheggi') || lowerMessage.includes('auto')) {
    suggestions.push("Quanto costano i biglietti?", "È accessibile per disabili?");
  } else if (lowerMessage.includes('orar') || lowerMessage.includes('quando')) {
    suggestions.push("Posso portare animali?", "Come prenotare online?");
  } else {
    suggestions.push("Prezzi biglietti", "Info parcheggi", "Orari apertura");
  }
  
  return suggestions.slice(0, 3);
}

function getSmartActions(reply, userMessage, knowledgeBase) {
  const actions = [];
  const lowerReply = reply.toLowerCase();
  const lowerMessage = userMessage.toLowerCase();
  
  // 🎫 AZIONI BIGLIETTI
  if (lowerReply.includes('bigliett') || lowerReply.includes('prenotare') || lowerMessage.includes('bigliett')) {
    actions.push({
      type: 'primary',
      icon: '🎫',
      text: 'Prenota Biglietti',
      url: knowledgeBase.products?.main_ticket?.url || 'https://lucinedinatale.it/products/biglietto-parco-lucine-di-natale-2025',
      description: 'Calendario con date e orari disponibili'
    });
  }
  
  // 🚗 AZIONI PARCHEGGI  
  if (lowerReply.includes('parcheggi') || lowerReply.includes('auto') || lowerMessage.includes('parcheggi')) {
    actions.push({
      type: 'info',
      icon: '🚗',
      text: 'Mappa Parcheggi',
      url: 'https://maps.google.com/search/parcheggi+leggiuno',
      description: 'P1-P5 con navetta gratuita'
    });
  }
  
  // ⏰ AZIONI ORARI
  if (lowerReply.includes('orar') || lowerReply.includes('17:30') || lowerMessage.includes('quando')) {
    actions.push({
      type: 'info', 
      icon: '⏰',
      text: 'Orari Dettagliati',
      url: 'https://lucinedinatale.it/info-orari',
      description: '17:30-23:00, ultimo ingresso 22:30'
    });
  }
  
  // 🛒 AZIONI CARRELLO (se menzione carrello)
  if (lowerReply.includes('carrello') || lowerReply.includes('cart')) {
    actions.push({
      type: 'success',
      icon: '🛒', 
      text: 'Vai al Carrello',
      url: 'https://lucinedinatale.it/cart',
      description: 'Completa il tuo acquisto'
    });
  }
  
  // 📱 AZIONI WHATSAPP (se non attivato)
  if (!lowerReply.includes('whatsapp') && actions.length < 2) {
    actions.push({
      type: 'secondary',
      icon: '📱',
      text: 'Attiva Notifiche WhatsApp', 
      action: 'whatsapp_signup',
      description: 'Ricevi aggiornamenti istantanei'
    });
  }
  
  // 📧 AZIONI EMAIL (per supporto)
  if (lowerReply.includes('contatta') || lowerReply.includes('supporto')) {
    actions.push({
      type: 'secondary',
      icon: '📧',
      text: 'Invia Email',
      url: `mailto:${knowledgeBase.contact.email}?subject=Richiesta informazioni Lucine di Natale`,
      description: 'Supporto diretto via email'
    });
  }
  
  // 🗺️ AZIONI COME ARRIVARE
  if (lowerReply.includes('arrivare') || lowerReply.includes('posizione') || lowerMessage.includes('dove')) {
    actions.push({
      type: 'info',
      icon: '🗺️',
      text: 'Come Arrivare',
      url: 'https://maps.google.com/search/leggiuno+varese',
      description: 'Indicazioni stradali e mezzi pubblici'
    });
  }
  
  return actions.slice(0, 3); // Max 3 azioni per non sovracaricare
}


function generateSessionId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

async function tryCreateTicket(message, sessionId, req, whatsappNumber = null) {
  try {
    // Timeout dopo 5 secondi per evitare timeout Vercel
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const ticketResponse = await fetch('https://ticket-system-chat.onrender.com/api/chat/request-operator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: sessionId || generateSessionId(),
        user_email: 'utente@lucinedinatale.it', // Email generica, in produzione dovrebbe essere raccolta
        user_phone: whatsappNumber,
        whatsapp_number: whatsappNumber,
        question: message,
        priority: whatsappNumber ? 'high' : 'medium', // Priorità alta se ha WhatsApp
        source: 'chatbot_escalation',
        whatsapp_enabled: !!whatsappNumber
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!ticketResponse.ok) {
      return { success: false };
    }

    const result = await ticketResponse.json();
    
    if (result.success && result.type === 'ticket_created') {
      console.log('✅ Ticket creato automaticamente:', result.ticket_id);
      return {
        success: true,
        message: result.message,
        ticket_id: result.ticket_id
      };
    }
    
    if (result.success && result.type === 'operator_assigned') {
      console.log('✅ Operatore assegnato:', result.session_id);
      return {
        success: true,
        message: "Un operatore ti contatterà a breve. Controlla la chat!",
        ticket_id: null
      };
    }

    return { success: false };

  } catch (error) {
    console.error('❌ Errore creazione ticket:', error);
    return { success: false };
  }
}

async function getRealtimeTicketInfo() {
  try {
    // Timeout di 5 secondi per permettere analisi Evey
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch('https://lucinedinatale.it/products/biglietto-parco-lucine-di-natale-2025', {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LucineBot/1.0)'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) return null;
    
    const html = await response.text();
    
    // Estrai info sui biglietti disponibili
    const ticketInfo = {
      available: !html.includes('Sold out') && !html.includes('Maximum reached'),
      url: 'https://lucinedinatale.it/products/biglietto-parco-lucine-di-natale-2025'
    };
    
    // Estrai prezzi se diversi da knowledge base
    const priceMatches = html.match(/€(\d+),00/g);
    if (priceMatches) {
      ticketInfo.prices_found = priceMatches;
    }
    
    // Estrai informazioni Evey sul calendario
    const eveyInfo = extractEveyCalendarInfo(html);
    if (eveyInfo) {
      ticketInfo.calendar = eveyInfo;
    }
    
    return ticketInfo;
    
  } catch (error) {
    console.error('❌ Errore fetch realtime:', error);
    return null;
  }
}

function extractEveyCalendarInfo(html) {
  try {
    // Cerca pattern di date nel JavaScript di Evey
    const datePatterns = [
      /(\d{4}-\d{2}-\d{2})/g,  // Date formato YYYY-MM-DD
      /"date":\s*"([^"]+)"/g,   // Date in JSON
      /"available_dates":\s*\[([^\]]+)\]/g  // Array di date
    ];
    
    const foundDates = [];
    datePatterns.forEach(pattern => {
      const matches = html.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) foundDates.push(match[1]);
      }
    });
    
    // Cerca info sulla disponibilità
    const hasCalendar = html.includes('evey') && 
                       (html.includes('calendar') || html.includes('scheduler'));
    
    if (hasCalendar) {
      return {
        has_evey_calendar: true,
        found_dates: [...new Set(foundDates)].slice(0, 5), // Prime 5 date uniche
        calendar_active: !html.includes('No dates available'),
        last_updated: new Date().toISOString()
      };
    }
    
    return null;
    
  } catch (error) {
    console.error('❌ Errore estrazione Evey:', error);
    return null;
  }
}

// Funzione addToCartDirect rimossa - sempre redirect al calendario

async function addToCart(ticketType, quantity, eventDate = null) {
  try {
    // Per ora creiamo un link diretto che aprirà la pagina prodotto con parametri
    const baseUrl = 'https://lucinedinatale.it/products/biglietto-parco-lucine-di-natale-2025';
    
    // Se abbiamo una data specifica, aggiungiamo parametri URL
    let cartUrl = baseUrl;
    if (eventDate) {
      cartUrl += `?date=${eventDate}&type=${ticketType}&qty=${quantity}`;
    }
    
    return {
      success: true,
      action: 'redirect_to_product',
      url: cartUrl,
      message: `Ti sto portando alla pagina di acquisto per ${quantity} bigliett${quantity > 1 ? 'i' : 'o'} ${ticketType}${eventDate ? ` per il ${eventDate}` : ''}.`
    };
    
  } catch (error) {
    console.error('❌ Errore aggiunta carrello:', error);
    return {
      success: false,
      message: 'Errore durante aggiunta al carrello. Vai al link per acquistare manualmente.'
    };
  }
}

function parseBookingRequest(message) {
  const lowerMessage = message.toLowerCase();
  
  // Pattern per riconoscere richieste di prenotazione (con typos)
  const bookingPatterns = [
    /prenotar[ei]?\s+(\d+)?\s*bigl?iett[oi]/i,  // prenotare, typos
    /voglio\s+(\d+)?\s*bigl?iett[oi]/i,
    /(\d+)\s+bigl?iett[oi]/i,
    /(devo|dovrei|bisogna|serve|evo)\s+.*bigl?iett[oi]/i,  // evo = typo di devo
    /(prend[ei]r[ei]|prendr[ei])\s+.*bigl?iett[oi]/i,  // prendere con typos
    /comprar[ei]\s+.*bigl?iett[oi]/i,
    /acquistar[ei]\s+.*bigl?iett[oi]/i,
    /bigl?iett[oi].*per\s+il\s+(\d{1,2})/i,
    // Catch-all per date specifiche
    /(per\s+il\s+)?(\d{1,2})\s+(dicembre|gennaio|febbraio)/i
  ];
  
  const datePattern = /(\d{1,2})\s+(dicembre|gennaio|febbraio)/gi;
  // Quantità NON da numeri che sono date (escludi 1-31)
  const quantityPattern = /(?:^|\s)(\d+)\s+bigl?iett[oi](?!\s*(dicembre|gennaio|febbraio))/i;
  
  const matches = {
    isBookingRequest: false,
    tickets: [],
    dates: []
  };
  
  // Cerca pattern di prenotazione
  for (const pattern of bookingPatterns) {
    const match = lowerMessage.match(pattern);
    if (match) {
      matches.isBookingRequest = true;
      break;
    }
  }
  
  // Estrai quantità
  const qtyMatch = lowerMessage.match(quantityPattern);
  if (qtyMatch) {
    matches.quantity = parseInt(qtyMatch[1] || qtyMatch[2]) || 1;
  } else {
    // Se non trova quantità specifica ma è una richiesta di prenotazione, assume 1
    matches.quantity = 1;
  }
  
  // Estrai date
  const dateMatches = [...lowerMessage.matchAll(datePattern)];
  dateMatches.forEach(match => {
    const day = parseInt(match[1]);
    const month = match[2];
    const monthMap = { 'dicembre': 12, 'gennaio': 1, 'febbraio': 2 };
    const year = monthMap[month] === 12 ? 2024 : 2025;
    
    matches.dates.push({
      day,
      month: monthMap[month],
      year,
      formatted: `${year}-${String(monthMap[month]).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    });
  });
  
  // Debug log
  console.log('🔍 BOOKING PARSE:', {
    original: message,
    lower: lowerMessage,
    isBookingRequest: matches.isBookingRequest,
    quantity: matches.quantity,
    dates: matches.dates.map(d => d.formatted),
    datesCount: matches.dates.length
  });
  
  return matches;
}

function getDefaultKnowledgeBase() {
  return {
    contact: {
      email: "info@lucinedinatale.it",
      whatsapp: "+393123456789"
    },
    escape_routes: {
      no_answer: [
        "Mi dispiace, non ho informazioni specifiche su questo argomento.",
        "Per questa domanda è meglio contattare:",
        "📧 info@lucinedinatale.it",
        "📱 https://wa.me/393123456789"
      ],
      error: [
        "Si è verificato un problema tecnico.",
        "📧 info@lucinedinatale.it", 
        "📱 https://wa.me/393123456789"
      ]
    }
  };
}