/**
 * RAG Service – Retrieval-Augmented Generation helpers.
 *
 * Flow:
 *  1. Index a document → chunk it → generate embeddings → store in vector store.
 *  2. Query → embed → cosine search → fallback token similarity if no embeddings.
 *  3. Return ranked docs with title, section, content snippet, and score.
 *
 * NOTE: Prototype uses a JSON-backed vector store.
 *       Production should use Atlas Vector Search or Pinecone.
 */

const db = require('./dbService');
const embeddingService = require('./embeddingService');
const vectorStore = require('./vectorStore');
const { cosineSimilarity } = require('./utils');
const { chunkText } = require('./documentParser');

// ── Token-similarity fallback (no embeddings needed) ─────────────────────────
// Uses a combined score: title match weight (3x) + tag match weight (2x) + content token overlap
function simpleSimilarity(query, doc) {
  const qLower = query.toLowerCase();
  const qTokens = new Set(qLower.split(/\s+/).filter(t => t.length > 2));

  // Content overlap
  const dTokens = (doc.content || '').toLowerCase().split(/\s+/);
  const contentScore = dTokens.filter(t => qTokens.has(t)).length / Math.max(qTokens.size, 1);

  // Title overlap (weighted 3x – titles are highly specific)
  const titleTokens = (doc.title || '').toLowerCase().split(/\s+/);
  const titleScore = titleTokens.filter(t => qTokens.has(t)).length / Math.max(titleTokens.length, 1);

  // Tag overlap (weighted 2x – tags are curated keywords)
  const tags = Array.isArray(doc.tags) ? doc.tags : [];
  const tagScore = tags.filter(tag => qLower.includes(tag.toLowerCase())).length / Math.max(tags.length, 1);

  // Section overlap (1x)
  const sectionTokens = (doc.section || '').toLowerCase().split(/\s+/);
  const sectionScore = sectionTokens.filter(t => qTokens.has(t)).length / Math.max(sectionTokens.length, 1);

  return contentScore + titleScore * 3 + tagScore * 2 + sectionScore;
}

// ── Extract the most relevant snippet from content for a given query ──────────
function extractSnippet(query, content, maxLen = 300) {
  const queryWords = new Set(query.toLowerCase().split(/\s+/));
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  if (sentences.length === 0) return content.slice(0, maxLen);

  let best = sentences[0];
  let bestScore = 0;
  for (const sent of sentences) {
    const words = sent.toLowerCase().split(/\s+/);
    const score = words.filter(w => queryWords.has(w)).length;
    if (score > bestScore) { bestScore = score; best = sent; }
  }
  return best.trim().slice(0, maxLen);
}

/**
 * Index a document into the vector store.
 * Chunks the content, generates embeddings for each chunk, and stores them.
 * @param {Object} doc - Must have: id, title, section, content, companyId
 */
async function indexDocument(doc) {
  if (!doc || !doc.content) return;
  const chunks = chunkText(doc.content, 400, 50);
  let indexed = 0;
  for (let i = 0; i < chunks.length; i++) {
    const chunkId = `${doc.id}_c${i}`;
    const embedding = await embeddingService.storeEmbedding(chunkId, chunks[i]);
    if (embedding) {
      vectorStore.add({ id: chunkId, docId: doc.id, text: chunks[i], embedding });
      indexed++;
    }
  }
  if (indexed > 0) {
    console.log(`[RAGService] Indexed "${doc.title}" → ${indexed} chunk(s) with embeddings.`);
  } else {
    console.warn(`[RAGService] No embeddings for "${doc.title}" – token similarity will be used as fallback.`);
  }
}

/**
 * Search company documents using semantic similarity (or token fallback).
 * @param {string} companyId
 * @param {string} query
 * @param {number} threshold - Minimum score to include (default 0.05)
 * @param {number} topK - Max results (default 5)
 * @returns {Promise<Array<{title, section, content, score, docId}>>}
 */
async function searchCompanyDocuments(companyId, query, threshold = 0.05, topK = 5) {
  // ── Attempt semantic (embedding) search first ────────────────────────────
  const queryEmbedding = await embeddingService.generate(query);
  if (queryEmbedding) {
    const results = vectorStore.search(queryEmbedding, topK * 2);
    if (results.length > 0) {
      const dbData = db.read();
      // Build a map of docs belonging to this company
      const docsMap = {};
      dbData.documents
        .filter(d => d.companyId === companyId)
        .forEach(d => { docsMap[d.id] = d; });

      const mapped = results
        .filter(r => r.docId && docsMap[r.docId])     // only this company's docs
        .filter(r => r.score >= threshold)
        .slice(0, topK)
        .map(r => ({
          docId: r.docId,
          title: docsMap[r.docId].title,
          section: docsMap[r.docId].section,
          content: r.text,                             // chunk text (not full doc)
          snippet: extractSnippet(query, r.text),
          score: parseFloat(r.score.toFixed(4))
        }));

      if (mapped.length > 0) return mapped;
    }
  }

  // ── Fallback: token similarity over full documents ───────────────────────
  const dbData = db.read();
  const docs = dbData.documents.filter(d => d.companyId === companyId);
  return docs
    .map(doc => ({
      docId: doc.id,
      title: doc.title,
      section: doc.section,
      content: doc.content,
      snippet: extractSnippet(query, doc.content),
      score: parseFloat(simpleSimilarity(query, doc).toFixed(4))
    }))
    .filter(r => r.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

module.exports = { searchCompanyDocuments, indexDocument, extractSnippet };
