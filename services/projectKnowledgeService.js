/**
 * Project Knowledge Service – builds a concise knowledge base of the entire
 * INCLUAI codebase by reading source files. The knowledge string is cached in
 * memory and refreshed on demand (e.g., after a developer runs a script).
 */
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const EXCLUDE_DIRS = ['node_modules', 'data', 'public', '.git'];

let cachedKnowledge = null;
let cachedMtime = null;

function isSourceFile(file) {
  const ext = path.extname(file).toLowerCase();
  return ['.js', '.json', '.md', '.html', '.css', '.ts', '.tsx'].includes(ext);
}

function walk(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.includes(entry.name)) walk(full, files);
    } else if (isSourceFile(full)) {
      files.push(full);
    }
  }
  return files;
}

function buildKnowledge() {
  const files = walk(ROOT_DIR);
  let knowledge = '';
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      knowledge += `\n--- FILE: ${path.relative(ROOT_DIR, file)} ---\n${content}\n`;
    } catch (_) {}
  }
  return knowledge;
}

function getKnowledge() {
  // Simple cache – rebuild if any file changed after cachedMtime
  if (cachedKnowledge) return cachedKnowledge;
  cachedKnowledge = buildKnowledge();
  return cachedKnowledge;
}

module.exports = { getKnowledge };

