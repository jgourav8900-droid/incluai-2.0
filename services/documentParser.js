/**
 * Document Parser – extracts plain text from uploaded files.
 * Supported: .pdf, .docx, .txt, .csv
 *
 * Dependencies (must be installed):
 *   npm install pdf-parse mammoth
 *
 * NOTE: Prototype. In production, use a dedicated document pipeline (e.g. Google Document AI).
 */

const fs = require('fs');
const path = require('path');

/**
 * Parse a file at `filePath` and return its text content.
 * @param {string} filePath - Absolute path to the file.
 * @returns {Promise<string>} - Extracted text, or empty string on failure.
 */
async function parseFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  try {
    const data = fs.readFileSync(filePath);

    if (ext === '.pdf') {
      // pdf-parse extracts text from all pages
      const pdfParse = require('pdf-parse');
      const parsed = await pdfParse(data);
      return parsed.text || '';
    }

    if (ext === '.docx') {
      // mammoth converts .docx to clean plain text
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer: data });
      return result.value || '';
    }

    if (ext === '.txt' || ext === '.csv' || ext === '.md') {
      return data.toString('utf-8');
    }

    // Unsupported type
    console.warn(`[DocumentParser] Unsupported file type: ${ext}`);
    return '';
  } catch (err) {
    console.error(`[DocumentParser] Failed to parse ${path.basename(filePath)}:`, err.message);
    return '';
  }
}

/**
 * Chunk a long text string into overlapping segments of ~maxWords words.
 * Overlap helps preserve context at chunk boundaries.
 * @param {string} text
 * @param {number} maxWords  - Target words per chunk (default 400)
 * @param {number} overlapWords - Words to repeat at start of next chunk (default 50)
 * @returns {string[]}
 */
function chunkText(text, maxWords = 400, overlapWords = 50) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks = [];
  let i = 0;
  while (i < words.length) {
    chunks.push(words.slice(i, i + maxWords).join(' '));
    i += maxWords - overlapWords;
  }
  return chunks.filter(c => c.trim().length > 20); // discard near-empty chunks
}

module.exports = { parseFile, chunkText };
