# 🚀 **WhatsApp Business Setup Completo**

## **1. Setup Twilio WhatsApp (5 minuti)**

### **Sandbox Mode (GRATIS per test):**
1. **Registrati**: https://console.twilio.com
2. **Console** → **Develop** → **Messaging** → **Try it out** → **Send a WhatsApp message**
3. **Copia credenziali**:
   - Account SID: `ACxxxxxxxxxxxx`
   - Auth Token: `xxxxxxxxxx` 
   - WhatsApp Number: `whatsapp:+14155238886`

### **Aggiunta variabili Vercel:**
```bash
# Nel progetto Vercel
vercel env add TWILIO_ACCOUNT_SID
vercel env add TWILIO_AUTH_TOKEN  
vercel env add TWILIO_WHATSAPP_NUMBER
```

## **2. Test Rapido (2 minuti)**

### **A) Attiva WhatsApp Sandbox:**
1. Invia **"join <sandbox-word>"** a `+1 415 523 8886`
2. Esempio: `join despite-thumb` 
3. Ricevi conferma: "You are now opted in"

### **B) Test dal chatbot:**
1. Vai su: `lucinedinatale.it?chatbot=test`
2. Scrivi: **"voglio notifiche whatsapp"**
3. Inserisci numero: **"+39 123 456 7890"**
4. Dovresti ricevere messaggio WhatsApp di benvenuto!

## **3. Funzionalità Implementate**

### **✅ Raccolta Numero:**
- Chatbot rileva richieste WhatsApp
- Validazione formato italiano
- Storage sicuro in JSON

### **✅ Notifiche Automatiche:**
- 🌟 **Benvenuto** quando si registra
- 🛒 **Carrello aggiunto** per prenotazioni
- 🎫 **Ticket creato** per supporto
- 👋 **Operatore assegnato** per chat live
- ⏰ **Promemoria evento** pre-visita

### **✅ Chat Bidirezionale:**
- Cliente risponde su WhatsApp
- Messaggio arriva al ticket system
- Operatore risponde dal pannello web
- Risposta automatica su WhatsApp

### **✅ Templates Pronti:**
- `welcome` - Benvenuto nuovo utente
- `cart_added` - Biglietti aggiunti carrello
- `booking_confirmed` - Prenotazione confermata
- `ticket_created` - Nuovo ticket supporto
- `reminder` - Promemoria evento
- `payment_reminder` - Carrello in scadenza

## **4. Comandi Chat Supportati**

### **Chatbot riconosce:**
- "voglio notifiche whatsapp"
- "attiva whatsapp"
- "aggiornamenti evento"
- "+39 123 456 7890" (inserimento numero)
- "STOP WhatsApp" (disattivazione)

### **Trigger automatici:**
- Aggiunta carrello → notifica WhatsApp
- Creazione ticket → notifica WhatsApp  
- Assegnazione operatore → notifica WhatsApp

## **5. Upgrade a Produzione**

### **Twilio Production:**
1. **Verifica Business**: Documento aziendale + 24-48h
2. **WhatsApp Business Profile**: Logo + descrizione
3. **Template Approval**: Messaggi pre-approvati da Meta
4. **Costi**: €0.03-0.15 per messaggio

### **Alternative Economiche:**
- **ChatAPI**: €20/mese unlimited
- **SendPulse**: €15/mese 1000 contatti  
- **MessageBird**: Pay-per-use

## **6. Analytics & Monitoring**

### **Endpoint Stats:**
```
GET /api/whatsapp-stats
```

### **Metriche disponibili:**
- Utenti WhatsApp totali/attivi
- Messaggi inviati/ricevuti
- Tasso apertura notifiche
- Conversioni carrello

## **7. Sicurezza & Privacy**

### **GDPR Compliance:**
- ✅ Consenso esplicito per WhatsApp
- ✅ Opt-out con "STOP WhatsApp"  
- ✅ Storage locale (no cloud terzi)
- ✅ Retention policy configurable

### **Rate Limiting:**
- Max 10 messaggi/minuto per utente
- Blocco automatico spam
- Whitelist numeri operatori

## **8. Troubleshooting**

### **Messaggi non arrivano:**
1. Verifica sandbox attivo
2. Controlla numero formato `+39xxxxxxxxxx`
3. Verifica credenziali Twilio
4. Check logs Vercel

### **Webhook non funziona:**
1. Twilio Console → Messaging → Settings
2. Webhook URL: `https://your-app.vercel.app/api/whatsapp`
3. HTTP POST method
4. Test webhook con Twilio debugger

## **🎯 Quick Start Commands**

```bash
# Deploy con WhatsApp
cd chatbot-backend
vercel env add TWILIO_ACCOUNT_SID
vercel env add TWILIO_AUTH_TOKEN
vercel --prod

# Test locale
npm install twilio
node -e "console.log('WhatsApp ready!')"
```

**Sistema pronto! WhatsApp Business integrato al 100%** 🚀