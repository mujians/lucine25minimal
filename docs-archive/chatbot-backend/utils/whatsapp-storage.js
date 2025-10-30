// Sistema storage semplice per numeri WhatsApp
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const STORAGE_FILE = join(process.cwd(), 'data', 'whatsapp-users.json');

// Carica utenti WhatsApp
export function loadWhatsAppUsers() {
  try {
    const data = readFileSync(STORAGE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading WhatsApp users:', error);
    return { users: {}, last_updated: new Date().toISOString() };
  }
}

// Salva utenti WhatsApp
export function saveWhatsAppUsers(usersData) {
  try {
    usersData.last_updated = new Date().toISOString();
    writeFileSync(STORAGE_FILE, JSON.stringify(usersData, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving WhatsApp users:', error);
    return false;
  }
}

// Aggiungi/aggiorna utente WhatsApp
export function addWhatsAppUser(sessionId, phoneNumber, userData = {}) {
  const users = loadWhatsAppUsers();
  
  users.users[sessionId] = {
    phone_number: phoneNumber,
    created_at: new Date().toISOString(),
    last_interaction: new Date().toISOString(),
    active: true,
    preferences: {
      notifications: true,
      marketing: false,
      reminders: true
    },
    ...userData
  };
  
  const saved = saveWhatsAppUsers(users);
  console.log(`📱 WhatsApp user ${saved ? 'saved' : 'failed'}:`, phoneNumber);
  
  return saved;
}

// Trova utente per numero WhatsApp
export function findUserByWhatsApp(phoneNumber) {
  const users = loadWhatsAppUsers();
  
  for (const [sessionId, userData] of Object.entries(users.users)) {
    if (userData.phone_number === phoneNumber && userData.active) {
      return { sessionId, ...userData };
    }
  }
  
  return null;
}

// Trova utente per session ID
export function findUserBySession(sessionId) {
  const users = loadWhatsAppUsers();
  return users.users[sessionId] || null;
}

// Disattiva notifiche WhatsApp
export function deactivateWhatsApp(phoneNumber) {
  const users = loadWhatsAppUsers();
  
  for (const [sessionId, userData] of Object.entries(users.users)) {
    if (userData.phone_number === phoneNumber) {
      users.users[sessionId].active = false;
      users.users[sessionId].deactivated_at = new Date().toISOString();
      return saveWhatsAppUsers(users);
    }
  }
  
  return false;
}

// Ottieni tutti utenti attivi
export function getActiveWhatsAppUsers() {
  const users = loadWhatsAppUsers();
  
  return Object.entries(users.users)
    .filter(([_, userData]) => userData.active)
    .map(([sessionId, userData]) => ({ sessionId, ...userData }));
}

// Statistiche WhatsApp
export function getWhatsAppStats() {
  const users = loadWhatsAppUsers();
  const allUsers = Object.values(users.users);
  
  return {
    total_users: allUsers.length,
    active_users: allUsers.filter(u => u.active).length,
    inactive_users: allUsers.filter(u => !u.active).length,
    notifications_enabled: allUsers.filter(u => u.active && u.preferences?.notifications).length,
    last_updated: users.last_updated
  };
}