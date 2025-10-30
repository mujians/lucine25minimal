/**
 * WhatsApp Handler - Gestisce registrazione e notifiche WhatsApp
 */
export class WhatsAppHandler {
  constructor(services) {
    this.sessionService = services.session;
  }

  /**
   * Gestisce richieste WhatsApp
   */
  async handleWhatsAppRequest(message, session, req) {
    // Verifica se ha già fornito un numero
    const phonePattern = /(\+39\s?)?(\d{3}\s?\d{3}\s?\d{4}|\d{10})/;
    const phoneMatch = message.match(phonePattern);
    
    if (phoneMatch) {
      // Numero fornito - salvalo e conferma
      return await this.registerWhatsAppUser(phoneMatch[0], session, req);
    } else {
      // Richiedi il numero
      return this.requestWhatsAppNumber(session);
    }
  }

  /**
   * Registra utente WhatsApp
   */
  async registerWhatsAppUser(phoneInput, session, req) {
    const phoneNumber = phoneInput.replace(/\s/g, '');
    const formattedPhone = phoneNumber.startsWith('+39') ? 
      phoneNumber : '+39' + phoneNumber;
    
    // Salva nel session service
    const metadata = {
      source: 'chatbot',
      user_agent: req?.headers?.['user-agent'],
      ip: req?.headers?.['x-forwarded-for'] || req?.connection?.remoteAddress,
      registered_at: new Date().toISOString()
    };
    
    this.sessionService.addWhatsAppUser(session.id, formattedPhone, metadata);
    
    // Prova a inviare messaggio di benvenuto
    let welcomeSent = false;
    try {
      welcomeSent = await this.sendWelcomeMessage(formattedPhone, req);
    } catch (error) {
      console.error('❌ Welcome message failed:', error);
    }
    
    return {
      reply: `✅ Perfetto! Ho salvato il tuo numero WhatsApp: ${formattedPhone}

Riceverai notifiche per:
📱 Aggiornamenti biglietti
🎫 Conferme prenotazione  
💬 Supporto prioritario

${welcomeSent ? '📲 Ti ho appena inviato un messaggio di benvenuto!' : '🟡 Numero salvato - notifiche attive'}

Per disattivare scrivi "STOP WhatsApp"`,
      sessionId: session.id,
      whatsapp_registered: true,
      whatsapp_number: formattedPhone,
      smartActions: [
        {
          type: 'success',
          icon: '✅',
          text: 'WhatsApp Attivato',
          description: 'Notifiche attive per questo numero'
        },
        {
          type: 'primary',
          icon: '🎫',
          text: 'Prenota Biglietti',
          url: 'https://lucinedinatale.it/products/biglietto-parco-lucine-di-natale-2025',
          description: 'Riceverai conferma su WhatsApp'
        }
      ]
    };
  }

  /**
   * Richiede numero WhatsApp
   */
  requestWhatsAppNumber(session) {
    return {
      reply: `📱 **Attiva notifiche WhatsApp**

Per ricevere aggiornamenti istantanei su biglietti e supporto, condividi il tuo numero WhatsApp:

**Esempio:** +39 123 456 7890

✨ Riceverai:
🎫 Conferme prenotazione
📱 Aggiornamenti evento  
💬 Supporto prioritario

*Rispettiamo la privacy - solo notifiche essenziali*`,
      sessionId: session.id,
      whatsapp_requested: true,
      smartActions: [
        {
          type: 'info',
          icon: '📱',
          text: 'Formato: +39 XXX XXX XXXX',
          description: 'Inserisci il numero nel prossimo messaggio'
        }
      ]
    };
  }

  /**
   * Invia messaggio di benvenuto
   */
  async sendWelcomeMessage(phoneNumber, req) {
    try {
      // Chiama API WhatsApp esistente
      const response = await fetch(`${this.getBaseUrl(req)}/api/whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_template',
          to: phoneNumber,
          templateName: 'welcome',
          templateData: {
            name: 'Visitatore',
            event: 'Lucine di Natale Leggiuno'
          }
        })
      });

      return response.ok;
    } catch (error) {
      console.error('❌ Welcome message error:', error);
      return false;
    }
  }

  /**
   * Invia template specifico
   */
  async sendTemplate(phoneNumber, templateName, templateData) {
    try {
      const response = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_template',
          to: phoneNumber,
          templateName,
          templateData
        })
      });

      if (response.ok) {
        console.log(`📱 Template ${templateName} sent to ${phoneNumber}`);
        return true;
      }
    } catch (error) {
      console.error(`❌ Template ${templateName} failed:`, error);
    }
    
    return false;
  }

  /**
   * Trova utente per numero WhatsApp
   */
  findUserByPhone(phoneNumber) {
    return this.sessionService.findUserByWhatsApp(phoneNumber);
  }

  /**
   * Disattiva notifiche WhatsApp
   */
  async deactivateWhatsApp(session) {
    const updates = {
      user_data: {
        whatsapp_active: false,
        deactivated_at: new Date().toISOString()
      }
    };
    
    this.sessionService.updateSession(session.id, updates);
    
    return {
      reply: `📱 Notifiche WhatsApp disattivate.

Puoi riattivarle in qualsiasi momento scrivendo "attiva WhatsApp".

Grazie per aver usato il servizio! ✨`,
      sessionId: session.id,
      whatsapp_deactivated: true
    };
  }

  /**
   * Utility per ottenere base URL
   */
  getBaseUrl(req) {
    if (!req) return 'https://chatbot-backend-aicwwsgq5-brunos-projects-075c84f2.vercel.app';
    
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    return `${protocol}://${host}`;
  }

  /**
   * Gestisce messaggi in arrivo da WhatsApp
   */
  async handleIncomingWhatsApp(from, body, messageSid) {
    const phoneNumber = from.replace('whatsapp:', '');
    
    // Trova sessione utente
    const userSession = this.findUserByPhone(phoneNumber);
    
    if (userSession) {
      // Aggiorna conversazione
      this.sessionService.addMessageToHistory(userSession.sessionId, 'user', body, {
        source: 'whatsapp',
        messageSid
      });
      
      // TODO: Notifica dashboard operatori se implementata
      console.log(`📱 WhatsApp message from ${phoneNumber}: ${body}`);
      
      return {
        success: true,
        session: userSession,
        message: body
      };
    }
    
    // Utente sconosciuto
    console.log(`📱 Unknown WhatsApp user: ${phoneNumber}`);
    return {
      success: false,
      reason: 'unknown_user',
      phone: phoneNumber
    };
  }
}

/**
 * Factory function
 */
export function createWhatsAppHandler(services) {
  return new WhatsAppHandler(services);
}

export default WhatsAppHandler;