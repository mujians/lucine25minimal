// Endpoint per testare connessione Google Sheets
import { testSheetsConnection, logConversation } from '../utils/sheets-logger.js';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // Test connessione
      const isConnected = await testSheetsConnection();
      
      return res.status(200).json({
        success: isConnected,
        message: isConnected ? 'Connessione Google Sheets OK' : 'Connessione Google Sheets fallita',
        config: {
          sheet_id_configured: !!process.env.GOOGLE_SHEET_ID,
          service_account_configured: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key_configured: !!process.env.GOOGLE_PRIVATE_KEY
        }
      });
    }
    
    if (req.method === 'POST') {
      // Test log conversazione
      const testResult = await logConversation({
        sessionId: 'test-session-' + Date.now(),
        userMessage: 'Test messaggio utente',
        botReply: 'Test risposta bot per verificare il logging su Google Sheets',
        userIP: req.headers['x-forwarded-for'] || 'test-ip',
        smartActions: [
          { type: 'primary', text: 'Test Action', icon: '🧪' }
        ],
        responseTime: 1500,
        intentDetected: 'test_intent',
        whatsappUser: false,
        userAgent: 'Test User Agent'
      });

      return res.status(200).json({
        success: testResult,
        message: testResult ? 'Test conversazione salvata su Google Sheets' : 'Errore salvataggio test',
        timestamp: new Date().toISOString()
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Errore test Google Sheets:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      config: {
        sheet_id_configured: !!process.env.GOOGLE_SHEET_ID,
        service_account_configured: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key_configured: !!process.env.GOOGLE_PRIVATE_KEY
      }
    });
  }
}