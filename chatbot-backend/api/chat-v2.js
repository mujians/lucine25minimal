/**
 * CHAT API V2 - Entry Point per Testing
 * 
 * Questo file permette di testare la nuova architettura modulare
 * senza sostituire immediatamente chat.js esistente
 * 
 * URL: /api/chat-v2
 * 
 * Una volta testato, si potrà sostituire chat.js con questo sistema
 */

import chatHandler from './chat/index.js';

// Re-export the main handler
export default chatHandler;

// Aggiungi header per identificare la versione
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
  maxDuration: 30, // 30 secondi timeout
};

console.log('💫 Chat API v2 endpoint ready at /api/chat-v2');