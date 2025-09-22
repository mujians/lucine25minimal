# 📊 GOOGLE SHEETS LOGGING - GUIDA SETUP

## 📋 PANORAMICA

Il sistema chatbot ora può salvare automaticamente tutte le conversazioni su Google Sheets per analisi e monitoraggio.

### 📈 DATI SALVATI

**Foglio "Conversazioni":**
- `timestamp` - Data e ora della conversazione
- `session_id` - ID univoco sessione utente
- `user_message` - Messaggio originale dell'utente
- `bot_reply` - Risposta del chatbot
- `user_ip` - Indirizzo IP dell'utente
- `smart_actions` - Azioni contestuali proposte (JSON)
- `response_time_ms` - Tempo di risposta in millisecondi
- `intent_detected` - Intent riconosciuto (acquisto, info, supporto, etc.)
- `whatsapp_user` - Se l'utente ha registrato WhatsApp
- `user_agent` - Browser/dispositivo utilizzato

**Foglio "Statistiche":**
- Statistiche giornaliere aggregate
- Conteggi per intent type
- Performance metrics

---

## 🚀 SETUP PASSO PASSO

### **1. Crea Google Sheet**

1. Vai su [Google Sheets](https://sheets.google.com)
2. Crea un nuovo foglio di lavoro
3. Rinomina il foglio in "**Lucine Chatbot Logs**"
4. Copia l'**ID del foglio** dall'URL:
   ```
   https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit
   ```

### **2. Crea Service Account**

1. Vai su [Google Cloud Console](https://console.cloud.google.com)
2. Crea un nuovo progetto o seleziona esistente
3. Vai a **APIs & Services > Credentials**
4. Clicca **+ CREATE CREDENTIALS > Service Account**
5. Compila:
   - **Name**: `lucine-chatbot-logger`
   - **Description**: `Service account per logging conversazioni chatbot`
6. Clicca **CREATE AND CONTINUE**
7. **Non assegnare ruoli** (facoltativo) → **CONTINUE**
8. Clicca **DONE**

### **3. Genera Chiave Service Account**

1. Nella lista **Service Accounts**, clicca sul service account creato
2. Vai su tab **KEYS**
3. Clicca **ADD KEY > Create new key**
4. Seleziona **JSON** → **CREATE**
5. **Scarica il file JSON** (mantienilo sicuro!)

### **4. Abilita Google Sheets API**

1. Nel Google Cloud Console, vai a **APIs & Services > Library**
2. Cerca "**Google Sheets API**"
3. Clicca su **Google Sheets API** → **ENABLE**

### **5. Configura Permessi Sheet**

1. Apri il Google Sheet creato al passo 1
2. Clicca **Share** (in alto a destra)
3. Aggiungi l'**email del service account** (dal file JSON: `client_email`)
4. Assegna permessi **Editor**
5. **Deseleziona** "Notify people" 
6. Clicca **Share**

### **6. Configura Variabili Ambiente**

Nel **Vercel Dashboard** del progetto `chatbot-backend`:

1. Vai su **Settings > Environment Variables**
2. Aggiungi queste 3 variabili:

```bash
# ID del Google Sheet (dall'URL)
GOOGLE_SHEET_ID=1AbC2DeF3GhI4JkL5MnO6PqR7StU8VwX9YzA

# Email service account (dal file JSON)
GOOGLE_SERVICE_ACCOUNT_EMAIL=lucine-chatbot-logger@your-project.iam.gserviceaccount.com

# Private key del service account (dal file JSON, con \n per newlines)
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7...\n-----END PRIVATE KEY-----"
```

**⚠️ IMPORTANTE per GOOGLE_PRIVATE_KEY:**
- Copia il valore `private_key` dal file JSON
- Sostituisci tutti i `\n` letterali con veri newline
- Racchiudi tutto tra virgolette doppie

### **7. Test Configurazione**

1. **Redeploy** il backend dopo aver configurato le variabili
2. Testa la connessione:
   ```bash
   curl https://your-backend-url.vercel.app/api/test-sheets
   ```
3. Dovrebbe rispondere:
   ```json
   {
     "success": true,
     "message": "Connessione Google Sheets OK",
     "config": {
       "sheet_id_configured": true,
       "service_account_configured": true,
       "private_key_configured": true
     }
   }
   ```

4. **Test conversazione:**
   ```bash
   curl -X POST https://your-backend-url.vercel.app/api/test-sheets
   ```

5. **Verifica nel Google Sheet**: Dovrebbe apparire una riga di test nel foglio "Conversazioni"

---

## 📊 UTILIZZO E MONITORAGGIO

### **Struttura Fogli Automatica**

Al primo utilizzo, il sistema creerà automaticamente:
- **Foglio "Conversazioni"** - Con headers predefiniti
- **Foglio "Statistiche"** - Per metriche aggregate

### **Intent Riconosciuti**

Il sistema classifica automaticamente le conversazioni:
- `acquisto_biglietti` - Richieste di acquisto/prenotazione
- `richiesta_prezzi` - Domande sui prezzi
- `info_logistiche` - Parcheggi, come arrivare
- `whatsapp_signup` - Registrazione notifiche
- `info_orari` - Orari di apertura
- `richiesta_supporto` - Escalation a operatore umano
- `domanda_generica` - Altro

### **Analytics Possibili**

Con i dati raccolti puoi analizzare:
- **Volume conversazioni** per giorno/ora
- **Intent più frequenti**
- **Performance** (response time)
- **Tasso di escalation** a supporto umano
- **Efficacia smart actions**
- **Utenti WhatsApp vs anonimi**

### **Privacy e GDPR**

- ✅ **IP anonimizzati** dopo 30 giorni (da implementare)
- ✅ **Dati minimi necessari** per analytics
- ✅ **Accesso limitato** al Google Sheet
- ⚠️ **Implementare retention policy** (cancellazione dati vecchi)

---

## 🔧 TROUBLESHOOTING

### **Errore: "Authentication failed"**
- Verifica che la `GOOGLE_PRIVATE_KEY` sia formattata correttamente
- Controlla che il service account abbia accesso al sheet

### **Errore: "Sheet not found"**
- Verifica il `GOOGLE_SHEET_ID` nell'URL
- Controlla i permessi del service account sul sheet

### **Nessuna riga creata**
- Controlla i log Vercel per errori specifici
- Testa con `/api/test-sheets`

### **Performance lenta**
- Il logging è asincrono e non blocca le risposte
- Se troppo lento, considera logging locale + sync periodico

---

## 📝 MANUTENZIONE

### **Backup Dati**
- **Export automatico** del Google Sheet (File > Download)
- **Frequenza consigliata**: settimanale

### **Pulizia Dati**
- **Implementare retention**: 90 giorni per conversazioni
- **Conservare statistiche**: aggregate permanenti

### **Monitoraggio**
- **Alerts** per errori logging
- **Dashboard** con metriche chiave
- **Review mensile** dei pattern conversazioni

---

## 🎯 PROSSIMI STEP

1. **✅ Implementazione base completata**
2. **⏳ Configurazione Google Account**
3. **⏳ Test e validazione**
4. **📊 Dashboard analytics avanzato**
5. **🔄 Retention policy automatica**
6. **📈 Grafici e insights automatici**

---

*Documento aggiornato: 22 Settembre 2025*