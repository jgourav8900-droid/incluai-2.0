/**
 * Embedding Service – generates and stores vector embeddings for documents.
 * Uses Google Gemini text-embedding-004 model.
 * Embeddings are persisted to data/embeddings.json keyed by document ID.
 *
 * NOTE: Prototype – in production this would use a dedicated vector DB (e.g. Pinecone, Atlas Vector Search).
 */

const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/genai');

const DATA_DIR = path.join(__dirname, '..', 'data');
const EMBEDDINGS_FILE = path.join(DATA_DIR, 'embeddings.json');

// Load persisted embeddings or start fresh
let embeddings = {};
try {
  embeddings = JSON.parse(fs.readFileSync(EMBEDDINGS_FILE, 'utf-8'));
} catch (_) {
  embeddings = {};
}

function saveEmbeddings() {
  try {
    fs.writeFileSync(EMBEDDINGS_FILE, JSON.stringify(embeddings, null, 2), 'utf-8');
  } catch (err) {
    console.error('[EmbeddingService] Failed to persist embeddings:', err.message);
  }
}

class EmbeddingService {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (apiKey && apiKey.trim().length > 5 && !apiKey.startsWith('YOUR_')) {
      try {
        // GoogleGenerativeAI is the correct class for @google/genai >= 0.13
        this.client = new GoogleGenerativeAI(apiKey.trim());
        console.log('[EmbeddingService] Gemini client initialized.');
      } catch (err) {
        console.error('[EmbeddingService] Failed to init client:', err.message);
        this.client = null;
      }
    } else {
      this.client = null;
      console.warn('[EmbeddingService] No valid Gemini API key – embeddings disabled. Using token similarity fallback.');
    }
  }

  /**
   * Generate a vector embedding for a plain-text string.
   * Returns float[] or null on failure/unavailability.
   */
  async generate(text) {
    if (!this.client) return null;
    try {
      const model = this.client.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await model.embedContent(text);
      return result?.embedding?.values ?? null;
    } catch (err) {
      console.warn('[EmbeddingService] Embedding generation failed:', err.message);
      return null;
    }
  }

  /**
   * Generate an embedding for `text` and persist it under `docId`.
   * Returns the float[] vector or null.
   */
  async storeEmbedding(docId, text) {
    const vec = await this.generate(text);
    if (vec) {
      embeddings[docId] = vec;
      saveEmbeddings();
    }
    return vec;
  }

  /** Retrieve cached embedding for a docId (or null if not found). */
  getEmbedding(docId) {
    return embeddings[docId] || null;
  }

  /** Return all stored embeddings (keyed by docId). */
  getAll() {
    return embeddings;
  }

  /** Number of embeddings currently stored. */
  get count() {
    return Object.keys(embeddings).length;
  }
}

module.exports = new EmbeddingService();
