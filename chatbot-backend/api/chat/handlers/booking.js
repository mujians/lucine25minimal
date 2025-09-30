/**
 * Booking Handler - Gestisce le richieste di prenotazione
 */
export class BookingHandler {
  constructor(services) {
    this.sessionService = services.session;
    this.whatsappHandler = services.whatsapp;
  }

  /**
   * Gestisce richieste di prenotazione
   */
  async handleBookingRequest(message, session, knowledgeBase, req) {
    const bookingRequest = this.parseBookingRequest(message);
    
    if (bookingRequest.dates.length > 0) {
      // Ha specificato date - verifica se sono valide
      const closedDates = ['2024-12-24', '2024-12-31', '2025-12-24', '2025-12-31'];
      const invalidDates = bookingRequest.dates.filter(date => 
        closedDates.includes(date.formatted)
      );
      
      if (invalidDates.length > 0) {
        return this.handleClosedDates(invalidDates, knowledgeBase);
      }

      // Date valide - prova aggiunta automatica
      if (bookingRequest.dates.length === 1 && 
          bookingRequest.quantity && 
          bookingRequest.quantity <= 4) {
        
        return await this.attemptAutomaticBooking(
          bookingRequest, 
          session, 
          knowledgeBase, 
          req
        );
      } else {
        // Multiple date o quantità alta - redirect a calendario
        return this.redirectToCalendar(bookingRequest, knowledgeBase);
      }
      
    } else {
      // Richiesta generica senza date
      return this.handleGenericBookingRequest(knowledgeBase);
    }
  }

  /**
   * Gestisce intent di acquisto (fallback)
   */
  async handlePurchaseIntent(message, session, knowledgeBase) {
    const bookingRequest = this.parseBookingRequest(message);
    
    if (bookingRequest.dates.length > 0) {
      // Ha date specifiche
      const targetDate = bookingRequest.dates[0];
      const quantity = bookingRequest.quantity || 1;
      
      if (quantity <= 4) {
        try {
          const cartResult = await this.addToCartDirect('intero', quantity, targetDate.formatted);
          
          if (cartResult.success) {
            // Invia notifica WhatsApp se utente registrato
            await this.sendBookingWhatsAppNotification(session, {
              quantity,
              ticketType: 'Intero',
              eventDate: targetDate.formatted,
              cartUrl: cartResult.cart_url
            });

            return {
              reply: `${cartResult.message}\n\n🛒 Vai al carrello:\n👆 ${cartResult.cart_url}`,
              sessionId: session.id,
              smartActions: [
                {
                  type: 'success',
                  icon: '🛒',
                  text: 'Vai al Carrello',
                  url: cartResult.cart_url,
                  description: 'Completa il tuo acquisto'
                }
              ]
            };
          }
        } catch (error) {
          console.error('❌ Auto cart failed:', error);
        }
      }
      
      // Fallback a calendario
      const dateText = `${targetDate.day} ${targetDate.month === 12 ? 'dicembre' : 'gennaio'}`;
      return {
        reply: `🎫 Per prenotare ${quantity > 1 ? quantity + ' biglietti' : 'biglietti'} per il ${dateText}, usa il calendario:\n\n👆 ${knowledgeBase.products?.main_ticket?.url}`,
        sessionId: session.id,
        smartActions: [
          {
            type: 'primary',
            icon: '🎫',
            text: 'Prenota Online',
            url: knowledgeBase.products?.main_ticket?.url,
            description: `${dateText} - ${quantity} biglietti`
          }
        ]
      };
      
    } else {
      // Richiesta generica
      return this.handleGenericBookingRequest(knowledgeBase);
    }
  }

  /**
   * Tentativo prenotazione automatica
   */
  async attemptAutomaticBooking(bookingRequest, session, knowledgeBase, req) {
    const targetDate = bookingRequest.dates[0];
    const quantity = bookingRequest.quantity;
    
    try {
      const cartResult = await this.addToCartDirect('intero', quantity, targetDate.formatted);
      
      if (cartResult.success && cartResult.action === 'cart_added') {
        // Success - invia notifiche
        await this.sendBookingWhatsAppNotification(session, {
          quantity,
          ticketType: 'Intero', 
          eventDate: targetDate.formatted,
          cartUrl: cartResult.cart_url
        });

        // Log per tracking
        console.log(`✅ Auto-booking success: ${quantity}x tickets for ${targetDate.formatted}`);

        return {
          reply: `${cartResult.message}\n\n🛒 Vai al carrello per completare:\n👆 ${cartResult.cart_url}\n\n💡 Ricorda di selezionare l'orario preferito durante il checkout.`,
          sessionId: session.id,
          smartActions: [
            {
              type: 'success',
              icon: '🛒', 
              text: 'Completa Acquisto',
              url: cartResult.cart_url,
              description: 'Finalizza la prenotazione'
            },
            {
              type: 'secondary',
              icon: '📱',
              text: 'Attiva WhatsApp',
              action: 'whatsapp_signup',
              description: 'Per conferma automatica'
            }
          ],
          booking_attempted: true,
          booking_success: true
        };
      }
    } catch (error) {
      console.error('❌ Automatic booking failed:', error);
    }
    
    // Fallback a calendario se auto-booking fallisce
    return this.redirectToCalendar(bookingRequest, knowledgeBase);
  }

  /**
   * Redirect a calendario
   */
  redirectToCalendar(bookingRequest, knowledgeBase) {
    let dateText = '';
    if (bookingRequest.dates.length > 0) {
      const dates = bookingRequest.dates.map(d => 
        `${d.day} ${d.month === 12 ? 'dicembre' : 'gennaio'}`
      );
      dateText = bookingRequest.dates.length === 1 ? 
        ` per il ${dates[0]}` : 
        ` per ${dates.join(' e ')}`;
    }

    const quantityText = bookingRequest.quantity > 1 ? 
      `${bookingRequest.quantity} biglietti` : 
      'biglietti';

    return {
      reply: `🎫 Per prenotare ${quantityText}${dateText}, usa il calendario interattivo:\n\n👆 ${knowledgeBase.products?.main_ticket?.url}\n\n📅 Seleziona data e orario\n🎟️ Scegli tipo biglietto\n🛒 Aggiungi al carrello`,
      sessionId: bookingRequest.sessionId || 'unknown',
      smartActions: [
        {
          type: 'primary',
          icon: '🎫',
          text: 'Prenota Online',
          url: knowledgeBase.products?.main_ticket?.url,
          description: 'Calendario interattivo'
        }
      ]
    };
  }

  /**
   * Gestisce richieste generiche
   */
  handleGenericBookingRequest(knowledgeBase) {
    return {
      reply: `🎫 Per prenotare biglietti, usa il calendario interattivo:\n\n👆 ${knowledgeBase.products?.main_ticket?.url}\n\n📅 Seleziona data e orario\n🎟️ Scegli tipo biglietto\n🛒 Aggiungi al carrello`,
      smartActions: [
        {
          type: 'primary',
          icon: '🎫',
          text: 'Prenota Online', 
          url: knowledgeBase.products?.main_ticket?.url,
          description: 'Tutte le date disponibili'
        }
      ]
    };
  }

  /**
   * Gestisce date chiuse
   */
  handleClosedDates(invalidDates, knowledgeBase) {
    const invalidDatesList = invalidDates.map(d => 
      `${d.day} ${d.month === 12 ? 'dicembre' : 'gennaio'}`
    ).join(', ');

    return {
      reply: `⚠️ Attenzione: Il parco è CHIUSO il ${invalidDatesList}.\n\nPer le altre date, usa il calendario:\n🎫 ${knowledgeBase.products?.main_ticket?.url}\n\nPer assistenza:\n📧 ${knowledgeBase.contact.email}`,
      smartActions: [
        {
          type: 'primary',
          icon: '🎫',
          text: 'Vedi Date Aperte',
          url: knowledgeBase.products?.main_ticket?.url,
          description: 'Calendario disponibilità'
        },
        {
          type: 'secondary',
          icon: '📧',
          text: 'Contatta Staff',
          url: `mailto:${knowledgeBase.contact.email}?subject=Informazioni date chiuse`,
          description: 'Supporto personalizzato'
        }
      ]
    };
  }

  /**
   * Parse richiesta prenotazione
   */
  parseBookingRequest(message) {
    const lowerMessage = message.toLowerCase();
    
    // Pattern per riconoscere prenotazioni
    const bookingPatterns = [
      /prenotar[ei]?\s+(\d+)?\s*bigl?iett[oi]/i,
      /voglio\s+(\d+)?\s*bigl?iett[oi]/i,
      /(\d+)\s+bigl?iett[oi]/i,
      /(devo|dovrei|bisogna|serve)\s+.*bigl?iett[oi]/i,
      /comprar[ei]\s+.*bigl?iett[oi]/i,
      /bigl?iett[oi].*per\s+il\s+(\d{1,2})/i
    ];
    
    // Pattern date
    const datePattern = /(\d{1,2})\s+(dicembre|gennaio|febbraio)/gi;
    const quantityPattern = /(?:^|\s)(\d+)\s+bigl?iett[oi]/i;
    
    const result = {
      isBookingRequest: false,
      quantity: 1,
      dates: []
    };
    
    // Check booking patterns
    result.isBookingRequest = bookingPatterns.some(pattern => pattern.test(lowerMessage));
    
    // Estrai quantità
    const qtyMatch = lowerMessage.match(quantityPattern);
    if (qtyMatch) {
      result.quantity = parseInt(qtyMatch[1]) || 1;
    }
    
    // Estrai date
    const dateMatches = [...lowerMessage.matchAll(datePattern)];
    dateMatches.forEach(match => {
      const day = parseInt(match[1]);
      const month = match[2];
      const monthMap = { 'dicembre': 12, 'gennaio': 1, 'febbraio': 2 };
      const year = monthMap[month] === 12 ? 2024 : 2025;
      
      result.dates.push({
        day,
        month: monthMap[month],
        year,
        formatted: `${year}-${String(monthMap[month]).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      });
    });
    
    return result;
  }

  /**
   * Aggiunta diretta al carrello Shopify
   */
  async addToCartDirect(ticketType, quantity, eventDate, eventTime = '18:00') {
    try {
      const variantMap = {
        'intero': '51699961233747',
        'ridotto': '51700035944787', 
        'saltafila': '51700063207763',
        'open': '10082871050579'
      };
      
      const variantId = variantMap[ticketType.toLowerCase()] || variantMap['intero'];
      const eventId = `chatbot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Format date per display
      const dateObj = new Date(eventDate);
      const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
                         'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
      const eventLabel = `${dateObj.getDate()} ${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()} - ${eventTime}`;
      
      // Shopify Cart API call
      const formData = new FormData();
      formData.append('id', variantId);
      formData.append('quantity', quantity.toString());
      formData.append('properties[_event_id]', eventId);
      formData.append('properties[Event]', eventLabel);
      formData.append('properties[Source]', 'Chatbot Lucy v2');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://lucinedinatale.it/cart/add.js', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; LucyChatbot/2.0)'
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
      console.error('❌ Cart add failed:', error);
      
      const baseUrl = 'https://lucinedinatale.it/products/biglietto-parco-lucine-di-natale-2025';
      return {
        success: false,
        action: 'redirect_to_product',
        url: baseUrl,
        message: `⚠️ Aggiunta automatica fallita. Usa il link per prenotare ${quantity} bigliett${quantity > 1 ? 'i' : 'o'} ${ticketType} per ${eventDate}.`
      };
    }
  }

  /**
   * Invia notifica WhatsApp per booking
   */
  async sendBookingWhatsAppNotification(session, bookingData) {
    if (!session.user_data.whatsapp_number || !this.whatsappHandler) {
      return;
    }

    try {
      await this.whatsappHandler.sendTemplate(
        session.user_data.whatsapp_number,
        'cart_added',
        bookingData
      );
      
      console.log('📱 WhatsApp booking notification sent');
    } catch (error) {
      console.error('❌ WhatsApp booking notification failed:', error);
    }
  }
}

/**
 * Factory function
 */
export function createBookingHandler(services) {
  return new BookingHandler(services);
}

export default BookingHandler;