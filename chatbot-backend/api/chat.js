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
    
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Context dinamico basato su knowledge base
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

function buildContextFromKnowledgeBase(kb) {
  return `Sei l'assistente virtuale delle Lucine di Natale di Leggiuno. Rispondi sempre in italiano, in modo cordiale e preciso.

EVENTO: ${kb.event.name}
Date: ${kb.event.dates.start} - ${kb.event.dates.end} (chiuso ${kb.event.dates.closed.join(', ')})
Orari: ${kb.event.hours.open}-${kb.event.hours.close} (ultimo ingresso ${kb.event.hours.lastEntry})
Luogo: ${kb.event.location.city}, ${kb.event.location.area}

BIGLIETTI:
- Adulti: €${kb.tickets.prices.adult}
- Bambini (3-12): €${kb.tickets.prices.child}  
- Famiglia (2+2): €${kb.tickets.prices.family}
- Under 3: Gratis
- SALTAFILA: Accesso prioritario nella fascia oraria scelta
- OPEN: Ingresso libero + priorità sempre
- ${kb.tickets.discounts.online}

PARCHEGGI: P1-P5, navetta gratuita ${kb.parking.shuttle.hours} ${kb.parking.shuttle.frequency}

SERVIZI:
- ${kb.services.accessibility.description}
- ${kb.services.pets.description}
- Mercatini e stand gastronomici

REGOLE IMPORTANTI:
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
      })
    });

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