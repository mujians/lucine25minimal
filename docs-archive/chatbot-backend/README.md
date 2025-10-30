# Chatbot Backend Sicuro per Lucine di Natale

## 🚀 Setup in 5 minuti con Vercel (GRATIS)

### 1. Crea account Vercel
Vai su [vercel.com](https://vercel.com) e registrati con GitHub

### 2. Deploy del backend

#### Opzione A: Deploy con CLI (consigliato)
```bash
# Nella cartella chatbot-backend/
npm install -g vercel
vercel

# Segui i prompt:
# - Setup and deploy? Yes
# - Which scope? (seleziona il tuo account)
# - Link to existing project? No
# - Project name? lucine-chatbot (o quello che vuoi)
# - Directory? ./
# - Want to modify settings? No
```

#### Opzione B: Deploy con GitHub
1. Crea un nuovo repo GitHub con questi file
2. Vai su vercel.com → "New Project"
3. Importa il repo
4. Deploy automatico!

### 3. Aggiungi la API Key OpenAI
1. Vai su Vercel Dashboard → Il tuo progetto
2. Settings → Environment Variables
3. Aggiungi:
   - Name: `OPENAI_API_KEY`
   - Value: `sk-your-key-here` (la tua chiave OpenAI)
   - Environment: ✅ Production, ✅ Preview, ✅ Development
4. Clicca "Save"

### 4. Ottieni l'URL del tuo backend
Dopo il deploy, Vercel ti darà un URL tipo:
```
https://lucine-chatbot.vercel.app
```

### 5. Aggiorna il frontend
Nel file `faq-chatbot-secure.html`, cambia:
```javascript
const BACKEND_URL = 'https://lucine-chatbot.vercel.app/api/chat';
```

## ✅ Fatto! 

Il tuo chatbot è ora:
- **Sicuro**: API key nascosta nel backend
- **Veloce**: Edge functions di Vercel
- **Gratis**: 100GB bandwidth/mese free
- **Scalabile**: Gestisce migliaia di richieste

## 📝 Test locale (opzionale)

```bash
# Crea .env.local con la tua API key
echo "OPENAI_API_KEY=sk-your-key" > .env.local

# Avvia server locale
vercel dev

# Testa su http://localhost:3000/api/chat
```

## 🛠 Personalizzazione

Modifica `api/chat.js` per:
- Cambiare il context del bot
- Usare modelli diversi (gpt-4, etc)
- Aggiungere rate limiting
- Salvare conversazioni

## 🆘 Problemi?

- **CORS errors**: Già gestiti nel codice
- **500 errors**: Controlla che la API key sia corretta
- **Timeout**: Le funzioni Vercel hanno max 10 secondi (più che sufficienti)

## 💰 Costi

- **Vercel**: GRATIS fino a 100GB bandwidth/mese
- **OpenAI**: ~$0.002 per domanda con gpt-3.5-turbo

Per 1000 domande al mese = ~$2