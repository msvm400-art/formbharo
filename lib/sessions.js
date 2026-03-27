/**
 * lib/sessions.js
 * Manages active Playwright browser sessions for multi-step form filling
 */

// In-memory session store (browser instances and pages)
// In a serverless environment like Netlify/Vercel, this would require 
// a persistent browser orchestration service. Since we are on a Local Dev Server,
// we can keep them in memory.
const activeSessions = new Map();

const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutes

/**
 * Get or create a session
 * @param {string} sessionId 
 * @returns {Promise<{browser, page, lastSeen}>}
 */
export async function getSession(sessionId) {
  if (!sessionId) return null;
  const session = activeSessions.get(sessionId);
  if (session) {
    session.lastSeen = Date.now();
    return session;
  }
  return null;
}

/**
 * Save an active session
 * @param {string} sessionId 
 * @param {object} sessionData { browser, page }
 */
export function saveSession(sessionId, sessionData) {
  activeSessions.set(sessionId, {
    ...sessionData,
    lastSeen: Date.now()
  });
}

/**
 * Close and remove a session
 * @param {string} sessionId 
 */
export async function closeSession(sessionId) {
  const session = activeSessions.get(sessionId);
  if (session) {
    try {
      if (session.browser) await session.browser.close();
    } catch (e) {
      console.warn(`Failed to close browser for session ${sessionId}:`, e.message);
    }
    activeSessions.delete(sessionId);
  }
}

/**
 * Cleanup stale sessions
 */
export async function cleanupSessions() {
  const now = Date.now();
  for (const [id, session] of activeSessions.entries()) {
    if (now - session.lastSeen > SESSION_TIMEOUT) {
      console.log(`Cleaning up stale session: ${id}`);
      await closeSession(id);
    }
  }
}

// Run cleanup periodically if in a persistent process
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupSessions, 60 * 1000);
}
