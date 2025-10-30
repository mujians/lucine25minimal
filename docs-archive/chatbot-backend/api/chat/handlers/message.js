/**
 * Message Handler - Gestisce il processamento dei messaggi
 */
export class MessageHandler {
  constructor(services) {
    this.openAIService = services.openAI;
    this.knowledgeService = services.knowledge;
    this.sessionService = services.session;
    this.bookingHandler = services.booking;
    this.whatsappHandler = services.whatsapp;
  }

  /**
   * Processa messaggio utente principale
   */
  async processMessage(message, sessionId, clientIP, req) {
    try {
      // 1. Gestione sessione
      const session = this.sessionService.getSession(sessionId, clientIP);
      
      // 2. Rate limiting
      const rateLimit = this.sessionService.checkRateLimit(clientIP);
      if (!rateLimit.allowed) {
        return this.handleRateLimitExceeded(rateLimit);
      }

      // 3. Aggiungi messaggio alla history
      this.sessionService.addMessageToHistory(sessionId, 'user', message, {
        client_ip: clientIP,
        timestamp: new Date().toISOString()
      });

      // 4. Carica knowledge base
      const knowledgeBase = this.knowledgeService.loadKnowledgeBase();
      
      // 5. Fetch info real-time se necessario
      let realtimeInfo = null;
      if (this.isTicketRelatedQuery(message)) {
        realtimeInfo = await this.fetchRealtimeTicketInfo();
      }

      // 6. Costruisci context per AI
      const context = this.knowledgeService.buildContextFromKnowledgeBase(
        knowledgeBase, 
        realtimeInfo
      );

      // 7. Genera risposta AI
      const aiResponse = await this.openAIService.generateChatResponse(
        context, 
        message,
        { temperature: 0.3, maxTokens: 250 }
      );

      let reply = aiResponse.reply;

      // 8. Gestione intent speciali
      const intentResult = await this.handleSpecialIntents(
        message, 
        reply, 
        session, 
        knowledgeBase, 
        req
      );
      
      if (intentResult) {
        return intentResult;
      }

      // 9. Verifica low confidence
      if (this.knowledgeService.isLowConfidenceReply(reply)) {
        return await this.handleLowConfidence(message, session, knowledgeBase);
      }

      // 10. Aggiungi risposta alla history
      this.sessionService.addMessageToHistory(sessionId, 'assistant', reply, {
        ai_confidence: aiResponse.confidence || 0.8,
        ai_model: aiResponse.model
      });

      // 11. Genera smart actions
      const smartActions = await this.generateSmartActions(
        reply, 
        message, 
        knowledgeBase,
        session
      );

      // 12. Log per monitoring
      this.logConversation(sessionId, message, reply, clientIP);

      return {
        reply,
        smartActions,
        sessionId,
        confidence: aiResponse.confidence || 0.8,
        metadata: {
          response_time: Date.now() - session.last_activity_timestamp,
          ai_model: aiResponse.model,
          tokens_used: aiResponse.usage?.total_tokens
        }
      };

    } catch (error) {
      console.error('❌ Message processing error:', error);
      return this.handleProcessingError(error, sessionId);
    }
  }

  /**
   * Gestisce intent speciali (WhatsApp, Booking, ecc.)
   */
  async handleSpecialIntents(message, reply, session, knowledgeBase, req) {
    // WhatsApp Intent
    if (reply.includes('WHATSAPP_REQUEST') || this.isWhatsAppIntent(message)) {
      return await this.whatsappHandler.handleWhatsAppRequest(
        message, 
        session, 
        req
      );
    }

    // Booking Intent
    if (reply.includes('BOOKING_REQUEST') || this.isBookingIntent(message)) {
      return await this.bookingHandler.handleBookingRequest(
        message, 
        session, 
        knowledgeBase, 
        req
      );
    }

    // Purchase Intent (fallback)
    if (this.isPurchaseIntent(message) && !reply.includes('BOOKING_REQUEST')) {
      return await this.bookingHandler.handlePurchaseIntent(
        message, 
        session, 
        knowledgeBase
      );
    }

    return null; // Nessun intent speciale trovato
  }

  /**
   * Gestisce bassa confidence AI
   */
  async handleLowConfidence(message, session, knowledgeBase) {
    // Check se utente sta confermando escalation
    const confirmationPattern = /(sì|si|conferma|contatta|operatore|help|aiuto)/i;
    const isConfirming = confirmationPattern.test(message.toLowerCase());
    
    if (isConfirming && message.toLowerCase().includes('operatore')) {
      // Crea ticket
      const ticketResult = await this.escalateToOperator(message, session);
      
      if (ticketResult.success) {
        return {
          reply: `✅ ${ticketResult.message}\n\nTicket ID: #${ticketResult.ticket_id}\n\n📧 Riceverai risposta via email entro 24h.${session.user_data.whatsapp_number ? '\n📱 Ti contatteremo anche su WhatsApp!' : ''}`,
          sessionId: session.id,
          escalated: true
        };
      }
    }

    // Prima richiesta - chiedi conferma
    return {
      reply: `🤔 Non ho trovato una risposta precisa alla tua domanda.\n\n**Vuoi che contatti un operatore umano?**\n\nUn operatore potrà aiutarti con informazioni dettagliate e supporto personalizzato.\n\n✅ Rispondi **"Sì, contatta operatore"** per creare un ticket\n❌ Oppure prova:\n📧 Email: ${knowledgeBase.contact.email}\n📱 WhatsApp: ${knowledgeBase.contact.whatsapp}`,
      sessionId: session.id,
      needsConfirmation: true,
      confirmationType: 'escalation'
    };
  }

  /**
   * Escalation a operatore
   */
  async escalateToOperator(message, session) {
    try {
      const whatsappNumber = session.user_data.whatsapp_number;
      
      // Timeout per evitare timeout Vercel
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const ticketResponse = await fetch('https://ticket-system-chat.onrender.com/api/chat/request-operator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: session.id,
          user_email: 'utente@lucinedinatale.it',
          user_phone: whatsappNumber,
          whatsapp_number: whatsappNumber,
          question: message,
          priority: whatsappNumber ? 'high' : 'medium',
          source: 'chatbot_escalation_v2',
          whatsapp_enabled: !!whatsappNumber
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (ticketResponse.ok) {
        const result = await ticketResponse.json();
        
        // Aggiorna sessione
        this.sessionService.escalateToOperator(session.id, 'low_confidence', {
          ticket_id: result.ticket_id,
          message: message
        });
        
        return {
          success: true,
          message: result.message || 'Ticket creato con successo',
          ticket_id: result.ticket_id
        };
      }

      return { success: false };

    } catch (error) {
      console.error('❌ Escalation error:', error);
      return { success: false };
    }
  }

  /**
   * Genera smart actions contestuali
   */
  async generateSmartActions(reply, userMessage, knowledgeBase, session) {
    // Prima prova AI-generated actions
    try {
      const history = this.sessionService.getConversationHistory(session.id, 3);
      const aiActions = await this.openAIService.generateSmartActions(
        userMessage,
        history.map(h => h.content),
        knowledgeBase
      );
      
      if (aiActions && aiActions.length > 0) {
        return aiActions.slice(0, 3); // Max 3 actions
      }
    } catch (error) {
      console.error('AI smart actions failed, falling back to static:', error);
    }

    // Fallback a logica statica
    return this.generateStaticSmartActions(reply, userMessage, knowledgeBase);
  }

  /**
   * Smart actions statiche (fallback)
   */
  generateStaticSmartActions(reply, userMessage, knowledgeBase) {
    const actions = [];
    const lowerReply = reply.toLowerCase();
    const lowerMessage = userMessage.toLowerCase();
    
    // Azioni biglietti
    if (lowerReply.includes('bigliett') || lowerMessage.includes('bigliett')) {
      actions.push({
        type: 'primary',
        icon: '🎫',
        text: 'Prenota Biglietti',
        url: knowledgeBase.products?.main_ticket?.url,
        description: 'Calendario con date disponibili'
      });
    }
    
    // Azioni parcheggi  
    if (lowerReply.includes('parcheggi') || lowerMessage.includes('parcheggi')) {
      actions.push({
        type: 'info',
        icon: '🚗',
        text: 'Mappa Parcheggi',
        url: 'https://maps.google.com/search/parcheggi+leggiuno',
        description: 'P1-P5 con navetta gratuita'
      });
    }
    
    // WhatsApp se non già attivo
    if (!lowerReply.includes('whatsapp') && actions.length < 2) {
      actions.push({
        type: 'secondary',
        icon: '📱',
        text: 'Attiva WhatsApp',
        action: 'whatsapp_signup',
        description: 'Ricevi notifiche istantanee'
      });
    }
    
    return actions.slice(0, 3);
  }

  /**
   * Utility functions per intent detection
   */
  isTicketRelatedQuery(message) {
    const keywords = ['bigliett', 'acquist', 'comprar', 'prezzo', 'disponib', 'data', 'quando', 'calendario'];
    const lower = message.toLowerCase();
    return keywords.some(keyword => lower.includes(keyword));
  }

  isWhatsAppIntent(message) {
    const lower = message.toLowerCase();
    return lower.includes('whatsapp') || lower.includes('notifiche') || lower.includes('aggiornamenti');
  }

  isBookingIntent(message) {
    const patterns = [
      /prenotar[ei]?\s+.*bigl?iett/i,
      /voglio\s+.*bigl?iett/i,
      /(\d+)\s+bigl?iett/i,
      /bigl?iett.*per\s+il\s+(\d{1,2})/i
    ];
    return patterns.some(pattern => pattern.test(message));
  }

  isPurchaseIntent(message) {
    const patterns = [
      /devo.*comprar.*bigliett/i,
      /voglio.*comprar.*bigliett/i,
      /comprare.*bigliett/i
    ];
    return patterns.some(pattern => pattern.test(message));
  }

  /**
   * Rate limit handling
   */
  handleRateLimitExceeded(rateLimit) {
    return {
      error: "Troppi messaggi. Riprova tra qualche istante.",
      retry_after: rateLimit.resetIn,
      escapeRoutes: [
        "📧 info@lucinedinatale.it",
        "📱 https://wa.me/393123456789"
      ]
    };
  }

  /**
   * Error handling
   */
  handleProcessingError(error, sessionId) {
    return {
      error: "Si è verificato un errore tecnico.",
      sessionId,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      escapeRoutes: [
        "📧 info@lucinedinatale.it",
        "📱 https://wa.me/393123456789"
      ]
    };
  }

  /**
   * Logging per monitoring
   */
  logConversation(sessionId, userMessage, botReply, clientIP) {
    console.log('=== CHAT LOG ===');
    console.log('Time:', new Date().toISOString());
    console.log('Session:', sessionId);
    console.log('User:', userMessage);
    console.log('Bot:', botReply);
    console.log('IP:', clientIP || 'unknown');
    console.log('================');
  }

  /**
   * Fetch real-time ticket info (placeholder)
   */
  async fetchRealtimeTicketInfo() {
    // TODO: Implementare fetch real-time da Shopify
    return null;
  }
}

/**
 * Factory function
 */
export function createMessageHandler(services) {
  return new MessageHandler(services);
}

export default MessageHandler;