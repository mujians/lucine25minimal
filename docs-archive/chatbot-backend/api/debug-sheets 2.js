// Debug endpoint per Google Sheets con errori dettagliati
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Controlla variabili ambiente
    const config = {
      GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID || 'NOT_SET',
      GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'NOT_SET',
      GOOGLE_PRIVATE_KEY_LENGTH: process.env.GOOGLE_PRIVATE_KEY?.length || 0,
      GOOGLE_PRIVATE_KEY_START: process.env.GOOGLE_PRIVATE_KEY?.substring(0, 50) || 'NOT_SET'
    };

    console.log('=== DEBUG GOOGLE SHEETS ===');
    console.log('Sheet ID:', config.GOOGLE_SHEET_ID);
    console.log('Service Account:', config.GOOGLE_SERVICE_ACCOUNT_EMAIL);
    console.log('Private Key Length:', config.GOOGLE_PRIVATE_KEY_LENGTH);
    console.log('Private Key Start:', config.GOOGLE_PRIVATE_KEY_START);

    // Test import delle librerie
    let googleSpreadsheet, JWT;
    try {
      const { GoogleSpreadsheet } = await import('google-spreadsheet');
      const { JWT: JWTClass } = await import('google-auth-library');
      googleSpreadsheet = GoogleSpreadsheet;
      JWT = JWTClass;
      console.log('✅ Librerie Google importate correttamente');
    } catch (importError) {
      console.error('❌ Errore import librerie:', importError);
      return res.status(500).json({
        error: 'Import error',
        details: importError.message,
        config
      });
    }

    // Test autenticazione
    let serviceAccountAuth;
    try {
      serviceAccountAuth = new JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY
          ?.replace(/^"/, '')  // Rimuovi virgoletta iniziale
          ?.replace(/"$/, '')  // Rimuovi virgoletta finale
          ?.replace(/\\\\n/g, '\n')  // Converti \\n
          ?.replace(/\\n/g, '\n'),   // Converti \n
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      console.log('✅ Service Account Auth creato');
    } catch (authError) {
      console.error('❌ Errore creazione auth:', authError);
      return res.status(500).json({
        error: 'Auth creation error',
        details: authError.message,
        config
      });
    }

    // Test connessione al sheet
    let doc;
    try {
      doc = new googleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
      await doc.loadInfo();
      console.log('✅ Documento caricato:', doc.title);
    } catch (docError) {
      console.error('❌ Errore caricamento documento:', docError);
      return res.status(500).json({
        error: 'Document load error',
        details: docError.message,
        config
      });
    }

    // Test accesso al foglio
    let sheet;
    try {
      sheet = doc.sheetsByTitle['Conversazioni'];
      if (!sheet) {
        console.log('⚠️ Foglio Conversazioni non trovato, creating...');
        sheet = await doc.addSheet({ 
          title: 'Conversazioni',
          headerValues: [
            'timestamp', 'session_id', 'user_message', 'bot_reply', 'user_ip',
            'smart_actions', 'response_time_ms', 'intent_detected', 'whatsapp_user', 'user_agent'
          ]
        });
        console.log('✅ Foglio Conversazioni creato');
      } else {
        await sheet.loadHeaderRow();
        console.log('✅ Foglio Conversazioni trovato, headers:', sheet.headerValues);
      }
    } catch (sheetError) {
      console.error('❌ Errore accesso foglio:', sheetError);
      return res.status(500).json({
        error: 'Sheet access error',
        details: sheetError.message,
        config
      });
    }

    // Test scrittura
    try {
      const testRow = {
        timestamp: new Date().toISOString(),
        session_id: 'debug-test-' + Date.now(),
        user_message: 'Test debug message',
        bot_reply: 'Test debug reply',
        user_ip: 'debug-ip',
        smart_actions: '[]',
        response_time_ms: 1000,
        intent_detected: 'debug_test',
        whatsapp_user: 'NO',
        user_agent: 'Debug Agent'
      };

      await sheet.addRow(testRow);
      console.log('✅ Riga di test aggiunta con successo');

      return res.status(200).json({
        success: true,
        message: 'Google Sheets funziona correttamente!',
        debug: {
          doc_title: doc.title,
          sheet_name: sheet.title,
          sheet_rows: sheet.rowCount,
          headers: sheet.headerValues,
          test_row_added: true
        },
        config
      });

    } catch (writeError) {
      console.error('❌ Errore scrittura:', writeError);
      return res.status(500).json({
        error: 'Write error',
        details: writeError.message,
        config
      });
    }

  } catch (error) {
    console.error('❌ Errore generale:', error);
    return res.status(500).json({
      error: 'General error',
      details: error.message,
      stack: error.stack
    });
  }
}