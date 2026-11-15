/**
 * Conversation Service – stores per‑user chat history for the Copilot.
 * Utilises the existing JSON‑file DB (dbService) and the new `conversations`
 * collection added to DEFAULT_DB.
 *
 * Each conversation entry shape:
 * {
 *   id: string,               // UUID v4 (generated server‑side)
 *   userId: string,
 *   companyId: string,
 *   messages: [
 *     { role: 'user'|'assistant', content: string, timestamp: ISOString }
 *   ]
 * }
 */
const { v4: uuidv4 } = require('uuid');
const db = require('./dbService');

class ConversationService {
  /** Get (or create) a conversation record for a given user. */
  _getOrCreate(userId, companyId) {
    let conv = db.findOne('conversations', c => c.userId === userId && c.companyId === companyId);
    if (!conv) {
      conv = { id: uuidv4(), userId, companyId, messages: [] };
      db.insert('conversations', conv);
    }
    return conv;
  }

  /** Append a new message to the user's conversation. */
  addMessage({ userId, companyId, role, content }) {
    const conv = this._getOrCreate(userId, companyId);
    const msg = { role, content, timestamp: new Date().toISOString() };
    conv.messages.push(msg);
    // keep only the latest 50 messages to limit size
    if (conv.messages.length > 50) conv.messages = conv.messages.slice(-50);
    // update the whole record (simple replace)
    const dbData = db.read();
    const idx = dbData.conversations.findIndex(c => c.id === conv.id);
    if (idx >= 0) dbData.conversations[idx] = conv;
    db.write(dbData);
    return msg;
  }

  /** Retrieve the most recent N messages (default 5) for context. */
  getRecent({ userId, companyId, limit = 5 }) {
    const conv = this._getOrCreate(userId, companyId);
    return conv.messages.slice(-limit);
  }
}

module.exports = new ConversationService();

