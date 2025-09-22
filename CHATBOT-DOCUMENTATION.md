# 📚 DOCUMENTAZIONE CHATBOT LUCINE DI NATALE
> Ultimo aggiornamento: 22 Settembre 2025

## 📊 PANORAMICA SISTEMA

### Architettura
```
┌─────────────────┐     API REST      ┌──────────────────┐
│                 │ ◄────────────────► │                  │
│  Frontend       │                    │  Backend         │
│  (Shopify)      │                    │  (Vercel)        │
│                 │                    │                  │
└─────────────────┘                    └──────────────────┘
        │                                       │
        │                                       ├── OpenAI API
        └── User Interface                     ├── Knowledge Base
                                               └── WhatsApp API
```

### Componenti Principali
| Componente | File | Descrizione | Stato |
|------------|------|-------------|--------|
| Frontend UI | `/snippets/chatbot-popup.liquid` | Interfaccia utente chatbot | ✅ Attivo |
| Backend API | `/chatbot-backend/api/chat.js` | Logica elaborazione chat | ✅ Attivo |
| Knowledge Base | `/chatbot-backend/data/knowledge-base.json` | Database informazioni | ✅ Aggiornato |
| WhatsApp Integration | `/chatbot-backend/api/whatsapp.js` | API WhatsApp Business | ⚠️ Parziale |
| Ticket System | Integrato in `chat.js` | Creazione ticket supporto | ✅ Attivo |
| Operator Management | `/chatbot-backend/api/operators.js` | Gestione operatori e chat live | ✅ Attivo |
| Live Chat System | Integrato chat.js + operators.js | Chat real-time con operatori | ✅ Attivo |

### URL e Endpoint
- **Frontend**: `https://lucinedinatale.it/?chatbot=test`
- **Backend API**: `https://chatbot-backend-aicwwsgq5-brunos-projects-075c84f2.vercel.app/api/chat`
- **Operators API**: `https://chatbot-backend-aicwwsgq5-brunos-projects-075c84f2.vercel.app/api/operators`
- **Ticket System**: `https://magazzino-gep-backend.onrender.com/api/tickets`

---

## 🔧 FUNZIONALITÀ IMPLEMENTATE

### ✅ Completate
1. **Chat Base con AI**
   - OpenAI GPT-3.5-turbo
   - Context-aware responses
   - Rate limiting (10 msg/min)
   - Session management

2. **Smart Actions**
   - Pulsanti contestuali dinamici
   - Azioni: Prenota, Indicazioni, WhatsApp, Chiama
   - Icone e descrizioni

3. **Sistema Ticket**
   - Creazione automatica per domande senza risposta
   - Conferma utente richiesta
   - Integrazione con backend esterno

4. **Link Intelligence**
   - URL trasformati in pulsanti beauty
   - Stili differenziati per tipo link
   - Target="_blank" automatico

5. **Hybrid Support System**
   - Handover seamless AI → Operatore umano
   - Real-time messaging bidirezionale
   - Gestione code e sessioni multiple
   - Operator dashboard API completa

### ⚠️ Parzialmente Implementate
1. **WhatsApp Business**
   - Raccolta numeri ✅
   - Storage utenti ✅
   - Invio notifiche ❌ (manca Twilio)
   - Template messaggi ✅

2. **Real-time Info**
   - Fetch disponibilità biglietti ⚠️
   - Prezzi aggiornati ✅
   - Date disponibili ⚠️

### ❌ Da Implementare
1. **Analytics**
   - Tracking conversazioni
   - Metriche conversioni
   - Report domande frequenti

2. **Multi-lingua**
   - Supporto inglese/tedesco
   - Auto-detect lingua

---

## 🧪 SCENARI DI TEST

### Scenario 1: Richiesta Informazioni Base
**Input utente**: "Quanto costano i biglietti?"

**Flusso atteso**:
1. Utente scrive domanda
2. Backend processa con OpenAI
3. Risposta con prezzi da knowledge base
4. Smart action "Prenota Biglietti" appare
5. ~~Suggerimenti domande correlate~~ (RIMOSSO)

**Test tecnico**:
- [ ] API call a `/api/chat`
- [ ] Response time < 2s
- [ ] Knowledge base query corretta
- [ ] Smart actions generate
- [ ] Session ID mantenuto

**UX Check**:
- [ ] Risposta chiara e completa
- [ ] Prezzi corretti (€9/€7)
- [ ] Link prenota funzionante
- [ ] Font leggibile
- [ ] Nessun suggerimento esterno

---

### Scenario 2: Richiesta Prenotazione
**Input utente**: "Voglio prenotare per il 23 dicembre"

**Flusso atteso**:
1. Riconoscimento intent prenotazione
2. Verifica disponibilità data
3. Proposta link diretto calendario
4. Smart action per completare acquisto

**Test tecnico**:
- [ ] Parse data corretta
- [ ] Query real-time availability
- [ ] Cart API integration
- [ ] Session tracking

**UX Check**:
- [ ] Processo guidato chiaro
- [ ] Conferme esplicite
- [ ] Nessun acquisto automatico
- [ ] Link calendario funziona

---

### Scenario 3: Domanda Senza Risposta
**Input utente**: "Posso portare il mio drone?"

**Flusso atteso**:
1. AI non trova risposta precisa
2. Proposta contatto operatore
3. Richiesta conferma utente
4. Creazione ticket se confermato

**Test tecnico**:
- [ ] Fallback detection
- [ ] Confirmation flow
- [ ] Ticket API call
- [ ] Error handling

**UX Check**:
- [ ] Messaggio chiaro su limiti
- [ ] Opzioni alternative offerte
- [ ] Conferma prima di ticket
- [ ] Contatti forniti

---

### Scenario 4: Attivazione WhatsApp
**Input utente**: "Voglio ricevere notifiche su whatsapp"

**Flusso atteso**:
1. Richiesta numero telefono
2. Validazione formato
3. Storage numero
4. Conferma attivazione
5. (Futuro: invio messaggio benvenuto)

**Test tecnico**:
- [ ] Phone validation regex
- [ ] Storage in JSON file
- [ ] Privacy compliance
- [ ] Session association

**UX Check**:
- [ ] Istruzioni chiare
- [ ] Privacy notice
- [ ] Opt-out spiegato
- [ ] Conferma successo

---

### Scenario 5: Navigazione e Parcheggi
**Input utente**: "Come arrivo e dove parcheggio?"

**Flusso atteso**:
1. Risposta con indirizzo
2. Info parcheggi disponibili
3. Smart action "Indicazioni"
4. Link Google Maps

**Test tecnico**:
- [ ] Knowledge base query
- [ ] Maps link generation
- [ ] Location data accurate

**UX Check**:
- [ ] Info complete e chiare
- [ ] Distanze specificate
- [ ] Costi parcheggio inclusi
- [ ] Link maps funzionante

---

## ✅ PROBLEMI RISOLTI

### Fix Completati (22 Settembre 2025)
1. **✅ Suggerimenti esterni rimossi**
   - Backend non invia più `suggestions`
   - Frontend ripulito da codice suggestions
   
2. **✅ Font messaggi standard**
   - Applicato Arial/Helvetica con `!important`
   - Sovrascritte tutte le regole del tema

3. **✅ Contrasto colori migliorato**
   - Messaggi utente: verde su bianco
   - Messaggi bot: verde su bianco
   - Eliminato giallo su nero illeggibile

4. **✅ Intent acquisto migliorato**
   - "devo comprare i biglietti" ora funziona
   - Aggiunta automatica al carrello per date specifiche
   - Flow guidato per richieste generiche

5. **✅ Backend aggiornato**
   - URL: `https://chatbot-backend-qlgj4aiol-brunos-projects-075c84f2.vercel.app/api/chat`
   - Tutte le modifiche deployate

## 🐛 PROBLEMI NOTI

### Media Priorità

### Media Priorità
1. **WhatsApp non completo**
   - Manca configurazione Twilio
   - Template pronti ma non usati

2. **Real-time info parziale**
   - Disponibilità date non verificata
   - Cache non implementata

### Bassa Priorità
1. **Analytics mancanti**
2. **Multi-lingua non implementato**
3. **Gestione errori migliorabile**

---

## 📈 METRICHE PERFORMANCE

### Target
- Response time: < 2 secondi
- Uptime: 99.9%
- Success rate risposte: > 85%
- User satisfaction: > 4/5

### Attuali (stimate)
- Response time: ~1.5s ✅
- Uptime: Non monitorato ⚠️
- Success rate: ~70% ⚠️
- User satisfaction: Non misurato ⚠️

---

## 🔄 PROSSIMI STEP

### Immediati (Completati)
1. [x] Fix rimozione suggerimenti frontend
2. [x] Fix font messaggi con !important
3. [x] Fix contrasto colori messaggi
4. [x] Migliorare intent acquisto biglietti
5. [x] Test tutti gli scenari
6. [x] Deployment backend aggiornato

### Breve termine (Settimana)
1. [ ] Completare setup Twilio
2. [ ] Implementare cache risposte
3. [ ] Aggiungere analytics base
4. [ ] Test con utenti reali

### Lungo termine (Mese)
1. [ ] Multi-lingua
2. [ ] Dashboard analytics
3. [ ] A/B testing risposte
4. [ ] Integrazione CRM

---

## 📝 LOG MODIFICHE

### 22 Settembre 2025
- Creato documento iniziale
- Definiti 5 scenari test principali
- Identificati problemi prioritari
- Mappata architettura sistema

### 20 Settembre 2025
- Implementato sistema Smart Actions
- Aggiunto conferma ticket
- WhatsApp integration parziale

### 19 Settembre 2025
- Fix prezzi biglietti (€9/€7)
- Rimossi suggerimenti automatici (backend)
- Aggiornato knowledge base

---

## 🔗 RISORSE

### Repository
- Frontend: `/Users/brnobtt/Desktop/lucine-minimal/`
- Backend: `/Users/brnobtt/Desktop/lucine-minimal/chatbot-backend/`

### API Keys (verificare .env)
- OpenAI: `OPENAI_API_KEY`
- Twilio: `TWILIO_*` (da configurare)

### Contatti
- Dev: bruno.betti@2much.tv
- Cliente: info@lucinedinatale.it

---

## ✅ CHECKLIST DEPLOYMENT

Prima di ogni deploy verificare:
- [ ] Test tutti gli scenari
- [ ] Knowledge base aggiornata
- [ ] URL backend corretti
- [ ] API keys configurate
- [ ] CORS headers corretti
- [ ] Rate limiting attivo
- [ ] Error handling completo
- [ ] Mobile responsive
- [ ] Performance < 2s

---

*Documento in continuo aggiornamento. Ultima revisione: 22/09/2025*