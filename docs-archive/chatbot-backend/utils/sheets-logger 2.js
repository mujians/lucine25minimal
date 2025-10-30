// Sistema logging conversazioni su Google Sheets
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

// ID del Google Sheet (da configurare)
const SHEET_ID = process.env.GOOGLE_SHEET_ID || '';

// Credenziali Service Account (da configurare in .env)
const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY
    ?.replace(/^"/, '')  // Rimuovi virgoletta iniziale
    ?.replace(/"$/, '')  // Rimuovi virgoletta finale
    ?.replace(/\\\\n/g, '\n')  // Converti \\n
    ?.replace(/\\n/g, '\n'),   // Converti \n
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// Schema per le conversazioni
const CONVERSATION_HEADERS = [
  'timestamp',
  'session_id', 
  'user_message',
  'bot_reply',
  'user_ip',
  'smart_actions',
  'response_time_ms',
  'intent_detected',
  'whatsapp_user',
  'user_agent'
];

// Inizializza Google Sheet
async function initializeSheet() {
  try {
    if (!SHEET_ID) {
      console.log('⚠️ Google Sheet ID non configurato');
      return null;
    }

    const doc = new GoogleSpreadsheet(SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    
    // Cerca o crea il foglio "Conversazioni"
    let sheet = doc.sheetsByTitle['Conversazioni'];
    
    if (!sheet) {
      // Crea nuovo foglio se non exists
      sheet = await doc.addSheet({ 
        title: 'Conversazioni',
        headerValues: CONVERSATION_HEADERS
      });
      console.log('✅ Foglio "Conversazioni" creato');
    } else {
      // Verifica headers esistenti
      await sheet.loadHeaderRow();
      if (sheet.headerValues.length === 0) {
        await sheet.setHeaderRow(CONVERSATION_HEADERS);
        console.log('✅ Headers configurati nel foglio esistente');
      }
    }
    
    return sheet;
  } catch (error) {
    console.error('❌ Errore inizializzazione Google Sheet:', error);
    return null;
  }
}

// Salva singola conversazione
export async function logConversation({
  sessionId,
  userMessage,
  botReply,
  userIP,
  smartActions = [],
  responseTime = 0,
  intentDetected = 'unknown',
  whatsappUser = false,
  userAgent = ''
}) {
  try {
    // Fallback se Google Sheets non configurato
    if (!SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      console.log('📝 Log locale (Google Sheets non configurato):', {
        time: new Date().toISOString(),
        session: sessionId,
        user: userMessage,
        bot: botReply.substring(0, 100) + '...',
        ip: userIP
      });
      return false;
    }

    const sheet = await initializeSheet();
    if (!sheet) return false;

    // Prepara dati per Google Sheets
    const rowData = {
      timestamp: new Date().toISOString(),
      session_id: sessionId,
      user_message: userMessage,
      bot_reply: botReply,
      user_ip: userIP || 'unknown',
      smart_actions: JSON.stringify(smartActions),
      response_time_ms: responseTime,
      intent_detected: intentDetected,
      whatsapp_user: whatsappUser ? 'YES' : 'NO',
      user_agent: userAgent.substring(0, 200) // Tronca user agent
    };

    // Aggiungi riga al sheet
    await sheet.addRow(rowData);
    
    console.log('✅ Conversazione salvata su Google Sheets');
    return true;
    
  } catch (error) {
    console.error('❌ Errore salvataggio Google Sheets:', error);
    
    // Fallback: log console dettagliato
    console.log('📝 Fallback log:', {
      time: new Date().toISOString(),
      session: sessionId,
      user: userMessage,
      bot: botReply.substring(0, 100) + '...',
      ip: userIP,
      intent: intentDetected,
      actions: smartActions.length
    });
    
    return false;
  }
}

// Salva statistiche giornaliere
export async function logDailyStats() {
  try {
    const sheet = await initializeSheet();
    if (!sheet) return false;

    const doc = sheet._spreadsheet;
    let statsSheet = doc.sheetsByTitle['Statistiche'];
    
    if (!statsSheet) {
      statsSheet = await doc.addSheet({ 
        title: 'Statistiche',
        headerValues: [
          'data',
          'conversazioni_totali',
          'utenti_unici',
          'intent_acquisto',
          'ticket_creati',
          'whatsapp_signup',
          'errori'
        ]
      });
    }

    // Calcola stats del giorno (esempio)
    const today = new Date().toISOString().split('T')[0];
    
    // Qui potresti calcolare statistiche reali dal sheet conversazioni
    const statsData = {
      data: today,
      conversazioni_totali: 0, // Da calcolare
      utenti_unici: 0, // Da calcolare  
      intent_acquisto: 0, // Da calcolare
      ticket_creati: 0, // Da calcolare
      whatsapp_signup: 0, // Da calcolare
      errori: 0 // Da calcolare
    };

    await statsSheet.addRow(statsData);
    console.log('✅ Statistiche giornaliere salvate');
    
    return true;
  } catch (error) {
    console.error('❌ Errore salvataggio statistiche:', error);
    return false;
  }
}

// Rileva intent dalla conversazione
export function detectIntent(userMessage, botReply) {
  const message = userMessage.toLowerCase();
  
  if (message.includes('bigliett') || message.includes('comprar') || message.includes('acquist')) {
    return 'acquisto_biglietti';
  } else if (message.includes('prezz')) {
    return 'richiesta_prezzi';
  } else if (message.includes('parcheggi') || message.includes('arrivare')) {
    return 'info_logistiche';
  } else if (message.includes('whatsapp') || message.includes('notifiche')) {
    return 'whatsapp_signup';
  } else if (message.includes('orari') || message.includes('quando')) {
    return 'info_orari';
  } else if (botReply.includes('operatore') || botReply.includes('ticket')) {
    return 'richiesta_supporto';
  } else {
    return 'domanda_generica';
  }
}

// Test connessione (per debug)
export async function testSheetsConnection() {
  try {
    const sheet = await initializeSheet();
    if (sheet) {
      console.log('✅ Connessione Google Sheets OK');
      console.log('📊 Sheet ID:', SHEET_ID);
      console.log('📝 Righe attuali:', sheet.rowCount);
      return true;
    } else {
      console.log('❌ Connessione Google Sheets fallita');
      return false;
    }
  } catch (error) {
    console.error('❌ Test connessione fallito:', error);
    return false;
  }
}