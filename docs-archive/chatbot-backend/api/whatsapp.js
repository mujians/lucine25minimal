// WhatsApp API endpoint per notifiche e chat bidirezionale
import twilio from 'twilio';

// Inizializza Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const { action, to, message, ticketId, templateName, templateData } = req.body;

      switch (action) {
        case 'send_notification':
          return await sendNotification(req, res);
          
        case 'send_template':
          return await sendTemplate(req, res);
          
        case 'receive_message':
          return await receiveMessage(req, res);
          
        default:
          return res.status(400).json({ error: 'Invalid action' });
      }
      
    } catch (error) {
      console.error('WhatsApp API Error:', error);
      return res.status(500).json({ 
        error: 'WhatsApp service error',
        details: error.message 
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// Invia notifica semplice
async function sendNotification(req, res) {
  const { to, message, ticketId } = req.body;

  if (!to || !message) {
    return res.status(400).json({ error: 'Missing required fields: to, message' });
  }

  try {
    const formattedNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    
    const twilioMessage = await client.messages.create({
      from: TWILIO_WHATSAPP_NUMBER,
      to: formattedNumber,
      body: message
    });

    console.log(`✅ WhatsApp sent to ${to}:`, twilioMessage.sid);

    return res.status(200).json({
      success: true,
      messageSid: twilioMessage.sid,
      status: twilioMessage.status,
      to: to,
      ticketId: ticketId
    });

  } catch (error) {
    console.error('❌ WhatsApp send error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: error.code
    });
  }
}

// Invia template messaggio (per automazioni)
async function sendTemplate(req, res) {
  const { to, templateName, templateData } = req.body;

  const templates = {
    welcome: (data) => `🌟 *Benvenuto su WhatsApp!*\n\nCiao ${data.name}! Hai attivato le notifiche per ${data.event}.\n\nRiceverai aggiornamenti su:\n🎫 Prenotazioni\n📱 Supporto prioritario\n✨ Novità evento\n\nRispondi a questo messaggio per supporto diretto!`,
    
    ticket_created: (data) => `🎫 *Ticket #${data.ticketId} creato*\n\nCiao! Abbiamo ricevuto la tua richiesta:\n"${data.question}"\n\nTi risponderemo entro 24h.\n\n✨ Lucine di Natale Leggiuno`,
    
    ticket_assigned: (data) => `👋 *Operatore assegnato*\n\nCiao! Il tuo ticket #${data.ticketId} è stato preso in carico da ${data.operatorName}.\n\nRispondi a questo messaggio per chattare direttamente!`,
    
    cart_added: (data) => `🛒 *Biglietti aggiunti al carrello*\n\n${data.quantity}x ${data.ticketType}\nData: ${data.eventDate}\n\n⏰ Completa l'acquisto entro 15 minuti:\n${data.cartUrl}\n\nNeed help? Rispondi a questo messaggio!`,
    
    booking_confirmed: (data) => `🎫 *Prenotazione confermata*\n\nBiglietti: ${data.quantity}x ${data.ticketType}\nData: ${data.eventDate}\nOrario: ${data.eventTime}\n\n📍 Lucine di Natale - Leggiuno\n🚗 Parcheggi P1-P5 con navetta\n\nBuona visita! ✨`,
    
    reminder: (data) => `⏰ *Promemoria evento*\n\nCiao! Ti ricordiamo che hai prenotato per domani:\n\n📅 ${data.eventDate}\n🕐 ${data.eventTime}\n📍 Leggiuno, Lago Maggiore\n\nInfo parcheggi: P1-P5 con navetta gratuita\n🎄 Buona visita!`,
    
    payment_reminder: (data) => `💳 *Carrello in scadenza*\n\nHai biglietti nel carrello che scadranno presto:\n\n${data.quantity}x ${data.ticketType}\nValore: €${data.totalValue}\n\nCompleta ora: ${data.cartUrl}\n\nNeed help? Rispondi qui!`,
    
    event_update: (data) => `📢 *Aggiornamento evento*\n\n${data.title}\n\n${data.message}\n\n✨ Lucine di Natale Leggiuno\nInfo: lucinedinatale.it`
  };

  const template = templates[templateName];
  if (!template) {
    return res.status(400).json({ error: `Template '${templateName}' not found` });
  }

  const message = template(templateData);

  return await sendNotification(req, res);
}

// Ricevi messaggi in arrivo (webhook Twilio)
async function receiveMessage(req, res) {
  try {
    const { From: from, Body: body, MessageSid: messageSid } = req.body;

    console.log(`📱 WhatsApp received from ${from}:`, body);

    // Verifica se è una risposta a un ticket
    const phoneNumber = from.replace('whatsapp:', '');
    
    // Forwarda al ticket system
    const ticketResponse = await fetch('https://ticket-system-chat.onrender.com/api/whatsapp/incoming', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: phoneNumber,
        message: body,
        messageSid: messageSid,
        timestamp: new Date().toISOString(),
        source: 'whatsapp'
      })
    });

    if (ticketResponse.ok) {
      const result = await ticketResponse.json();
      
      if (result.autoReply) {
        // Invia risposta automatica
        await client.messages.create({
          from: TWILIO_WHATSAPP_NUMBER,
          to: from,
          body: result.autoReply
        });
      }
    }

    // Risposta a Twilio per confermare ricezione
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);

  } catch (error) {
    console.error('❌ WhatsApp receive error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// Funzioni utility per uso esterno
export async function sendWhatsAppNotification(phoneNumber, message, ticketId = null) {
  try {
    const response = await fetch('/api/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send_notification',
        to: phoneNumber,
        message: message,
        ticketId: ticketId
      })
    });

    return await response.json();
  } catch (error) {
    console.error('WhatsApp notification failed:', error);
    return { success: false, error: error.message };
  }
}

export async function sendWhatsAppTemplate(phoneNumber, templateName, templateData) {
  try {
    const response = await fetch('/api/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send_template',
        to: phoneNumber,
        templateName: templateName,
        templateData: templateData
      })
    });

    return await response.json();
  } catch (error) {
    console.error('WhatsApp template failed:', error);
    return { success: false, error: error.message };
  }
}