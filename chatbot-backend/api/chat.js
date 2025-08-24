export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message required' });
  }

  // Test immediato della variabile
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('OPENAI_API_KEY is undefined');
    console.error('Available env vars:', Object.keys(process.env));
    return res.status(500).json({ error: 'API key not configured' });
  }

  const context = `Sei l'assistente delle Lucine di Natale di Leggiuno. Rispondi brevemente.

Date: 5 dic 2024 - 6 gen 2025
Orari: 17:30-23:00 (chiuso 24 e 31 dic)
Biglietti: Adulti €15, Bambini €10, Famiglia €40
Parcheggi: P1-P5 con navetta gratuita
Info: info@lucinedinatale.it`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: context },
          { role: 'user', content: message }
        ],
        max_tokens: 150,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;
    
    return res.json({ reply });

  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ error: 'Service temporarily unavailable' });
  }
}