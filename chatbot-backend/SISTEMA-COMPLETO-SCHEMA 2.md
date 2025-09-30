# 🎯 SISTEMA IBRIDO CHAT LIVE + TICKET - SCHEMA COMPLETO

## 📊 **FLUSSO DATI FINALE - TUTTO SALVATO**

```
👤 UTENTE fa domanda
     ↓
🤖 CHATBOT AI elabora
     ↓
┌─────────────────────────┐
│ ✅ AI trova risposta    │ → 📊 Google Sheets (normale)
│ ❌ AI non trova risposta│ → Propone operatore
└─────────────────────────┘
     ↓ (se ❌)
👤 UTENTE: "Sì, voglio operatore"
     ↓
🔍 CHECK: Operatori disponibili?
     ↓
┌─────────────────────────┐
│ ✅ OPERATORE DISPONIBILE│ → CHAT LIVE
│ ❌ NESSUN OPERATORE     │ → TICKET FALLBACK
└─────────────────────────┘
     ↓                           ↓
🔴 CHAT LIVE                 🎫 TICKET SISTEMA
```

## 💾 **SALVATAGGIO DATI - TRACCIABILITÀ 100%**

### 🟢 **Scenario 1: Chat AI Normale**
| Azione | Google Sheets | Ticket System | In-Memory |
|--------|---------------|---------------|-----------|
| Domanda + Risposta AI | ✅ Immediato | ❌ No | ❌ No |

### 🔴 **Scenario 2: Chat Live con Operatore**
| Azione | Google Sheets | Ticket System | In-Memory |
|--------|---------------|---------------|-----------|
| 1. Handover AI → Operatore | ✅ Log handover | ❌ No | ✅ Session attiva |
| 2. Ogni messaggio utente | ✅ Real-time | ❌ No | ✅ Aggiornato |
| 3. Ogni messaggio operatore | ✅ Real-time | ❌ No | ✅ Aggiornato |
| 4. Fine chat (release) | ✅ Conversazione completa | ✅ Ticket "resolved" | ❌ Eliminato |

### 🎫 **Scenario 3: Ticket Fallback**
| Azione | Google Sheets | Ticket System | In-Memory |
|--------|---------------|---------------|-----------|
| Raccolta contatti + Ticket | ✅ Logged | ✅ Ticket "open" | ❌ No |

## 🗂️ **STRUTTURA GOOGLE SHEETS**

### Foglio "Conversazioni"
```
timestamp | session_id | user_message | bot_reply | intent_detected | user_agent
----------|------------|--------------|-----------|-----------------|------------
2025-09-22T10:30:00 | sess_123 | Quanto costa? | €9 intero, €7 ridotto | richiesta_prezzi | Browser
2025-09-22T10:35:00 | sess_456 | [HANDOVER] Problema | 🔄 Chat presa da Mario | chat_handover | Handover to Mario
2025-09-22T10:36:00 | sess_456 | [CHAT LIVE] Aiuto | [Attesa operatore] | live_chat_user_message | Chat Live con Mario
2025-09-22T10:37:00 | sess_456 | [OPERATORE] | 👨‍💼 Mario: Ciao! | live_chat_operator_message | Chat Live - Mario
2025-09-22T10:45:00 | sess_456 | [CONVERSAZIONE COMPLETA] | [CHAT LIVE COMPLETATA] conversazione... | live_chat_operator | Operatore: Mario
```

## 🎫 **STRUTTURA TICKET SYSTEM**

### Ticket da Chat Live
```json
{
  "session_id": "sess_456",
  "original_question": "Ho un problema con i biglietti",
  "conversation_transcript": "[10:36] Utente: Aiuto\n[10:37] Mario: Ciao!\n...",
  "operator_name": "Mario Rossi",
  "started_at": "2025-09-22T10:35:00Z",
  "ended_at": "2025-09-22T10:45:00Z",
  "resolution_reason": "completed",
  "status": "resolved",
  "contact_method": "live_chat",
  "contact_info": "Chat live - non richiesto contatto"
}
```

### Ticket Fallback (nessun operatore)
```json
{
  "session_id": "sess_789",
  "original_question": "Domanda specifica",
  "contact_method": "email",
  "contact_info": "user@email.com",
  "status": "open",
  "conversation_history": "Cronologia chat AI precedente"
}
```

## 🔄 **API OPERATORI - ENDPOINT COMPLETI**

### Per Dashboard Operatori:
```
GET  /api/operators?action=status              # Check operatori disponibili
GET  /api/operators?action=pending_sessions    # Sessioni in attesa
POST /api/operators?action=set_status          # Imposta status operatore
POST /api/operators?action=take_chat          # Prendi controllo chat
GET  /api/operators?action=chat_messages      # Cronologia chat
POST /api/operators?action=send_message       # Invia messaggio
PUT  /api/operators?action=release_chat       # Rilascia chat (+ salvataggio)
```

## 🎯 **VANTAGGI SISTEMA FINALE**

### ✅ **Tracciabilità Completa**
- Ogni interazione salvata (AI + Live)
- Cronologia completa per analytics
- Nessuna perdita dati

### ✅ **Doppio Backup**
- Google Sheets: Analytics e reportistica
- Ticket System: Gestione follow-up

### ✅ **Real-time Logging**
- Ogni messaggio salvato immediatamente
- Non dipende da fine conversazione

### ✅ **Integrazione Seamless**
- Handover AI → Operatore trasparente
- UX utente non interrotta
- Dashboard operatori ready

## 🚀 **NEXT STEPS DEPLOYMENT**

1. **✅ Backend Completo** - Tutto implementato
2. **⏳ Dashboard Operatori** - UI da implementare usando API
3. **✅ Logging Configurato** - Google Sheets + Ticket System
4. **✅ Testing Flow** - Pronto per test end-to-end

---

## 🧪 **TEST FINALE RACCOMANDATO**

```
1. Utente fa domanda difficile → Richiesta operatore
2. Operatore online → Prende chat (logged handover)
3. Conversazione bidirezionale (ogni msg logged)
4. Operatore rilascia chat (conversazione + ticket salvati)
5. Verifica Google Sheets: 4+ righe per la sessione
6. Verifica Ticket System: 1 ticket "resolved" creato
```

**🎯 RISULTATO: Sistema ibrido perfetto con tracciabilità 100%**