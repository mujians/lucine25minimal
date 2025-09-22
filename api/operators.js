// 👨‍💼 API GESTIONE OPERATORI
// Per sistema chat live + ticket ibrido

const operatorStore = new Map(); // In produzione: usare Redis o DB
const activeChatSessions = new Map(); // Chat attive con operatori

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method, query } = req;
  const { action } = query;

  try {
    switch (method) {
      case 'GET':
        if (action === 'status') {
          return await getOperatorAvailability(req, res);
        } else if (action === 'active_chats') {
          return await getActiveChats(req, res);
        } else if (action === 'my_status') {
          return await getMyStatus(req, res);
        } else if (action === 'chat_status') {
          return await getChatStatus(req, res);
        } else if (action === 'pending_sessions') {
          return await getPendingSessions(req, res);
        } else if (action === 'chat_messages') {
          return await getChatMessages(req, res);
        }
        break;

      case 'POST':
        if (action === 'set_status') {
          return await setOperatorStatus(req, res);
        } else if (action === 'take_chat') {
          return await takeChat(req, res);
        } else if (action === 'send_message') {
          return await sendOperatorMessage(req, res);
        } else if (action === 'save_user_message') {
          return await saveUserMessage(req, res);
        }
        break;

      case 'PUT':
        if (action === 'release_chat') {
          return await releaseChat(req, res);
        }
        break;

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error) {
    console.error('❌ Errore API operatori:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Verifica disponibilità operatori
async function getOperatorAvailability(req, res) {
  try {
    const activeOperators = Array.from(operatorStore.values())
      .filter(op => op.status === 'available' && op.lastSeen > Date.now() - 300000); // 5 min timeout

    const availableCount = activeOperators.length;
    const isAvailable = availableCount > 0;

    return res.status(200).json({
      success: true,
      available: isAvailable,
      operator_count: availableCount,
      operators: activeOperators.map(op => ({
        id: op.id,
        name: op.name,
        status: op.status,
        current_chats: op.current_chats || 0
      }))
    });

  } catch (error) {
    console.error('❌ Errore get availability:', error);
    return res.status(500).json({ error: 'Error checking availability' });
  }
}

// Ottieni chat attive
async function getActiveChats(req, res) {
  try {
    const activeChats = Array.from(activeChatSessions.entries()).map(([sessionId, chat]) => ({
      session_id: sessionId,
      operator_id: chat.operator_id,
      operator_name: chat.operator_name,
      started_at: chat.started_at,
      last_message: chat.last_message,
      user_question: chat.original_question,
      message_count: chat.messages ? chat.messages.length : 0
    }));

    return res.status(200).json({
      success: true,
      active_chats: activeChats,
      total_active: activeChats.length
    });

  } catch (error) {
    console.error('❌ Errore get active chats:', error);
    return res.status(500).json({ error: 'Error getting active chats' });
  }
}

// Ottieni stato operatore specifico
async function getMyStatus(req, res) {
  try {
    const operatorId = req.headers['x-operator-id'] || req.query.operator_id;
    
    if (!operatorId) {
      return res.status(400).json({ error: 'Operator ID required' });
    }

    const operator = operatorStore.get(operatorId);
    
    if (!operator) {
      return res.status(404).json({ error: 'Operator not found' });
    }

    // Ottieni chat assegnate a questo operatore
    const myChats = Array.from(activeChatSessions.entries())
      .filter(([_, chat]) => chat.operator_id === operatorId)
      .map(([sessionId, chat]) => ({
        session_id: sessionId,
        started_at: chat.started_at,
        last_message: chat.last_message,
        user_question: chat.original_question
      }));

    return res.status(200).json({
      success: true,
      operator: {
        id: operator.id,
        name: operator.name,
        status: operator.status,
        last_seen: operator.lastSeen,
        current_chats: myChats.length,
        my_chats: myChats
      }
    });

  } catch (error) {
    console.error('❌ Errore get my status:', error);
    return res.status(500).json({ error: 'Error getting operator status' });
  }
}

// Imposta stato operatore (attivo/non attivo)
async function setOperatorStatus(req, res) {
  try {
    const { operator_id, operator_name, status } = req.body;

    if (!operator_id || !status) {
      return res.status(400).json({ error: 'operator_id and status required' });
    }

    if (!['available', 'busy', 'offline'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Use: available, busy, offline' });
    }

    const operator = {
      id: operator_id,
      name: operator_name || operator_id,
      status: status,
      lastSeen: Date.now(),
      current_chats: 0
    };

    operatorStore.set(operator_id, operator);

    console.log(`👨‍💼 Operatore ${operator_name} (${operator_id}) → ${status}`);

    return res.status(200).json({
      success: true,
      message: `Status updated to ${status}`,
      operator: operator
    });

  } catch (error) {
    console.error('❌ Errore set status:', error);
    return res.status(500).json({ error: 'Error setting status' });
  }
}

// Operatore prende controllo di una chat
async function takeChat(req, res) {
  try {
    const { session_id, operator_id, operator_name } = req.body;

    if (!session_id || !operator_id) {
      return res.status(400).json({ error: 'session_id and operator_id required' });
    }

    // Verifica che l'operatore sia disponibile
    const operator = operatorStore.get(operator_id);
    if (!operator || operator.status !== 'available') {
      return res.status(400).json({ error: 'Operator not available' });
    }

    // Verifica che la sessione esista e non sia già presa
    if (activeChatSessions.has(session_id)) {
      return res.status(400).json({ error: 'Chat already taken by another operator' });
    }

    // Ottieni dati sessione se in attesa
    const { getSessionData, setSessionData } = await import('../utils/session-store.js');
    const sessionData = getSessionData(session_id);

    // Crea sessione chat live
    const chatSession = {
      session_id: session_id,
      operator_id: operator_id,
      operator_name: operator_name || operator_id,
      started_at: new Date().toISOString(),
      status: 'active',
      messages: [],
      last_message: Date.now(),
      original_question: sessionData.originalQuestion || null
    };

    // Aggiorna stato sessione in chat store
    setSessionData(session_id, {
      mode: 'live_chat_active',
      waiting_for_operator: false,
      operator_connected: true,
      operator_id: operator_id,
      operator_name: operator_name
    });

    activeChatSessions.set(session_id, chatSession);

    // Aggiorna contatore operatore
    operator.current_chats = (operator.current_chats || 0) + 1;
    operator.lastSeen = Date.now();
    operatorStore.set(operator_id, operator);

    // Log handover AI → Operatore su Google Sheets
    await logChatHandover(session_id, chatSession, operator_name);

    console.log(`🔴 Chat ${session_id} presa da operatore ${operator_name}`);

    return res.status(200).json({
      success: true,
      message: 'Chat taken successfully',
      chat_session: chatSession
    });

  } catch (error) {
    console.error('❌ Errore take chat:', error);
    return res.status(500).json({ error: 'Error taking chat' });
  }
}

// Operatore invia messaggio nella chat
async function sendOperatorMessage(req, res) {
  try {
    const { session_id, operator_id, message } = req.body;

    if (!session_id || !operator_id || !message) {
      return res.status(400).json({ error: 'session_id, operator_id and message required' });
    }

    const chatSession = activeChatSessions.get(session_id);
    if (!chatSession) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    if (chatSession.operator_id !== operator_id) {
      return res.status(403).json({ error: 'Not authorized for this chat' });
    }

    // Aggiungi messaggio alla chat
    const operatorMessage = {
      type: 'operator',
      operator_id: operator_id,
      operator_name: chatSession.operator_name,
      message: message,
      timestamp: new Date().toISOString(),
      message_id: Date.now().toString()
    };

    chatSession.messages.push(operatorMessage);
    chatSession.last_message = Date.now();

    // Aggiorna nella store
    activeChatSessions.set(session_id, chatSession);

    // Log immediato messaggio operatore su Google Sheets
    await logOperatorMessageImmediate(session_id, operatorMessage, chatSession);

    console.log(`💬 Operatore ${chatSession.operator_name}: ${message}`);

    return res.status(200).json({
      success: true,
      message: 'Message sent',
      operator_message: operatorMessage,
      chat_session: chatSession
    });

  } catch (error) {
    console.error('❌ Errore send message:', error);
    return res.status(500).json({ error: 'Error sending message' });
  }
}

// Operatore rilascia chat (termina sessione)
async function releaseChat(req, res) {
  try {
    const { session_id, operator_id, reason } = req.body;

    if (!session_id || !operator_id) {
      return res.status(400).json({ error: 'session_id and operator_id required' });
    }

    const chatSession = activeChatSessions.get(session_id);
    if (!chatSession) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    if (chatSession.operator_id !== operator_id) {
      return res.status(403).json({ error: 'Not authorized for this chat' });
    }

    // Salva conversazione completa su Google Sheets
    await saveCompleteConversationToSheets(chatSession, reason);
    
    // Crea ticket automatico per tracciabilità
    const ticketResult = await createTicketFromLiveChat(chatSession, reason);

    // Rimuovi chat attiva
    activeChatSessions.delete(session_id);

    // Aggiorna contatore operatore
    const operator = operatorStore.get(operator_id);
    if (operator) {
      operator.current_chats = Math.max(0, (operator.current_chats || 1) - 1);
      operator.lastSeen = Date.now();
      operatorStore.set(operator_id, operator);
    }

    console.log(`🟡 Chat ${session_id} rilasciata da operatore ${chatSession.operator_name}. Motivo: ${reason || 'completed'}`);

    return res.status(200).json({
      success: true,
      message: 'Chat released',
      reason: reason || 'completed',
      chat_session: {
        ...chatSession,
        ended_at: new Date().toISOString(),
        reason: reason
      }
    });

  } catch (error) {
    console.error('❌ Errore release chat:', error);
    return res.status(500).json({ error: 'Error releasing chat' });
  }
}

// Funzioni utility per il chatbot
export function isOperatorAvailable() {
  const activeOperators = Array.from(operatorStore.values())
    .filter(op => op.status === 'available' && op.lastSeen > Date.now() - 300000);
  return activeOperators.length > 0;
}

export function getChatSession(sessionId) {
  return activeChatSessions.get(sessionId);
}

export function isSessionWithOperator(sessionId) {
  return activeChatSessions.has(sessionId);
}

// Salva messaggio utente nella chat
async function saveUserMessage(req, res) {
  try {
    const { session_id, message, timestamp, type } = req.body;

    if (!session_id || !message) {
      return res.status(400).json({ error: 'session_id and message required' });
    }

    const chatSession = activeChatSessions.get(session_id);
    if (!chatSession) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    // Aggiungi messaggio utente alla chat
    const userMessage = {
      type: 'user',
      message: message,
      timestamp: timestamp || new Date().toISOString(),
      message_id: Date.now().toString()
    };

    chatSession.messages.push(userMessage);
    chatSession.last_message = Date.now();

    // Aggiorna nella store
    activeChatSessions.set(session_id, chatSession);

    // Log immediato messaggio utente su Google Sheets  
    await logUserMessageImmediate(session_id, userMessage, chatSession);

    console.log(`👤 Utente in chat ${session_id}: ${message}`);

    return res.status(200).json({
      success: true,
      message: 'User message saved',
      user_message: userMessage,
      chat_session: chatSession
    });

  } catch (error) {
    console.error('❌ Errore save user message:', error);
    return res.status(500).json({ error: 'Error saving user message' });
  }
}

// Ottieni sessioni in attesa di operatore
async function getPendingSessions(req, res) {
  try {
    const { getPendingSessions: getPendingSessionsData } = await import('../utils/session-store.js');
    const pendingSessions = getPendingSessionsData();

    return res.status(200).json({
      success: true,
      pending_sessions: pendingSessions,
      total_pending: pendingSessions.length
    });

  } catch (error) {
    console.error('❌ Errore get pending sessions:', error);
    return res.status(500).json({ error: 'Error getting pending sessions' });
  }
}

// Ottieni messaggi di una chat specifica
async function getChatMessages(req, res) {
  try {
    const sessionId = req.query.session_id;

    if (!sessionId) {
      return res.status(400).json({ error: 'session_id required' });
    }

    const chatSession = activeChatSessions.get(sessionId);

    if (!chatSession) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    return res.status(200).json({
      success: true,
      session_id: sessionId,
      messages: chatSession.messages || [],
      message_count: chatSession.messages ? chatSession.messages.length : 0,
      last_message: chatSession.last_message,
      original_question: chatSession.original_question
    });

  } catch (error) {
    console.error('❌ Errore get chat messages:', error);
    return res.status(500).json({ error: 'Error getting chat messages' });
  }
}

// Ottieni status di una chat specifica
async function getChatStatus(req, res) {
  try {
    const sessionId = req.query.session_id;

    if (!sessionId) {
      return res.status(400).json({ error: 'session_id required' });
    }

    const chatSession = activeChatSessions.get(sessionId);

    if (!chatSession) {
      return res.status(200).json({
        success: true,
        session_id: sessionId,
        taken_by_operator: false,
        status: 'not_active'
      });
    }

    return res.status(200).json({
      success: true,
      session_id: sessionId,
      taken_by_operator: true,
      status: chatSession.status,
      operator_id: chatSession.operator_id,
      operator_name: chatSession.operator_name,
      started_at: chatSession.started_at,
      message_count: chatSession.messages ? chatSession.messages.length : 0,
      last_message: chatSession.last_message
    });

  } catch (error) {
    console.error('❌ Errore get chat status:', error);
    return res.status(500).json({ error: 'Error getting chat status' });
  }
}

// Salva conversazione completa su Google Sheets
async function saveCompleteConversationToSheets(chatSession, reason) {
  try {
    const { logConversation } = await import('../utils/sheets-logger.js');
    
    // Crea un riassunto della conversazione completa
    const allMessages = chatSession.messages || [];
    const userMessages = allMessages.filter(msg => msg.type === 'user');
    const operatorMessages = allMessages.filter(msg => msg.type === 'operator');
    
    // Combina tutti i messaggi in una conversazione leggibile
    const conversationSummary = allMessages.map(msg => {
      if (msg.type === 'user') {
        return `👤 Utente: ${msg.message}`;
      } else if (msg.type === 'operator') {
        return `👨‍💼 ${msg.operator_name}: ${msg.message}`;
      }
      return msg.message;
    }).join('\n');
    
    // Log come conversazione AI normale ma con flag operatore
    await logConversation({
      sessionId: chatSession.session_id,
      userMessage: chatSession.original_question || 'Chat live con operatore',
      botReply: `[CHAT LIVE COMPLETATA]\n\n${conversationSummary}\n\n[Fine chat - Motivo: ${reason || 'completed'}]`,
      userIP: 'live_chat',
      smartActions: [],
      responseTime: Date.now() - new Date(chatSession.started_at).getTime(),
      intentDetected: 'live_chat_operator',
      whatsappUser: false,
      userAgent: `Operatore: ${chatSession.operator_name}`
    });
    
    console.log(`📊 Chat live salvata su Google Sheets: ${chatSession.session_id}`);
    return true;
    
  } catch (error) {
    console.error('❌ Errore salvataggio Google Sheets chat live:', error);
    return false;
  }
}

// Crea ticket automatico dalla chat live
async function createTicketFromLiveChat(chatSession, reason) {
  try {
    // Prepara dati per ticket system
    const conversationText = chatSession.messages?.map(msg => {
      const timestamp = new Date(msg.timestamp).toLocaleString('it-IT');
      if (msg.type === 'user') {
        return `[${timestamp}] Utente: ${msg.message}`;
      } else if (msg.type === 'operator') {
        return `[${timestamp}] ${msg.operator_name}: ${msg.message}`;
      }
      return `[${timestamp}] ${msg.message}`;
    }).join('\n') || 'Nessun messaggio registrato';
    
    const ticketData = {
      session_id: chatSession.session_id,
      original_question: chatSession.original_question || 'Chat live con operatore',
      conversation_transcript: conversationText,
      operator_name: chatSession.operator_name,
      started_at: chatSession.started_at,
      ended_at: new Date().toISOString(),
      resolution_reason: reason || 'completed',
      status: 'resolved',
      contact_method: 'live_chat',
      contact_info: 'Chat live - non richiesto contatto'
    };
    
    // Chiama API ticket system
    const response = await fetch('https://magazzino-gep-backend.onrender.com/api/tickets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(ticketData)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`🎫 Ticket creato da chat live: ${result.ticket_id || 'ID non disponibile'}`);
      return { success: true, ticket_id: result.ticket_id };
    } else {
      console.error('⚠️ Errore API ticket system:', response.status);
      return { success: false, error: 'API ticket system error' };
    }
    
  } catch (error) {
    console.error('❌ Errore creazione ticket da chat live:', error);
    return { success: false, error: error.message };
  }
}

// Log immediato messaggio operatore su Google Sheets
async function logOperatorMessageImmediate(sessionId, operatorMessage, chatSession) {
  try {
    const { logConversation } = await import('../utils/sheets-logger.js');
    
    await logConversation({
      sessionId: sessionId,
      userMessage: '[MESSAGGIO OPERATORE IN CHAT LIVE]',
      botReply: `👨‍💼 ${operatorMessage.operator_name}: ${operatorMessage.message}`,
      userIP: 'live_chat_operator',
      smartActions: [],
      responseTime: 0,
      intentDetected: 'live_chat_operator_message',
      whatsappUser: false,
      userAgent: `Chat Live - ${operatorMessage.operator_name}`
    });
    
    console.log(`📊 Messaggio operatore loggato immediatamente: ${sessionId}`);
    
  } catch (error) {
    console.error('❌ Errore log immediato operatore:', error);
  }
}

// Log immediato messaggio utente in chat live su Google Sheets
async function logUserMessageImmediate(sessionId, userMessage, chatSession) {
  try {
    const { logConversation } = await import('../utils/sheets-logger.js');
    
    await logConversation({
      sessionId: sessionId,
      userMessage: `[CHAT LIVE] ${userMessage.message}`,
      botReply: `[In attesa risposta operatore ${chatSession.operator_name}]`,
      userIP: 'live_chat_user',
      smartActions: [],
      responseTime: 0,
      intentDetected: 'live_chat_user_message',
      whatsappUser: false,
      userAgent: `Chat Live con ${chatSession.operator_name}`
    });
    
    console.log(`📊 Messaggio utente loggato immediatamente: ${sessionId}`);
    
  } catch (error) {
    console.error('❌ Errore log immediato utente:', error);
  }
}

// Log handover AI → Operatore su Google Sheets
async function logChatHandover(sessionId, chatSession, operatorName) {
  try {
    const { logConversation } = await import('../utils/sheets-logger.js');
    
    await logConversation({
      sessionId: sessionId,
      userMessage: chatSession.original_question || '[Domanda originale non disponibile]',
      botReply: `🔄 [HANDOVER CHAT LIVE]\n\n👤 Domanda utente: "${chatSession.original_question}"\n👨‍💼 Chat presa da operatore: ${operatorName}\n⏰ Inizio chat live: ${chatSession.started_at}\n\n💬 Da questo momento la conversazione è gestita dall'operatore umano.`,
      userIP: 'chat_handover',
      smartActions: [],
      responseTime: 0,
      intentDetected: 'chat_handover',
      whatsappUser: false,
      userAgent: `Handover to ${operatorName}`
    });
    
    console.log(`📊 Handover loggato: ${sessionId} → ${operatorName}`);
    
  } catch (error) {
    console.error('❌ Errore log handover:', error);
  }
}