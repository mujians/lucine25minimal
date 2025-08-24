import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Salva le conversazioni in un file JSON temporaneo (per Vercel)
// In produzione si userebbe un database come PostgreSQL

const LOGS_FILE = '/tmp/chatbot_logs.json';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'POST') {
      // Salva nuova conversazione
      const { sessionId, userMessage, botReply, timestamp, userAgent, ip } = req.body;
      
      const logEntry = {
        sessionId: sessionId || generateSessionId(),
        timestamp: timestamp || new Date().toISOString(),
        userMessage,
        botReply,
        userAgent: userAgent || req.headers['user-agent'],
        ip: ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress
      };

      // Leggi logs esistenti
      let logs = [];
      if (existsSync(LOGS_FILE)) {
        try {
          const data = readFileSync(LOGS_FILE, 'utf8');
          logs = JSON.parse(data);
        } catch (e) {
          console.error('Error reading logs:', e);
        }
      }

      // Aggiungi nuovo log
      logs.push(logEntry);

      // Mantieni solo gli ultimi 1000 log per non riempire il disco
      if (logs.length > 1000) {
        logs = logs.slice(-1000);
      }

      // Salva
      writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2));

      return res.json({ success: true, sessionId: logEntry.sessionId });

    } else if (req.method === 'GET') {
      // Visualizza logs (solo per admin)
      const adminToken = req.headers.authorization;
      
      if (adminToken !== `Bearer ${process.env.ADMIN_TOKEN}`) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      let logs = [];
      if (existsSync(LOGS_FILE)) {
        try {
          const data = readFileSync(LOGS_FILE, 'utf8');
          logs = JSON.parse(data);
        } catch (e) {
          console.error('Error reading logs:', e);
        }
      }

      // Statistiche
      const stats = {
        totalConversations: logs.length,
        uniqueSessions: [...new Set(logs.map(l => l.sessionId))].length,
        lastWeek: logs.filter(l => 
          new Date(l.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ).length,
        topQuestions: getTopQuestions(logs)
      };

      return res.json({ logs: logs.slice(-50), stats }); // Ultimi 50 per performance

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Logs API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function generateSessionId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
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
    .slice(0, 10)
    .map(([question, count]) => ({ question, count }));
}