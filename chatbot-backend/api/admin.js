import { readFileSync, existsSync } from 'fs';

export default async function handler(req, res) {
  // Simple admin page for viewing logs
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  
  if (req.method !== 'GET') {
    return res.status(405).send('Method not allowed');
  }

  // Simple password check via URL parameter (for testing)
  const { password } = req.query;
  if (password !== 'lucine2024') {
    return res.send(`
      <html>
        <head><title>Admin - Chatbot Logs</title></head>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h1>🔒 Admin Access</h1>
          <p>Inserisci la password:</p>
          <form method="GET">
            <input type="password" name="password" placeholder="Password" required>
            <button type="submit">Accedi</button>
          </form>
        </body>
      </html>
    `);
  }

  // Load logs
  const LOGS_FILE = '/tmp/chatbot_logs.json';
  let logs = [];
  let stats = {};

  if (existsSync(LOGS_FILE)) {
    try {
      const data = readFileSync(LOGS_FILE, 'utf8');
      logs = JSON.parse(data);
      
      // Calculate stats
      stats = {
        totalConversations: logs.length,
        uniqueSessions: [...new Set(logs.map(l => l.sessionId))].length,
        lastHour: logs.filter(l => 
          new Date(l.timestamp) > new Date(Date.now() - 60 * 60 * 1000)
        ).length,
        topQuestions: getTopQuestions(logs).slice(0, 5)
      };
    } catch (e) {
      console.error('Error reading logs:', e);
    }
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
        .container { max-width: 1200px; margin: 0 auto; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .stat-card h3 { margin: 0; color: #333; }
        .stat-card .number { font-size: 2rem; font-weight: bold; color: #007bff; margin: 10px 0; }
        .logs { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .log-header { background: #007bff; color: white; padding: 15px; font-weight: bold; }
        .log-item { padding: 15px; border-bottom: 1px solid #eee; }
        .log-item:last-child { border-bottom: none; }
        .user-msg { background: #e3f2fd; padding: 8px 12px; border-radius: 15px; margin: 5px 0; display: inline-block; }
        .bot-msg { background: #f1f8e9; padding: 8px 12px; border-radius: 15px; margin: 5px 0; display: inline-block; }
        .timestamp { color: #666; font-size: 0.9em; }
        .session-id { color: #999; font-family: monospace; font-size: 0.8em; }
        .top-questions li { margin: 5px 0; }
        .refresh-btn { background: #28a745; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin-bottom: 20px; }
        .refresh-btn:hover { background: #218838; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📊 Chatbot Analytics - Lucine di Natale</h1>
        
        <button class="refresh-btn" onclick="location.reload()">🔄 Aggiorna</button>
        
        <div class="stats">
          <div class="stat-card">
            <h3>💬 Conversazioni Totali</h3>
            <div class="number">${stats.totalConversations || 0}</div>
          </div>
          <div class="stat-card">
            <h3>👥 Sessioni Uniche</h3>
            <div class="number">${stats.uniqueSessions || 0}</div>
          </div>
          <div class="stat-card">
            <h3>⏰ Ultima Ora</h3>
            <div class="number">${stats.lastHour || 0}</div>
          </div>
          <div class="stat-card">
            <h3>🔥 Top Domande</h3>
            <ol class="top-questions">
              ${stats.topQuestions?.map(q => `<li>${q.question} (${q.count})</li>`).join('') || '<li>Nessuna domanda ancora</li>'}
            </ol>
          </div>
        </div>

        <div class="logs">
          <div class="log-header">
            📝 Ultime ${Math.min(logs.length, 20)} Conversazioni
          </div>
          ${logs.slice(-20).reverse().map(log => `
            <div class="log-item">
              <div class="timestamp">${new Date(log.timestamp).toLocaleString('it-IT')}</div>
              <div class="session-id">Session: ${log.sessionId}</div>
              <div style="margin: 10px 0;">
                <div class="user-msg"><strong>User:</strong> ${escapeHtml(log.userMessage)}</div>
                <div class="bot-msg"><strong>Bot:</strong> ${escapeHtml(log.botReply).replace(/\\n\\n/g, '<br>')}</div>
              </div>
              ${log.ip ? `<div class="session-id">IP: ${log.ip}</div>` : ''}
            </div>
          `).join('')}
        </div>
        
        ${logs.length === 0 ? '<p>Nessuna conversazione ancora. Il bot deve essere usato per generare log.</p>' : ''}
      </div>
    </body>
    </html>
  `;

  return res.send(html);
}

function getTopQuestions(logs) {
  const questions = {};
  logs.forEach(log => {
    const q = log.userMessage?.toLowerCase().trim();
    if (q && q.length > 3) {
      questions[q] = (questions[q] || 0) + 1;
    }
  });
  
  return Object.entries(questions)
    .sort(([,a], [,b]) => b - a)
    .map(([question, count]) => ({ question, count }));
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}