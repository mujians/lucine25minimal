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