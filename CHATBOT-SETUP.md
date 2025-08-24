# Chatbot OpenAI - Lucine di Natale
## Documentazione Tecnica Completa

### 🏗️ ARCHITETTURA SISTEMA

**Frontend**: Integrato nella pagina FAQ di Shopify
**Backend**: Serverless su Vercel (Node.js)
**AI**: OpenAI GPT-3.5-turbo
**Logging**: Console-based (Vercel Dashboard)

---

### 📁 STRUTTURA FILE

```
chatbot-backend/
├── api/
│   ├── chat.js          # Endpoint principale chatbot
│   └── admin.js         # Panel amministrazione
├── data/
│   └── knowledge-base.json  # Database conoscenze strutturato
└── package.json         # Dipendenze Node.js
```

**Frontend**: `/Users/brnobtt/Desktop/lucine-minimal/faq-page-code.html`

---

### 🔗 URL E ACCESSI

**Backend Attivo**: `https://chatbot-backend-oxw60jhy4-brunos-projects-075c84f2.vercel.app`

**Endpoint API**:
- Chat: `/api/chat` (POST)
- Admin: `/api/admin?password=lucine2024` (GET)

**Admin Panel**: 
```
https://chatbot-backend-oxw60jhy4-brunos-projects-075c84f2.vercel.app/api/admin?password=lucine2024
```

**Dashboard Vercel**: 
- Account: brunos-projects-075c84f2
- Progetto: chatbot-backend
- URL: https://vercel.com/dashboard

---

### 🔐 CREDENZIALI E CONFIGURAZIONE

**Vercel Environment Variables**:
- `OPENAI_API_KEY`: Chiave API OpenAI (configurata)
- Password admin panel: `lucine2024`

**Rate Limiting**: 10 richieste/minuto per IP

---

### 📊 COME VISUALIZZARE I LOG

Il sistema usa **logging semplificato via console.log**.

**Accesso ai Log**:
1. Vai su https://vercel.com/dashboard
2. Seleziona progetto "chatbot-backend" 
3. Sezione "Functions" → "api/chat.js"
4. Clicca "View Function Logs"

**Formato Log**:
```
=== CHAT LOG ===
Time: 2024-01-15T10:30:00.000Z
Session: abc123
User: Quanto costano i biglietti?
Bot: I biglietti costano €15 per adulti...
IP: 93.45.123.45
================
```

---

### ⚙️ FUNZIONALITÀ IMPLEMENTATE

**✅ Core Features**:
- OpenAI GPT-3.5-turbo integration
- Knowledge base strutturata (JSON)
- Rate limiting anti-spam
- Session tracking
- Suggestion system (domande correlate)

**✅ Smart Features**:
- Escape routes automatiche (email/WhatsApp)
- Low-confidence detection
- Contextual suggestions
- CORS configurato per lucinedinatale.it

**✅ Admin Features**:
- Console logging (tempo reale)
- Panel amministrazione semplificato
- Istruzioni accesso log integrate

---

### 🧠 KNOWLEDGE BASE

**File**: `/Users/brnobtt/Desktop/lucine-minimal/chatbot-backend/data/knowledge-base.json`

**Struttura**:
```json
{
  "event": { "dates", "hours", "location" },
  "tickets": { "prices", "types", "discounts" },
  "parking": { "lots", "shuttle" },
  "services": { "accessibility", "pets", "food" },
  "faq": { "common" },
  "contact": { "email", "whatsapp" },
  "escape_routes": { "no_answer", "error" }
}
```

**Contatti Auto-Escalation**:
- Email: info@lucinedinatale.it
- WhatsApp: +393123456789

---

### 🚀 DEPLOYMENT E TEST

**Deploy Command**:
```bash
cd /Users/brnobtt/Desktop/lucine-minimal/chatbot-backend
npx vercel --prod
```

**Test API**:
```bash
curl -X POST https://chatbot-backend-oxw60jhy4-brunos-projects-075c84f2.vercel.app/api/chat \
-H "Content-Type: application/json" \
-d '{"message": "Quanto costano i biglietti?", "sessionId": "test123"}'
```

**Risposta Attesa**:
```json
{
  "reply": "I biglietti per le Lucine di Natale...",
  "suggestions": ["Dove posso parcheggiare?", "Quali sono gli orari?"],
  "sessionId": "test123"
}
```

---

### 💻 INTEGRAZIONE FRONTEND

**File**: `/Users/brnobtt/Desktop/lucine-minimal/faq-page-code.html`

**URL Backend Configurato**:
```javascript
const BACKEND_URL = 'https://chatbot-backend-oxw60jhy4-brunos-projects-075c84f2.vercel.app/api/chat';
```

**Features Frontend**:
- Session management
- Suggestion buttons
- WhatsApp link integration
- Error handling con fallback
- Responsive design
- Loading states

---

### 🔧 TROUBLESHOOTING

**Problemi Comuni**:

1. **CORS Error**: 
   - Verificare origin in `chat.js` linea 12
   - Attualmente: `Access-Control-Allow-Origin: *`

2. **OpenAI API Error**:
   - Verificare `OPENAI_API_KEY` in Vercel dashboard
   - Controllare quota OpenAI

3. **Rate Limiting**:
   - Max 10 req/min per IP
   - Reset automatico ogni minuto

4. **Log Non Visibili**:
   - Usare solo Vercel dashboard console
   - NON cercare file di log (sistema semplificato)

---

### 📱 TESTING SCENARIOS

**Test Domande Standard**:
- "Quanto costano i biglietti?"
- "Dove posso parcheggiare?"
- "Quali sono gli orari?"
- "Posso portare animali?"

**Test Escape Routes**:
- Domande complesse fuori knowledge base
- Rate limiting (>10 richieste/minuto)
- Errori API

**Test Suggestions**:
- Dopo domanda biglietti → suggerisce parcheggi/orari
- Dopo domanda parcheggi → suggerisce prezzi/accessibilità

---

### 🎯 STATO ATTUALE

**✅ COMPLETATO**:
- Sistema logging semplificato
- Deploy backend Vercel  
- Frontend aggiornato con nuovo URL
- Admin panel ristrutturato
- Knowledge base completa
- Rate limiting attivo
- Escape routes configurate

**Sistema OPERATIVO e PRONTO per produzione**.

---

### 📞 SUPPORTO

**Se il chatbot non funziona**:
1. Verificare URL backend in faq-page-code.html
2. Controllare logs Vercel dashboard
3. Testare API con curl
4. Verificare environment variables Vercel

**Per modifiche knowledge base**:
Editare `/Users/brnobtt/Desktop/lucine-minimal/chatbot-backend/data/knowledge-base.json` e ri-deployare.

---

*Ultima modifica: 2024-01-15 - Sistema logging semplificato implementato*