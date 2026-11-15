/**
 * Knowledge Base Routes
 *
 * GET  /api/v2/knowledge/documents      – list all company docs
 * POST /api/v2/knowledge/search         – semantic/token search
 * POST /api/v2/knowledge/upload         – JSON upload (HR_Admin/Org_Admin)
 * POST /api/v2/knowledge/upload-file    – multipart file upload (PDF/DOCX/TXT)
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const db = require('../services/dbService');
const ragService = require('../services/ragService');
const { parseFile } = require('../services/documentParser');
const { authenticateToken, requireRole } = require('../services/authService');

// ── Multer: store uploads in data/uploads/, keep original name ─────────────
const UPLOAD_DIR = path.join(process.env.INCLUAI_DATA_DIR || path.join(__dirname, '..', 'data'), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  }
});

const ALLOWED_TYPES = ['.pdf', '.docx', '.txt', '.csv', '.md'];
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_TYPES.includes(ext)) return cb(null, true);
    cb(new Error(`Unsupported file type: ${ext}. Allowed: ${ALLOWED_TYPES.join(', ')}`));
  }
});

// ── GET /documents ─────────────────────────────────────────────────────────
router.get('/documents', authenticateToken, (req, res) => {
  const docs = db.find('documents', d => d.companyId === req.user.companyId);
  res.json({
    success: true,
    count: docs.length,
    documents: docs.map(d => ({
      id: d.id,
      title: d.title,
      category: d.category,
      section: d.section,
      tags: d.tags,
      sourceFile: d.sourceFile || null,
      uploadedBy: d.uploadedBy || null,
      updatedAt: d.updatedAt
    }))
  });
});

// ── POST /search ───────────────────────────────────────────────────────────
router.post('/search', authenticateToken, async (req, res) => {
  const { query } = req.body;
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Search query is required.' });
  }

  try {
    const results = await ragService.searchCompanyDocuments(req.user.companyId, query.trim());
    res.json({ success: true, query, matchesCount: results.length, results });
  } catch (err) {
    console.error('[Knowledge/search]', err.message);
    res.status(500).json({ success: false, error: 'Search failed. Please try again.' });
  }
});

// ── POST /upload  (JSON body) ───────────────────────────────────────────────
router.post('/upload',
  authenticateToken,
  requireRole(['HR_Admin', 'Organization_Admin']),
  async (req, res) => {
    const { title, category, section, content, tags } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'Document title and content are required.' });
    }

    const newDoc = {
      id: `doc_${Date.now()}`,
      companyId: req.user.companyId,
      title,
      category: category || 'GENERAL',
      section: section || 'General Guidelines',
      content,
      tags: Array.isArray(tags) ? tags : (tags ? String(tags).split(',').map(t => t.trim()) : []),
      uploadedBy: req.user.id,
      updatedAt: new Date().toISOString()
    };

    db.insert('documents', newDoc);
    db.logAudit(req.user.companyId, req.user.id, 'DOCUMENT_UPLOAD', `Uploaded document: ${title}`);

    // Index into RAG asynchronously (don't block response)
    ragService.indexDocument(newDoc).catch(err =>
      console.warn('[Knowledge/upload] RAG indexing error:', err.message)
    );

    res.status(201).json({
      success: true,
      message: 'Document uploaded and queued for RAG indexing.',
      document: { id: newDoc.id, title: newDoc.title, category: newDoc.category }
    });
  }
);

// ── POST /upload-file  (multipart form) ────────────────────────────────────
router.post('/upload-file',
  authenticateToken,
  requireRole(['HR_Admin', 'Organization_Admin']),
  upload.single('file'),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded. Include a file field named "file".' });
    }

    const { title, category, section, tags } = req.body;
    if (!title) {
      // Clean up uploaded file
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ success: false, error: 'Document title is required.' });
    }

    try {
      // Parse text content from the uploaded file
      const content = await parseFile(req.file.path);
      if (!content || content.trim().length < 10) {
        fs.unlink(req.file.path, () => {});
        return res.status(422).json({ success: false, error: 'Could not extract text from the uploaded file. Check it is not empty or encrypted.' });
      }

      const newDoc = {
        id: `doc_${Date.now()}`,
        companyId: req.user.companyId,
        title,
        category: category || 'GENERAL',
        section: section || 'General Guidelines',
        content,
        tags: Array.isArray(tags) ? tags : (tags ? String(tags).split(',').map(t => t.trim()) : []),
        sourceFile: req.file.originalname,
        uploadedBy: req.user.id,
        uploadDate: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.insert('documents', newDoc);
      db.logAudit(req.user.companyId, req.user.id, 'DOCUMENT_FILE_UPLOAD',
        `Uploaded file: ${req.file.originalname} → "${title}"`);

      // Index into RAG asynchronously
      ragService.indexDocument(newDoc).catch(err =>
        console.warn('[Knowledge/upload-file] RAG indexing error:', err.message)
      );

      res.status(201).json({
        success: true,
        message: `File "${req.file.originalname}" parsed and queued for RAG indexing.`,
        document: {
          id: newDoc.id,
          title: newDoc.title,
          category: newDoc.category,
          sourceFile: newDoc.sourceFile,
          contentLength: content.length
        }
      });
    } catch (err) {
      fs.unlink(req.file.path, () => {}); // Clean up on error
      console.error('[Knowledge/upload-file]', err.message);
      res.status(500).json({ success: false, error: 'File processing failed. Please try again.' });
    }
  }
);

// ── Multer error handler ───────────────────────────────────────────────────
router.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, error: 'File too large. Maximum size is 10 MB.' });
  }
  if (err.message && err.message.startsWith('Unsupported file type')) {
    return res.status(415).json({ success: false, error: err.message });
  }
  next(err);
});

module.exports = router;
