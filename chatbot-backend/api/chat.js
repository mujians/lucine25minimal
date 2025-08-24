import OpenAI from "openai";

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

  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is missing');
      console.error('Available env vars:', Object.keys(process.env));
      return res.status(500).json({
        error: "Missing OPENAI_API_KEY on server. Set it in Vercel → Project Settings → Environment Variables."
      });
    }

    const { message } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Invalid payload: 'message' is required." });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const context = `Sei l'assistente virtuale delle Lucine di Natale di Leggiuno. Rispondi in modo cordiale e conciso.

INFORMAZIONI EVENTO:
- Date: Dal 5 dicembre 2024 al 6 gennaio 2025
- Chiusure: 24 e 31 dicembre
- Orari: Tutti i giorni 17:30-23:00 (ultimo ingresso 22:30)
- Luogo: Leggiuno, Lago Maggiore (Varese)

BIGLIETTI:
- Adulti: €15, Bambini (3-12): €10, Famiglia (2+2): €40, Under 3: Gratis
- SALTAFILA: Accesso prioritario nella fascia oraria scelta
- OPEN: Ingresso con data/ora libera + accesso prioritario sempre
- Acquisto online consigliato per prezzo agevolato

PARCHEGGI:
- P1-P5 con navetta gratuita (16:30-22:30, ogni 15 min)
- P3 ha area dedicata disabili

SERVIZI:
- Percorso accessibile carrozzine/passeggini
- Animali ammessi (guinzaglio, museruola taglie grandi)
- Mercatini e stand gastronomici

INFO: info@lucinedinatale.it`;

    const resp = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: context },
        { role: "user", content: message }
      ],
      max_tokens: 200,
      temperature: 0.3
    });

    const reply = resp?.choices?.[0]?.message?.content?.trim() ||
      "Mi dispiace, non ho una risposta per questa domanda.";

    return res.status(200).json({ reply });

  } catch (err) {
    console.error("OpenAI API Error:", err);
    return res.status(500).json({ error: "Si è verificato un errore. Riprova più tardi." });
  }
}