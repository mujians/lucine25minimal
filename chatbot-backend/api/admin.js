export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  
  if (req.method !== 'GET') {
    return res.status(405).send('Method not allowed');
  }

  // Simple password check
  const { password } = req.query;
  if (password !== 'lucine2024') {
    return res.send(`
      <html>
        <head><title>Admin - Chatbot Manager</title></head>
        <body style="font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5;">
          <div style="max-width: 400px; margin: 50px auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="text-align: center; color: #333;">🔒 Admin Access</h1>
            <form method="GET" style="text-align: center;">
              <input type="password" name="password" placeholder="Password" required style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 15px;">
              <button type="submit" style="width: 100%; padding: 12px; background: #007bff; color: white; border: none; border-radius: 5px; font-size: 16px; cursor: pointer;">Accedi</button>
            </form>
          </div>
        </body>
      </html>
    `);
  }

  // Generate HTML
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Admin - Chatbot Logs</title>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; }
        .info-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .info-card h3 { margin: 0 0 15px 0; color: #333; }
        .status { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 12px; border-radius: 5px; margin: 10px 0; }
        .instruction { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 12px; border-radius: 5px; margin: 10px 0; }
        .code { background: #f8f9fa; border: 1px solid #e9ecef; padding: 8px 12px; border-radius: 4px; font-family: monospace; font-size: 0.9em; }
        .refresh-btn { background: #28a745; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin-bottom: 20px; }
        .refresh-btn:hover { background: #218838; }
        a { color: #007bff; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📊 Chatbot Admin - Lucine di Natale</h1>
        
        <button class="refresh-btn" onclick="location.reload()">🔄 Aggiorna Pagina</button>
        
        <div class="info-card">
          <h3>✅ Sistema di Logging Semplificato</h3>
          <div class="status">
            <strong>Status:</strong> Il chatbot ora usa un sistema di logging semplificato tramite console.log
          </div>
          
          <div class="instruction">
            <strong>Come visualizzare i log:</strong><br>
            1. Vai su <a href="https://vercel.com/dashboard" target="_blank">Vercel Dashboard</a><br>
            2. Seleziona il progetto "chatbot-backend"<br>
            3. Vai nella sezione "Functions" → "api/chat.js"<br>
            4. Clicca su "View Function Logs" per vedere tutti i log in tempo reale
          </div>
          
          <p><strong>Formato dei log:</strong></p>
          <div class="code">
=== CHAT LOG ===<br>
Time: 2024-01-15T10:30:00.000Z<br>
Session: abc123<br>
User: Quanto costano i biglietti?<br>
Bot: I biglietti costano €15 per adulti...<br>
IP: 93.45.123.45<br>
================
          </div>
        </div>

        <div class="info-card">
          <h3>🔗 Link Utili</h3>
          <ul>
            <li><a href="https://vercel.com/dashboard" target="_blank">Vercel Dashboard</a> - Per visualizzare i log</li>
            <li><a href="https://lucinedinatale.it/pages/faq" target="_blank">FAQ Page</a> - Chatbot in azione</li>
            <li>Password admin: <code class="code">lucine2024</code></li>
          </ul>
        </div>

        <div class="info-card">
          <h3>⚙️ Configurazione Attuale</h3>
          <p><strong>✅ OpenAI API:</strong> Configurata</p>
          <p><strong>✅ Knowledge Base:</strong> Caricata</p>
          <p><strong>✅ Rate Limiting:</strong> 10 richieste/minuto per IP</p>
          <p><strong>✅ Escape Routes:</strong> Email e WhatsApp automatici</p>
          <p><strong>✅ Logging:</strong> Console-based (Vercel Dashboard)</p>
        </div>
        
        <div class="info-card">
          <h3>💡 Come Funziona</h3>
          <p>Il chatbot ora logga tutte le conversazioni direttamente nella console di Vercel. Ogni volta che qualcuno usa il chatbot, vedrai un log strutturato con:</p>
          <ul>
            <li>Timestamp della conversazione</li>
            <li>ID sessione unico</li>
            <li>Messaggio dell'utente</li>
            <li>Risposta del bot</li>
            <li>Indirizzo IP dell'utente</li>
          </ul>
          <p>Questo sistema è molto più semplice e affidabile del precedente sistema basato su file.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return res.send(html);
}