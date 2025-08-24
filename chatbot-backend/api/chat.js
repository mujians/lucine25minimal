// Vercel Serverless Function - /api/chat.js
// Questo file va nella cartella api/ del tuo progetto Vercel
// Updated to fix env vars

export default async function handler(req, res) {
  // CORS headers per permettere chiamate dal tuo sito
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', 'https://lucinedinatale.it');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Solo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Context del bot
  const BOT_CONTEXT = `Sei l'assistente virtuale delle Lucine di Natale di Leggiuno. Rispondi in modo cordiale e conciso.

INFORMAZIONI EVENTO:
- Date: Dal 5 dicembre 2024 al 6 gennaio 2025
- Chiusure: 24 e 31 dicembre
- Orari: Tutti i giorni 17:30-23:00 (ultimo ingresso 22:30)
- Luogo: Leggiuno, Lago Maggiore (Varese)

BIGLIETTI:
- Adulti: €15
- Bambini (3-12): €10
- Famiglia (2+2): €40
- Under 3: Gratis
- SALTAFILA: Accesso prioritario nella fascia oraria scelta
- OPEN: Ingresso con data/ora libera + accesso prioritario sempre
- Acquisto online consigliato per prezzo agevolato

PARCHEGGI:
- P1 Campo Sportivo: Auto + Camper, 10 min a piedi
- P2 Manifattura: Auto + Navetta gratuita
- P3 Chiesa S.Stefano: Auto + Disabili, 2 min a piedi
- P4 Scuole medie: Auto + Navetta + Camper
- P5 S.Caterina: Auto + Navetta + Camper + Bus turistici

NAVETTA: Gratuita, operativa 16:30-22:30, ogni 15 minuti, serve P2/P4/P5

SERVIZI:
- Percorso accessibile per carrozzine/passeggini
- Animali ammessi (al guinzaglio, museruola per taglie grandi)
- Mercatini e stand gastronomici
- Casa illuminata ad accesso libero

INFO: info@lucinedinatale.it`;

  try {
    // Debug delle variabili d'ambiente
    console.log('Available env vars:', Object.keys(process.env));
    console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not found in environment variables');
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` // Sicuro nelle env vars!
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: BOT_CONTEXT
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 200,
        temperature: 0.7
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    const botReply = data.choices[0].message.content;
    
    return res.status(200).json({ reply: botReply });

  } catch (error) {
    console.error('OpenAI API Error:', error);
    return res.status(500).json({ 
      error: 'Si è verificato un errore. Riprova più tardi.' 
    });
  }
}