# 👨‍💼 OPERATOR DASHBOARD API

Sistema per operatori gestione chat live + ticket.

## 🔗 Base URL
```
https://chatbot-backend-aicwwsgq5-brunos-projects-075c84f2.vercel.app/api/operators
```

## 📋 WORKFLOW OPERATORE

### 1. Imposta Status Operatore
```javascript
// POST /api/operators?action=set_status
{
  "operator_id": "op_001",
  "operator_name": "Mario Rossi", 
  "status": "available" // available, busy, offline
}
```

### 2. Verifica Disponibilità Altri Operatori
```javascript
// GET /api/operators?action=status
Response: {
  "success": true,
  "available": true,
  "operator_count": 2,
  "operators": [...]
}
```

### 3. Ottieni Sessioni in Attesa
```javascript
// GET /api/operators?action=pending_sessions
Response: {
  "success": true,
  "pending_sessions": [
    {
      "sessionId": "sess_123",
      "originalQuestion": "Quanto costano i biglietti?",
      "handover_time": 1695123456789,
      "timestamp": "2023-09-19T10:30:56.789Z"
    }
  ],
  "total_pending": 1
}
```

### 4. Prendi Controllo Chat
```javascript
// POST /api/operators?action=take_chat
{
  "session_id": "sess_123",
  "operator_id": "op_001",
  "operator_name": "Mario Rossi"
}
```

### 5. Ottieni Cronologia Messaggi
```javascript
// GET /api/operators?action=chat_messages&session_id=sess_123
Response: {
  "success": true,
  "session_id": "sess_123", 
  "messages": [
    {
      "type": "user",
      "message": "Quanto costano i biglietti?",
      "timestamp": "2023-09-19T10:30:56.789Z"
    }
  ],
  "original_question": "Quanto costano i biglietti?"
}
```

### 6. Invia Messaggio all'Utente
```javascript
// POST /api/operators?action=send_message
{
  "session_id": "sess_123",
  "operator_id": "op_001", 
  "message": "Ciao! I biglietti costano €9 intero e €7 ridotto."
}
```

### 7. Rilascia Chat (Fine Conversazione)
```javascript
// PUT /api/operators?action=release_chat
{
  "session_id": "sess_123",
  "operator_id": "op_001",
  "reason": "completed" // completed, transferred, escalated
}
```

## 🔄 FLUSSO REAL-TIME

### Per l'Operatore:
1. Monitora `/pending_sessions` ogni 5-10 secondi
2. Quando prende chat, carica `/chat_messages` 
3. Invia messaggi con `/send_message`
4. Controlla nuovi messaggi utente ricaricando `/chat_messages`
5. Rilascia chat con `/release_chat`

### Per l'Utente (automatico):
- Quando operatore prende chat → modalità live attivata
- Messaggi utente salvati automaticamente per operatore
- Messaggi operatore consegnati alla prossima interazione utente
- UX seamless senza refresh necessari

## 🎯 STATI SESSIONE

| Stato | Descrizione | Chi Gestisce |
|-------|-------------|--------------|
| `live_chat_pending` | In attesa operatore | Chatbot AI |
| `live_chat_active` | Chat con operatore | Operatore Umano |
| `not_active` | Sessione normale | Chatbot AI |

## 🚨 ERROR HANDLING

- `400` - Parametri mancanti o invalidi
- `403` - Operatore non autorizzato per questa chat  
- `404` - Sessione o operatore non trovato
- `500` - Errore interno server

## 💡 BEST PRACTICES

1. **Polling**: Controlla pending sessions ogni 10 secondi max
2. **Status**: Imposta sempre status corretto (available/busy/offline)
3. **Timeout**: Rilascia chat se utente inattivo >15 minuti
4. **Fallback**: Se errore, guida utente verso ticket system
5. **Logging**: Tutte le interazioni sono logged automaticamente

---

## 🖥️ ESEMPIO DASHBOARD UI

```javascript
// Esempio implementazione dashboard semplice
class OperatorDashboard {
  constructor(operatorId, operatorName) {
    this.operatorId = operatorId;
    this.operatorName = operatorName;
    this.baseUrl = 'https://chatbot-backend-aicwwsgq5-brunos-projects-075c84f2.vercel.app/api/operators';
  }

  // Imposta status
  async setStatus(status) {
    return await fetch(`${this.baseUrl}?action=set_status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operator_id: this.operatorId,
        operator_name: this.operatorName,
        status: status
      })
    });
  }

  // Ottieni sessioni pending
  async getPendingSessions() {
    const response = await fetch(`${this.baseUrl}?action=pending_sessions`);
    return await response.json();
  }

  // Prendi chat
  async takeChat(sessionId) {
    return await fetch(`${this.baseUrl}?action=take_chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        operator_id: this.operatorId,
        operator_name: this.operatorName
      })
    });
  }

  // Invia messaggio
  async sendMessage(sessionId, message) {
    return await fetch(`${this.baseUrl}?action=send_message`, {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        operator_id: this.operatorId,
        message: message
      })
    });
  }
}

// Uso:
const dashboard = new OperatorDashboard('op_001', 'Mario Rossi');
await dashboard.setStatus('available');
const pending = await dashboard.getPendingSessions();
```

---

*Sistema pronto per integrazione con qualsiasi dashboard UI*