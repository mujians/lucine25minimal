import OpenAI from "openai";
import { readFileSync } from 'fs';
import { join } from 'path';
import { getSessionData, setSessionData, clearSessionData } from '../utils/session-store.js';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-ID');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET endpoint per gestire handover operatore e dashboard
  if (req.method === 'GET') {
    const { action, sessionId } = req.query;
    
    if (action === 'operator_take' && sessionId) {
      return await handleOperatorTake(sessionId, req, res);
    }
    
    if (action === 'pending_sessions') {
      return await getPendingSessionsFromChat(req, res);
    }
    
    if (action === 'session_info' && sessionId) {
      return await getSessionInfo(sessionId, req, res);
    }
    
    return res.status(400).json({ error: 'Invalid GET action' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🚀 Starting minimal chat API');
    
    const { message, sessionId } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Messaggio richiesto." });
    }
    
    console.log('📝 Received message:', message);
    
    // 🔴 CHECK: Se sessione è in chat live con operatore
    const sessionData = getSessionData(sessionId);
    console.log(`🔍 Session data for ${sessionId}:`, sessionData);
    
    // Se è in chat live con operatore, gestisci diversamente
    if (sessionData && sessionData.mode === 'live_chat_active') {
      console.log(`💬 Utente in chat live: ${message}`);
      
      // Salva messaggio utente nel session store per l'operatore
      const userMessage = {
        id: Date.now(),
        sender: 'user',
        message: message,
        timestamp: new Date().toISOString()
      };
      
      const currentMessages = sessionData.chat_messages || [];
      currentMessages.push(userMessage);
      
      setSessionData(sessionId, { 
        ...sessionData,
        chat_messages: currentMessages,
        last_user_message: Date.now()
      });
      
      // Versione semplificata - per ora solo conferma messaggio ricevuto
      console.log(`💬 Messaggio salvato per operatore ${sessionData.operator_name}`);
      
      return res.status(200).json({
        reply: `💬 **Messaggio inviato all'operatore ${sessionData.operator_name}.**\n\n⏳ L'operatore sta scrivendo la risposta...\n\n*Rimani in attesa, risponderà a breve.*\n\n---\n🔴 **Chat Live Attiva**`,
        sessionId,
        timestamp: new Date().toISOString(),
        status: 'waiting_operator_response',
        operatorConnected: true,
        operator: {
          id: sessionData.operator_id,
          name: sessionData.operator_name
        }
      });
    }
    
    // Check if OpenAI is available
    if (!process.env.OPENAI_API_KEY) {
      const fallbackReply = `Ciao! 👋 Benvenuto alle Lucine di Natale!\n\nHai scritto: "${message}"\n\n🎄 Siamo operativi dal 5 dicembre 2024 al 6 gennaio 2025\n⏰ Orario: 17:30 - 22:00\n🎫 Biglietti disponibili su lucinedinatale.it\n\nCome posso aiutarti?`;
      
      return res.status(200).json({
        reply: fallbackReply,
        sessionId: sessionId || 'test-' + Date.now(),
        timestamp: new Date().toISOString(),
        status: 'fallback'
      });
    }
    
    // OpenAI call
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Carica knowledge base per informazioni dettagliate
    const knowledgeBase = await loadKnowledgeBase();
    
    const context = `Sei l'assistente ufficiale di lucinedinatale.it.
Il tuo compito è rispondere ai visitatori in italiano in modo cordiale, conciso e sempre con il formato JSON indicato.

Usa SOLO le informazioni dalla knowledge base caricata per rispondere su date, orari, prezzi, servizi e location.

**REGOLA FONDAMENTALE:**
Se non hai l'informazione nella knowledge base → SEMPRE escalation a operatore
- actions: ["richiesta_operatore"]
- escalation: "operator"

=== AZIONI DISPONIBILI ===
- biglietti_acquisto → Link diretto per l'acquisto biglietti
- richiesta_operatore → Escalation a operatore umano (chat diretta)
- crea_ticket_email → Ticket con ricontatto via email
- crea_ticket_whatsapp → Ticket con ricontatto via WhatsApp
- info_parcheggi → Dettagli su parcheggi e navette
- info_orari → Orari di apertura e chiusura
- info_location → Come arrivare e mappa
- info_prezzi → Informazioni prezzi biglietti

=== ISTRUZIONI CRITICHE ===
1. **Formato obbligatorio**: ogni risposta deve essere in JSON, con questa struttura:
{
  "reply": "Risposta testuale breve e cordiale",
  "actions": ["azione1", "azione2"],
  "escalation": "none|operator|ticket"
}

2. **Escalation a operatore**
   Se l'utente chiede esplicitamente o implicitamente di parlare con una persona (es. "operatore", "assistenza", "aiuto", "supporto umano", "voglio parlare con qualcuno") →
   Rispondi sempre con:
   - actions: ["richiesta_operatore"]
   - escalation: "operator"

3. **Domande semplici e dirette** → rispondi con le azioni più pertinenti (anche multiple).
   - Prezzi o costo biglietti → ["info_prezzi", "biglietti_acquisto"]
   - Dove arrivare / mappa → ["info_location", "info_parcheggi"]
   - Orari → ["info_orari"]
   - Parcheggio / navetta → ["info_parcheggi"]
   - Acquisto biglietti → ["biglietti_acquisto"]

4. **Se non sai rispondere con la knowledge base → escalation**:
   - actions: ["richiesta_operatore"]
   - escalation: "operator"

5. **MAI contatti diretti**: non dare mai email/telefono/link esterni.
   Solo azioni dalla lista disponibile.

6. **Risposte sempre in italiano**: tono amichevole, chiaro, sintetico.`;

    const resp = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: context },
        { role: "user", content: message }
      ],
      max_tokens: 200,
      temperature: 0.3
    });

    const aiResponse = resp?.choices?.[0]?.message?.content?.trim();
    
    if (!aiResponse) {
      return res.status(500).json({
        error: "Errore nella risposta AI",
        timestamp: new Date().toISOString()
      });
    }
    
    // 🧠 Parse della risposta JSON intelligente di ChatGPT
    let parsedResponse;
    try {
      // Tenta di estrarre JSON se è dentro testo
      let jsonString = aiResponse;
      const jsonStart = aiResponse.indexOf('{');
      const jsonEnd = aiResponse.lastIndexOf('}') + 1;
      
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        jsonString = aiResponse.substring(jsonStart, jsonEnd);
      }
      
      parsedResponse = JSON.parse(jsonString);
      console.log('✅ Parsed AI response:', parsedResponse);
      
    } catch (error) {
      console.error('❌ Errore parsing JSON AI:', error);
      console.log('📝 Raw AI response:', aiResponse);
      
      // Fallback intelligente: analizza il testo per capire l'intent
      const lowerResponse = aiResponse.toLowerCase();
      let actions = [];
      let escalation = 'none';
      
      if (lowerResponse.includes('operatore') || lowerResponse.includes('contatto')) {
        actions = ['richiesta_operatore'];
        escalation = 'operator';
      } else if (lowerResponse.includes('bigliett') || lowerResponse.includes('acquist')) {
        actions = ['biglietti_acquisto'];
      } else if (lowerResponse.includes('prezzo') || lowerResponse.includes('costo')) {
        actions = ['info_prezzi', 'biglietti_acquisto'];
      }
      
      parsedResponse = {
        reply: aiResponse,
        actions,
        escalation
      };
    }
    
    const { reply, actions = [], escalation = 'none' } = parsedResponse;
    
    // 🎯 Gestione escalation intelligente
    if (escalation === 'operator' || actions.includes('richiesta_operatore')) {
      if (!sessionData.supportStep) {
        // Primo step: chiedi se vuole aiuto operatore
        setSessionData(sessionId, { 
          supportStep: 'requested', 
          originalQuestion: message,
          timestamp: Date.now()
        });
        
        return res.status(200).json({
          reply: `🤔 **La tua domanda richiede supporto personalizzato.**\n\n💬 **Come preferisci essere assistito?**`,
          sessionId: sessionId || 'test-' + Date.now(),
          timestamp: new Date().toISOString(),
          status: 'operator_request',
          smartActions: [
            {
              type: 'operator',
              icon: '👨‍💼',
              text: 'Contatta Operatore',
              action: 'request_operator',
              description: 'Chat live con operatore disponibile'
            },
            {
              type: 'email',
              icon: '📧',
              text: 'Invia Email',
              url: 'mailto:info@lucinedinatale.it?subject=Domanda Lucine di Natale&body=Ciao, ho una domanda riguardo...',
              description: 'Supporto via email'
            },
            {
              type: 'whatsapp',
              icon: '📱',
              text: 'Apri Chat WhatsApp',
              url: 'https://wa.me/393331234567?text=Ciao! Ho una domanda sulle Lucine di Natale...',
              description: 'Chat diretta WhatsApp'
            }
          ]
        });
      }
    }
    
    // Gestisci risposta alla richiesta operatore
    if (sessionData.supportStep === 'requested') {
      const userConfirms = (
        message.toLowerCase().includes('sì') ||
        message.toLowerCase().includes('si') ||
        message.toLowerCase().includes('yes') ||
        message.toLowerCase().includes('ok') ||
        message.toLowerCase().includes('operatore') ||
        message.toLowerCase().includes('contatta') ||
        message === 'request_operator' // Smart action
      );
      
      if (userConfirms) {
        // Check operatori disponibili
        const operatorAvailable = await checkOperatorAvailability();
        
        if (operatorAvailable) {
          // Avvia chat live
          return await initiateLiveChat(sessionId, sessionData.originalQuestion, res);
        } else {
          // Nessun operatore → Ticket
          setSessionData(sessionId, { supportStep: 'contact_request' });
          
          return res.status(200).json({
            reply: `⏰ **Al momento non ci sono operatori disponibili.**\n\n📝 **Vuoi aprire un ticket di supporto?**\n\nTi risponderemo entro 24h.\n\n💬 **Fornisci il tuo contatto:**`,
            sessionId,
            timestamp: new Date().toISOString(),
            status: 'ticket_request',
            smartActions: [
              {
                type: 'ticket_email',
                icon: '📧',
                text: 'Email Support',
                description: 'Fornisci la tua email per ricevere risposta'
              },
              {
                type: 'ticket_whatsapp',
                icon: '📱',
                text: 'WhatsApp Support',
                description: 'Fornisci il tuo numero WhatsApp'
              }
            ]
          });
        }
      } else {
        // Reset supportStep se rifiuta
        clearSessionData(sessionId);
      }
    }
    
    // 📝 Gestisci raccolta dati per ticket
    if (sessionData.supportStep === 'contact_request') {
      const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
      const phonePattern = /(\+39\s?)?(\d{3}\s?\d{3}\s?\d{4}|\d{10})/;
      
      const emailMatch = message.match(emailPattern);
      const phoneMatch = message.match(phonePattern);
      
      if (emailMatch) {
        const email = emailMatch[0];
        const ticketResult = await createTicketWithContact(sessionId, sessionData.originalQuestion, 'email', email);
        
        return res.status(200).json({
          reply: `✅ **Ticket creato con successo!**\n\n📧 **Email:** ${email}\n🎫 **ID Ticket:** ${ticketResult.ticket_id || 'Generato'}\n\n📩 Riceverai una risposta entro 24h via email.\n\n🔍 *Il team supporto analizzerà la tua richiesta e ti contatterà presto.*`,
          sessionId,
          timestamp: new Date().toISOString(),
          status: 'ticket_created',
          ticketInfo: ticketResult
        });
        
      } else if (phoneMatch) {
        const phone = phoneMatch[0].replace(/\s/g, '');
        const formattedPhone = phone.startsWith('+39') ? phone : '+39' + phone;
        const ticketResult = await createTicketWithContact(sessionId, sessionData.originalQuestion, 'whatsapp', formattedPhone);
        
        return res.status(200).json({
          reply: `✅ **Ticket creato con successo!**\n\n📱 **WhatsApp:** ${formattedPhone}\n🎫 **ID Ticket:** ${ticketResult.ticket_id || 'Generato'}\n\n💬 Riceverai una risposta entro 24h su WhatsApp.\n\n🔍 *Il team supporto analizzerà la tua richiesta e ti contatterà presto.*`,
          sessionId,
          timestamp: new Date().toISOString(),
          status: 'ticket_created',
          ticketInfo: ticketResult
        });
        
      } else {
        return res.status(200).json({
          reply: `❌ **Formato non valido.**\n\n📧 **Per email:** Scrivi un indirizzo valido (es: mario@gmail.com)\n📱 **Per WhatsApp:** Scrivi un numero valido (es: +39 333 123 4567)\n\n💡 *Riprova con il formato corretto.*`,
          sessionId,
          timestamp: new Date().toISOString(),
          status: 'contact_format_error'
        });
      }
    }
    
    // 🎨 Converti azioni AI in smart actions per frontend
    const smartActions = generateSmartActions(actions, reply);
    
    return res.status(200).json({
      reply,
      sessionId: sessionId || 'test-' + Date.now(),
      timestamp: new Date().toISOString(),
      status: 'success',
      smartActions,
      aiActions: actions,
      escalation
    });
    
  } catch (err) {
    console.error("Minimal Chat API Error:", err);
    return res.status(500).json({ 
      error: "Errore temporaneo del servizio",
      timestamp: new Date().toISOString()
    });
  }
}

// 🎯 Gestisce presa in carico da parte dell'operatore
async function handleOperatorTake(sessionId, req, res) {
  try {
    const sessionData = getSessionData(sessionId);
    
    if (!sessionData || sessionData.mode !== 'live_chat_pending') {
      return res.status(404).json({
        success: false,
        error: 'Session not found or not in pending state'
      });
    }
    
    // Simula operatore che prende la chat
    setSessionData(sessionId, {
      ...sessionData,
      mode: 'live_chat_active',
      operator_id: 'op_001',
      operator_name: 'Mario',
      chat_start_time: Date.now(),
      operator_messages: [],
      chat_messages: []
    });
    
    console.log(`✅ Operatore Mario ha preso la sessione: ${sessionId}`);
    
    return res.status(200).json({
      success: true,
      message: 'Chat taken by operator',
      sessionId: sessionId,
      operator: {
        id: 'op_001',
        name: 'Mario'
      }
    });
    
  } catch (error) {
    console.error('❌ Errore operator take:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to take chat'
    });
  }
}

// 👨‍💼 Controlla disponibilità operatori
async function checkOperatorAvailability() {
  try {
    console.log('👨‍💼 Checking operator availability...');
    
    // Controlla operatori online dalla API operators
    const response = await fetch('https://chatbot-backend-3h4uzkand-brunos-projects-075c84f2.vercel.app/api/operators?action=status');
    
    if (response.ok) {
      const data = await response.json();
      const onlineOperators = data.online_operators || 0;
      console.log(`👨‍💼 Operatori online: ${onlineOperators}`);
      return onlineOperators > 0;
    } else {
      console.error('❌ Errore API operatori:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Errore check operatori:', error);
    return false;
  }
}

// 🔄 Avvia handover chat live
async function initiateLiveChat(sessionId, originalQuestion, res) {
  try {
    console.log('🔴 Avviando handover chat live per sessione:', sessionId);
    
    // Imposta stato sessione per handover
    setSessionData(sessionId, {
      mode: 'live_chat_pending',
      originalQuestion: originalQuestion,
      handover_time: Date.now(),
      waiting_for_operator: true
    });
    
    return res.status(200).json({
      reply: `🔄 **Connessione all'operatore in corso...**\n\n❓ **La tua domanda:** "${originalQuestion}"\n\n⏳ Sto cercando un operatore disponibile.\n💬 Tra poco sarai in chat live!\n\n*L'operatore vedrà la tua domanda e potrà risponderti direttamente.*`,
      sessionId,
      timestamp: new Date().toISOString(),
      status: 'connecting_operator',
      operatorPending: true
    });
    
  } catch (error) {
    console.error('❌ Errore chat live:', error);
    
    // Fallback a ticket
    setSessionData(sessionId, { supportStep: 'contact_request' });
    
    return res.status(200).json({
      reply: `⚠️ **Errore connessione operatore.**\n\nPassiamo al ticket di supporto.\n\n📧 **Invia la tua email** per ricevere assistenza.`,
      sessionId,
      timestamp: new Date().toISOString(),
      status: 'fallback_ticket'
    });
  }
}

// 🎨 Genera smart actions dal set di azioni AI
function generateSmartActions(aiActions, reply) {
  const actionMap = {
    biglietti_acquisto: {
      type: 'link',
      icon: '🎫',
      text: 'Acquista Biglietti',
      url: 'https://lucinedinatale.it/products/biglietto-parco-lucine-di-natale-2025',
      description: 'Vai al sito per acquistare'
    },
    richiesta_operatore: {
      type: 'operator',
      icon: '👨‍💼',
      text: 'Contatta Operatore',
      action: 'request_operator',
      description: 'Chat live con operatore'
    },
    crea_ticket_email: {
      type: 'ticket_email',
      icon: '📧',
      text: 'Ticket via Email',
      description: 'Supporto con ricontatto email'
    },
    crea_ticket_whatsapp: {
      type: 'ticket_whatsapp',
      icon: '📱',
      text: 'Ticket via WhatsApp',
      description: 'Supporto con ricontatto WhatsApp'
    },
    info_parcheggi: {
      type: 'info',
      icon: '🚗',
      text: 'Info Parcheggi',
      url: 'https://lucinedinatale.it/info-parcheggi',
      description: 'P1-P5, navetta gratuita'
    },
    info_orari: {
      type: 'info',
      icon: '⏰',
      text: 'Orari Evento',
      description: '17:30-22:00, chiuso 24/12 e 31/12'
    },
    info_location: {
      type: 'link',
      icon: '📍',
      text: 'Come Arrivare',
      url: 'https://maps.google.com/?q=Lucine+di+Natale+Leggiuno',
      description: 'Mappa e indicazioni'
    },
    info_prezzi: {
      type: 'link',
      icon: '💰',
      text: 'Info Prezzi',
      url: 'https://lucinedinatale.it/products/biglietto-parco-lucine-di-natale-2025',
      description: 'Consulta prezzi aggiornati'
    }
  };
  
  const smartActions = [];
  
  // Converti azioni AI in smart actions
  aiActions.forEach(action => {
    if (actionMap[action]) {
      smartActions.push(actionMap[action]);
    }
  });
  
  // Limita a massimo 3 azioni
  return smartActions.slice(0, 3);
}

// 🎫 Crea ticket con dati di contatto
async function createTicketWithContact(sessionId, originalQuestion, contactMethod, contactInfo) {
  try {
    const ticketData = {
      session_id: sessionId,
      user_email: contactMethod === 'email' ? contactInfo : 'non-fornita@example.com',
      user_phone: contactMethod === 'whatsapp' ? contactInfo : null,
      whatsapp_number: contactMethod === 'whatsapp' ? contactInfo : null,
      question: originalQuestion,
      priority: 'medium',
      source: 'chatbot_no_operator',
      whatsapp_enabled: contactMethod === 'whatsapp',
      contact_method: contactMethod,
      contact_info: contactInfo,
      status: 'open'
    };
    
    console.log('🎫 Creating ticket with data:', ticketData);
    
    // Timeout di 8 secondi per evitare timeout Vercel
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch('https://ticket-system-chat.onrender.com/api/tickets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'LucineChatbot/1.0'
      },
      body: JSON.stringify(ticketData),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Ticket created successfully:', result);
      
      // Clear session dopo creazione ticket
      clearSessionData(sessionId);
      
      return { 
        success: true, 
        ticket_id: result.ticket_id || result.id,
        ticket_data: result
      };
    } else {
      const errorText = await response.text();
      console.error('❌ Ticket creation failed:', response.status, errorText);
      return { 
        success: false, 
        error: `API Error: ${response.status}`,
        ticket_id: 'ERROR-' + Date.now()
      };
    }
    
  } catch (error) {
    console.error('❌ Error creating ticket:', error);
    
    // Gestione timeout specifico
    if (error.name === 'AbortError') {
      console.log('⏰ Ticket system timeout - fallback to local ticket');
      return { 
        success: true, 
        error: 'timeout_fallback',
        ticket_id: 'LOCAL-' + Date.now()
      };
    }
    
    return { 
      success: false, 
      error: error.message,
      ticket_id: 'ERROR-' + Date.now()
    };
  }
}

// 📋 Ottieni sessioni pending dalla memoria di chat.js
async function getPendingSessionsFromChat(req, res) {
  try {
    console.log('📋 Getting pending sessions from chat memory...');
    
    // Importiamo session-store per accedere alle sessioni
    const { getAllSessions } = await import('../utils/session-store.js');
    const allSessions = getAllSessions();
    
    // Filtra solo le sessioni pending
    const pendingSessions = allSessions.filter(session => 
      session.mode === 'live_chat_pending' && session.waiting_for_operator
    ).map(session => ({
      sessionId: session.sessionId,
      originalQuestion: session.originalQuestion,
      handover_time: session.handover_time,
      timestamp: new Date(session.handover_time).toISOString()
    }));
    
    console.log(`📋 Found ${pendingSessions.length} pending sessions`);
    
    return res.status(200).json({
      success: true,
      pending_sessions: pendingSessions,
      total_pending: pendingSessions.length,
      source: 'chat_api_memory'
    });
    
  } catch (error) {
    console.error('❌ Error getting pending sessions:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get pending sessions',
      pending_sessions: [],
      total_pending: 0
    });
  }
}

// 📄 Ottieni info specifica sessione
async function getSessionInfo(sessionId, req, res) {
  try {
    const sessionData = getSessionData(sessionId);
    
    if (!sessionData) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      session: {
        sessionId,
        ...sessionData
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting session info:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get session info'
    });
  }
}

// 📚 Carica knowledge base dal JSON
async function loadKnowledgeBase() {
  try {
    const filePath = join(process.cwd(), 'data', 'knowledge-base.json');
    const data = readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Error loading knowledge base:', error);
    return {
      event: { name: "Lucine di Natale di Leggiuno" },
      contact: { email: "info@lucinedinatale.it" }
    };
  }
}