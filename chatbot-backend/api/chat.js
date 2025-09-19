import OpenAI from "openai";
import { readFileSync } from 'fs';
import { join } from 'path';

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
    
    // Fetch info real-time se la domanda riguarda biglietti/acquisti/date
    let realtimeInfo = null;
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('bigliett') || lowerMessage.includes('acquist') || 
        lowerMessage.includes('comprar') || lowerMessage.includes('prezzo') ||
        lowerMessage.includes('disponib') || lowerMessage.includes('data') ||
        lowerMessage.includes('quando') || lowerMessage.includes('calendario') ||
        lowerMessage.includes('orari') || lowerMessage.includes('slot')) {
      realtimeInfo = await getRealtimeTicketInfo();
    }
    
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Context dinamico basato su knowledge base + info real-time
    const context = buildContextFromKnowledgeBase(knowledgeBase, realtimeInfo);

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
          // Per richieste singole con data specifica, prova aggiunta automatica
          if (bookingRequest.dates.length === 1 && bookingRequest.quantity && bookingRequest.quantity <= 4) {
            const targetDate = bookingRequest.dates[0];
            
            try {
              const cartResult = await addToCartDirect('intero', bookingRequest.quantity, targetDate.formatted);
              
              if (cartResult.success && cartResult.action === 'cart_added') {
                reply = `${cartResult.message}\n\n🛒 Vai al carrello per completare l'acquisto:\n👆 ${cartResult.cart_url}\n\n💡 Ricorda di selezionare l'orario preferito durante il checkout.`;
              }
            } catch (error) {
              console.error('❌ Fallback automatico:', error);
            }
          }
          
          // Se non è stata aggiunta automaticamente, usa calendario
          if (!reply.includes('Aggiunto al carrello')) {
            const datesList = bookingRequest.dates.map(d => 
              `${d.day} ${d.month === 12 ? 'dicembre' : 'gennaio'}`
            ).join(' e ');
            
            reply = `🎫 Per prenotare ${bookingRequest.quantity || ''} biglietti per il ${datesList}, usa il calendario interattivo:\n\n👆 ${knowledgeBase.products?.main_ticket?.url}\n\n📅 Seleziona data e orario\n🎟️ Scegli tipo biglietto\n🛒 Aggiungi al carrello`;
          }
        }
      } else {
        // Richiesta di prenotazione senza date specifiche
        reply = `🎫 Per prenotare biglietti, usa il calendario interattivo:\n\n👆 ${knowledgeBase.products?.main_ticket?.url}\n\n📅 Seleziona data e orario\n🎟️ Scegli tipo biglietto\n🛒 Aggiungi al carrello`;
      }
    }
    
    // Controlla se la risposta è troppo generica o indica incertezza
    if (!reply || isLowConfidenceReply(reply)) {
      // Prova escalation automatica al sistema ticket
      const ticketResult = await tryCreateTicket(message, sessionId, req);
      
      if (ticketResult.success) {
        reply = `🎫 ${ticketResult.message}\n\nTicket ID: #${ticketResult.ticket_id}\n\n📧 Riceverai risposta via email entro 24h.`;
      } else {
        // Fallback al comportamento originale
        reply = formatEscapeResponse(knowledgeBase.escape_routes.no_answer);
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

    // Aggiungi suggerimenti se appropriato
    const suggestions = getSuggestions(message, knowledgeBase);

    return res.status(200).json({ 
      reply,
      suggestions,
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

function buildContextFromKnowledgeBase(kb, realtimeInfo = null) {
  const ticketUrl = kb.products?.main_ticket?.url || 'https://lucinedinatale.it/products/biglietto-parco-lucine-di-natale-2025';
  const availabilityText = realtimeInfo?.available === false ? 
    '\n⚠️ ATTENZIONE: Biglietti attualmente SOLD OUT sul sito' : 
    '\n✅ Acquista online per posto garantito';

  // Info calendario Evey se disponibili
  let calendarInfo = '';
  if (realtimeInfo?.calendar?.has_evey_calendar) {
    calendarInfo = '\n\n📅 CALENDARIO DISPONIBILITÀ:';
    if (realtimeInfo.calendar.calendar_active) {
      calendarInfo += '\n- Sistema di prenotazione attivo con calendario';
      calendarInfo += '\n- Seleziona data e ora direttamente sul sito';
      if (realtimeInfo.calendar.found_dates?.length > 0) {
        calendarInfo += `\n- Alcune date rilevate: ${realtimeInfo.calendar.found_dates.join(', ')}`;
      }
    } else {
      calendarInfo += '\n- ⚠️ Calendario momentaneamente non disponibile';
    }
    calendarInfo += '\n- Per date specifiche visita il link acquisto biglietti';
  }

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
🎫 ACQUISTA: ${ticketUrl}${availabilityText}${calendarInfo}

PARCHEGGI: P1-P5, navetta gratuita ${kb.parking.shuttle.hours} ${kb.parking.shuttle.frequency}

SERVIZI:
- ${kb.services.accessibility.description}
- ${kb.services.pets.description}
- Mercatini e stand gastronomici

REGOLE IMPORTANTI:
- Se qualcuno chiede date disponibili o calendario, menziona che il sistema di prenotazione ha un calendario interattivo
- Se qualcuno chiede di acquistare biglietti, fornisci sempre il link: ${ticketUrl}
- Per date/orari specifici rimanda sempre al calendario sul sito di acquisto
- PRENOTAZIONI SPECIFICHE: Se qualcuno vuole biglietti per date specifiche (es: "biglietti per il 23 dicembre"), rispondi con "BOOKING_REQUEST" seguito dalla data
- Se la data richiesta è 24 o 31 dicembre, avvisa che il parco è CHIUSO in quelle date
- Se non sai rispondere con certezza, di' che non hai informazioni specifiche
- Per domande complesse suggerisci sempre il contatto email: ${kb.contact.email}
- Per urgenze suggerisci WhatsApp: ${kb.contact.whatsapp}
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


function generateSessionId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

async function tryCreateTicket(message, sessionId, req) {
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
        user_phone: null,
        question: message,
        priority: 'medium',
        source: 'chatbot_escalation'
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

async function addToCartDirect(ticketType, quantity, eventDate, eventTime = '18:00') {
  try {
    // Mappa tipi biglietti a variant IDs
    const variantMap = {
      'intero': '51699961233747',
      'ridotto': '51700035944787', 
      'saltafila': '51700063207763',
      'open': '10082871050579'
    };
    
    const variantId = variantMap[ticketType.toLowerCase()] || variantMap['intero'];
    
    // Genera event ID simulato (formato simile a Evey)
    const eventId = `chatbot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Formatta data per display
    const dateObj = new Date(eventDate);
    const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
                       'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    const eventLabel = `${dateObj.getDate()} ${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()} - ${eventTime}`;
    
    // Prepara dati form per Shopify Cart API
    const formData = new FormData();
    formData.append('id', variantId);
    formData.append('quantity', quantity.toString());
    formData.append('properties[_event_id]', eventId);
    formData.append('properties[Event]', eventLabel);
    formData.append('properties[Source]', 'Chatbot Lucy');
    
    // Timeout di 5 secondi
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch('https://lucinedinatale.it/cart/add.js', {
      method: 'POST',
      body: formData,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; LucyChatbot/1.0)'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const result = await response.json();
      return {
        success: true,
        action: 'cart_added',
        cart_url: 'https://lucinedinatale.it/cart',
        message: `✅ Aggiunto al carrello: ${quantity} bigliett${quantity > 1 ? 'i' : 'o'} ${ticketType} per ${eventLabel}`,
        cart_data: result
      };
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
    
  } catch (error) {
    console.error('❌ Errore aggiunta carrello diretta:', error);
    
    // Fallback al metodo originale
    const baseUrl = 'https://lucinedinatale.it/products/biglietto-parco-lucine-di-natale-2025';
    return {
      success: false,
      action: 'redirect_to_product',
      url: baseUrl,
      message: `⚠️ Aggiunta automatica fallita. Vai al link per prenotare manualmente ${quantity} bigliett${quantity > 1 ? 'i' : 'o'} ${ticketType} per ${eventDate}.`
    };
  }
}

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