// Shared session store per chat e operatori
const sessionStore = new Map();

export function getSessionData(sessionId) {
  if (!sessionId) return {};
  return sessionStore.get(sessionId) || {};
}

export function setSessionData(sessionId, data) {
  if (!sessionId) return;
  const existing = getSessionData(sessionId);
  sessionStore.set(sessionId, { ...existing, ...data });
}

export function clearSessionData(sessionId) {
  if (!sessionId) return;
  sessionStore.delete(sessionId);
}

export function getAllSessions() {
  return Array.from(sessionStore.entries()).map(([sessionId, data]) => ({
    sessionId,
    ...data
  }));
}

export function getPendingSessions() {
  return Array.from(sessionStore.entries())
    .filter(([_, data]) => data.mode === 'live_chat_pending' && data.waiting_for_operator)
    .map(([sessionId, data]) => ({
      sessionId,
      originalQuestion: data.originalQuestion,
      handover_time: data.handover_time,
      timestamp: new Date(data.handover_time).toISOString()
    }));
}