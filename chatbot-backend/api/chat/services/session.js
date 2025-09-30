/**
 * Session Service - Gestisce sessioni utente unificate
 */
export class SessionService {
  constructor() {
    // Per ora usa Map in memoria, poi migreremo a Redis/Vercel KV
    this.sessions = new Map();
    this.rateLimitMap = new Map();
    
    // Configurazione
    this.SESSION_TTL = 24 * 60 * 60 * 1000; // 24 ore
    this.RATE_LIMIT_WINDOW = 60000; // 1 minuto
    this.RATE_LIMIT_MAX = 10; // Max 10 richieste per minuto
    
    // Cleanup periodico sessions scadute
    setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000); // ogni 5 min
  }

  /**
   * Schema sessione unificato
   */
  createSessionSchema(sessionId, clientIP = null) {
    return {
      id: sessionId,
      created_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
      client_ip: clientIP,
      
      user_data: {
        whatsapp_number: null,
        email: null,
        preferences: {}
      },
      
      conversation_history: [],
      
      escalation_state: 'none', // none, requested, active
      escalation_data: {
        ticket_id: null,
        operator_id: null,
        escalated_at: null
      },
      
      rate_limit: {
        count: 0,
        reset_time: Date.now() + this.RATE_LIMIT_WINDOW
      },
      
      metadata: {
        user_agent: null,
        source: 'web_chat'
      }
    };
  }

  /**
   * Ottiene o crea sessione
   */
  getSession(sessionId, clientIP = null) {
    if (!sessionId) {
      sessionId = this.generateSessionId();
    }

    if (!this.sessions.has(sessionId)) {
      const session = this.createSessionSchema(sessionId, clientIP);
      this.sessions.set(sessionId, session);
      return session;
    }

    const session = this.sessions.get(sessionId);
    
    // Aggiorna last_activity
    session.last_activity = new Date().toISOString();
    
    return session;
  }

  /**
   * Aggiorna dati sessione
   */
  updateSession(sessionId, updates) {
    const session = this.getSession(sessionId);
    
    // Merge updates
    Object.keys(updates).forEach(key => {
      if (typeof updates[key] === 'object' && updates[key] !== null) {
        session[key] = { ...session[key], ...updates[key] };
      } else {
        session[key] = updates[key];
      }
    });
    
    session.last_activity = new Date().toISOString();
    this.sessions.set(sessionId, session);
    
    return session;
  }

  /**
   * Aggiunge messaggio alla history
   */
  addMessageToHistory(sessionId, role, content, metadata = {}) {
    const session = this.getSession(sessionId);
    
    const message = {
      id: `${sessionId}_${Date.now()}`,
      role, // 'user', 'assistant', 'system'
      content,
      timestamp: new Date().toISOString(),
      ...metadata
    };
    
    session.conversation_history.push(message);
    
    // Mantieni solo ultimi 50 messaggi
    if (session.conversation_history.length > 50) {
      session.conversation_history = session.conversation_history.slice(-50);
    }
    
    this.sessions.set(sessionId, session);
    return message;
  }

  /**
   * Ottiene history conversazione
   */
  getConversationHistory(sessionId, limit = 10) {
    const session = this.getSession(sessionId);
    return session.conversation_history.slice(-limit);
  }

  /**
   * Rate limiting check
   */
  checkRateLimit(clientIP) {
    const now = Date.now();
    const clientKey = clientIP || 'unknown';
    
    if (!this.rateLimitMap.has(clientKey)) {
      this.rateLimitMap.set(clientKey, { 
        count: 0, 
        resetTime: now + this.RATE_LIMIT_WINDOW 
      });
    }
    
    const clientData = this.rateLimitMap.get(clientKey);
    
    // Reset se finestra scaduta
    if (now > clientData.resetTime) {
      clientData.count = 0;
      clientData.resetTime = now + this.RATE_LIMIT_WINDOW;
    }
    
    if (clientData.count >= this.RATE_LIMIT_MAX) {
      return {
        allowed: false,
        resetIn: clientData.resetTime - now,
        remaining: 0
      };
    }
    
    clientData.count++;
    
    return {
      allowed: true,
      remaining: this.RATE_LIMIT_MAX - clientData.count,
      resetIn: clientData.resetTime - now
    };
  }

  /**
   * Gestisce escalation a operatore
   */
  escalateToOperator(sessionId, reason, metadata = {}) {
    const updates = {
      escalation_state: 'requested',
      escalation_data: {
        reason,
        escalated_at: new Date().toISOString(),
        ...metadata
      }
    };
    
    return this.updateSession(sessionId, updates);
  }

  /**
   * Assegna operatore
   */
  assignOperator(sessionId, operatorId, operatorName) {
    const updates = {
      escalation_state: 'active',
      escalation_data: {
        operator_id: operatorId,
        operator_name: operatorName,
        assigned_at: new Date().toISOString()
      }
    };
    
    return this.updateSession(sessionId, updates);
  }

  /**
   * Aggiunge dati WhatsApp user
   */
  addWhatsAppUser(sessionId, phoneNumber, metadata = {}) {
    const updates = {
      user_data: {
        whatsapp_number: phoneNumber,
        whatsapp_registered_at: new Date().toISOString(),
        whatsapp_active: true,
        whatsapp_metadata: metadata
      }
    };
    
    return this.updateSession(sessionId, updates);
  }

  /**
   * Trova user per numero WhatsApp
   */
  findUserByWhatsApp(phoneNumber) {
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.user_data.whatsapp_number === phoneNumber) {
        return { sessionId, ...session };
      }
    }
    return null;
  }

  /**
   * Genera session ID univoco
   */
  generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Cleanup sessions scadute
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    const expiredSessions = [];
    
    for (const [sessionId, session] of this.sessions.entries()) {
      const lastActivity = new Date(session.last_activity).getTime();
      if (now - lastActivity > this.SESSION_TTL) {
        expiredSessions.push(sessionId);
      }
    }
    
    expiredSessions.forEach(sessionId => {
      this.sessions.delete(sessionId);
    });
    
    if (expiredSessions.length > 0) {
      console.log(`🧹 Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  /**
   * Statistiche sessioni
   */
  getSessionStats() {
    const now = Date.now();
    let activeSessions = 0;
    let escalatedSessions = 0;
    let whatsappUsers = 0;
    
    for (const session of this.sessions.values()) {
      const lastActivity = new Date(session.last_activity).getTime();
      
      // Attiva negli ultimi 30 minuti
      if (now - lastActivity < 30 * 60 * 1000) {
        activeSessions++;
      }
      
      if (session.escalation_state !== 'none') {
        escalatedSessions++;
      }
      
      if (session.user_data.whatsapp_number) {
        whatsappUsers++;
      }
    }
    
    return {
      total_sessions: this.sessions.size,
      active_sessions: activeSessions,
      escalated_sessions: escalatedSessions,
      whatsapp_users: whatsappUsers
    };
  }

  /**
   * Export per backup/migrazione
   */
  exportSessions() {
    const sessions = {};
    for (const [sessionId, session] of this.sessions.entries()) {
      sessions[sessionId] = session;
    }
    return sessions;
  }

  /**
   * Import per restore/migrazione  
   */
  importSessions(sessionsData) {
    this.sessions.clear();
    Object.entries(sessionsData).forEach(([sessionId, session]) => {
      this.sessions.set(sessionId, session);
    });
  }
}

/**
 * Factory function
 */
export function createSessionService() {
  return new SessionService();
}

export default SessionService;