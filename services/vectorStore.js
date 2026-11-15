/**
 * Simple in‑memory vector store with persistence to JSON.
 * Stores vectors per document chunk (id, text, embedding).
 */
const fs = require('fs');
const path = require('path');
const { cosineSimilarity } = require('./utils');

const DATA_DIR = process.env.INCLUAI_DATA_DIR || path.join(__dirname, '..', 'data');
const STORE_FILE = path.join(DATA_DIR, 'vectorStore.json');

let store = [];
try { store = JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8')); } catch (_) { store = []; }

function save() {
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

class VectorStore {
  /** Add a new vector entry */
  add(entry) {
    // entry: { id, docId, text, embedding }
    store.push(entry);
    save();
  }

  /** Search for top‑k similar vectors to the query embedding */
  search(queryEmbedding, topK = 5) {
    const scored = store.map(item => ({
      ...item,
      score: cosineSimilarity(queryEmbedding, item.embedding)
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  /** Clear store (used for re‑indexing) */
  clear() {
    store = [];
    save();
  }
}

module.exports = new VectorStore();

