require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const metricsService = require('./services/metricsService');

// ── Seed project knowledge into RAG on startup ────────────────────────────
// Runs after .env is loaded so GEMINI_API_KEY is available.
(async () => {
  try {
    const ragService = require('./services/ragService');
    const db = require('./services/dbService');
    const { chunkText } = require('./services/documentParser');

    const knowledgeFile = path.join(__dirname, 'knowledge', 'projectKnowledge.md');
    if (!fs.existsSync(knowledgeFile)) return;

    const content = fs.readFileSync(knowledgeFile, 'utf-8');
    const SEED_DOC_ID = 'doc_project_knowledge_seed';
    const COMPANY_ID = 'COMP001';

    // Only seed if not already in DB
    const exists = db.findOne('documents', d => d.id === SEED_DOC_ID);
    if (!exists) {
      const doc = {
        id: SEED_DOC_ID,
        companyId: COMPANY_ID,
        title: 'INCLUAI 2.0 Platform Knowledge',
        category: 'PLATFORM_KNOWLEDGE',
        section: 'Architecture & Modules Overview',
        content,
        tags: ['incluai', 'architecture', 'modules', 'api', 'platform'],
        updatedAt: new Date().toISOString()
      };
      db.insert('documents', doc);
      await ragService.indexDocument(doc);
      console.log('[Server] Project knowledge seeded into RAG store.');
    }
  } catch (err) {
    console.warn('[Server] Knowledge seeding skipped:', err.message);
  }
})();

const app = express();
const PORT = process.env.PORT || 5000;

// Controlled CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) 
  : ['http://localhost:5000', 'http://127.0.0.1:5000', 'http://localhost:5001', 'http://127.0.0.1:5001', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or same-origin)
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }
    return callback(new Error('CORS blocked: Origin not authorized'));
  },
  credentials: true
}));

app.use(express.json());

// Track metrics
app.use((req, res, next) => {
  metricsService.recordRequest();
  next();
});

// Ensure fresh UI/UX on every reload
app.use((req, res, next) => {
  if (req.path === '/' || req.path === '/app' || req.path.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// Serve static frontend assets
// Dataset files are kept out of the public static surface; use the authenticated API.
app.get(['/data/employee_attrition.json', '/data/employee_attrition.csv'], (req, res) => {
  res.sendStatus(404);
});
app.use(express.static(path.join(__dirname, 'public'), { etag: false, maxAge: 0 }));

// Mount Versioned API Routes
app.use('/api/v2/auth', require('./routes/auth'));
app.use('/api/v2/copilot', require('./routes/copilot'));
app.use('/api/v2/copilot/advanced', require('./routes/advancedAi'));
app.use('/api/v2/copilot/live', require('./routes/live'));
app.use('/api/v2/knowledge', require('./routes/knowledge'));
app.use('/api/v2/reports', require('./routes/reports'));
app.use('/api/v2/messages', require('./routes/messages'));
app.use('/api/v2/tasks', require('./routes/tasks'));
app.use('/api/v2/email', require('./routes/email'));
app.use('/api/v2/observability', require('./routes/observability'));
app.use('/api/v2/analytics', require('./routes/analytics'));
app.use('/api/v2/settings', require('./routes/settings'));
app.use('/api/v2/notifications', require('./routes/notifications'));
app.use('/api/v2/waitlist', require('./routes/waitlist'));
app.use('/api/v2/dataset', require('./routes/dataset'));

// Route for full enterprise workplace platform
app.get(['/app', '/app.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

// Route for Employee Dataset & Attrition Intelligence Engine
app.get(['/dataset', '/dataset.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dataset.html'));
});

// Fallback index.html route for client-side routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || path.extname(req.path)) {
    return next();
  }
  const indexPath = path.join(__dirname, 'public', 'index.html');
  res.sendFile(indexPath);
});

// Global Error Handler
app.use((err, req, res, next) => {
  metricsService.recordError();
  console.error('[Server Error]', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`   INCLUAI 2.0 Workplace Platform Kernel Running`);
    console.log(`   Web App: http://localhost:${PORT}`);
    console.log(`   Telemetry: http://localhost:${PORT}/api/v2/observability/metrics`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
