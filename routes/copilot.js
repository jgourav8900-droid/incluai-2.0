const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const aiService = require('../services/aiService');
const modelProvider = require('../services/modelProvider');
const { authenticateToken, requireRole } = require('../services/authService');

// Rate limiting: 60 requests per minute per IP for chat & AI generation
const copilotLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests to AI Copilot. Please pause briefly before sending another message.'
  }
});

// GET /api/v2/copilot/status
router.get('/status', async (req, res) => {
  res.json(aiService.getStatus());
});

// GET /api/v2/copilot/history - Context-aware conversation history for current session
router.get('/history', authenticateToken, (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const history = aiService.getConversationHistory(req.user.id, req.user.companyId, limit);
    res.json({
      success: true,
      count: history.length,
      history
    });
  } catch (err) {
    console.error('[Copilot History Error]', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve conversation history' });
  }
});

// POST /api/v2/copilot/config (Set a hosted AI provider dynamically - Admin only)
router.post('/config', authenticateToken, requireRole(['Organization_Admin']), async (req, res) => {
  const { apiKey, model } = req.body;
  const provider = String(req.body.provider || 'gemini').trim().toLowerCase();
  if (typeof apiKey !== 'string' || !apiKey.trim()) {
    return res.status(400).json({ success: false, error: 'A provider API key is required.' });
  }
  if (provider === 'anthropic' || provider === 'claude') {
    const key = apiKey.trim();
    if (!modelProvider.isValidApiKey('anthropic', key)) {
      return res.status(400).json({ success: false, error: 'Use an Anthropic API key, not an account or session token.' });
    }
    process.env.ANTHROPIC_API_KEY = key;
    process.env.AI_PROVIDER = 'anthropic';
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.GEMINI_MODEL;
    if (model) process.env.ANTHROPIC_MODEL = String(model).trim();
  } else if (provider === 'gemini' || provider === 'google') {
    if (!modelProvider.isValidApiKey('gemini', apiKey)) {
      return res.status(400).json({ success: false, error: 'The Gemini API key is invalid.' });
    }
    process.env.GEMINI_API_KEY = apiKey.trim();
    process.env.AI_PROVIDER = 'gemini';
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_MODEL;
    if (model) process.env.GEMINI_MODEL = String(model).trim();
  } else {
    return res.status(400).json({ success: false, error: 'Provider must be "gemini" or "anthropic".' });
  }
  aiService.isProviderVerified = false;
  aiService.initGeminiClient(false);
  const connected = await aiService.verifyProvider();
  if (!connected) {
    return res.status(502).json({
      success: false,
      error: 'The provider could not be verified. Check the API key, model, and network, then try again.',
      status: aiService.getStatus()
    });
  }
  res.json({
    success: true,
    message: `${modelProvider.getProviderConfig().name} configured for this server process.`,
    status: aiService.getStatus(),
    persistence: 'runtime-only'
  });
});

// POST /api/v2/copilot/demo (Public demonstration for landing page)
router.post('/demo', copilotLimiter, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'Query message string is required.' });
    }

    const demoUser = {
      companyId: 'COMP001',
      name: 'Guest Explorer',
      role: 'Employee',
      department: 'Engineering',
      employeeId: 'DEMO001'
    };

    const result = await aiService.processQuery(message.trim(), demoUser);
    res.json(result);
  } catch (err) {
    console.error('[Copilot Demo Error]', err);
    res.status(500).json({ success: false, error: 'AI Copilot demo error: ' + err.message });
  }
});

// POST /api/v2/copilot/chat
router.post('/chat', authenticateToken, copilotLimiter, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'Query message string is required.' });
    }

    const result = await aiService.processQuery(message.trim(), req.user);
    res.json(result);
  } catch (err) {
    console.error('[Copilot Error]', err);
    res.status(500).json({ success: false, error: 'AI Copilot processing error: ' + err.message });
  }
});

// POST /api/v2/copilot/hr-policy - Dedicated HR policy assistant endpoint
router.post('/hr-policy', authenticateToken, copilotLimiter, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ success: false, error: 'Policy question string is required.' });
    }

    const result = await aiService.queryHRPolicy(question.trim(), req.user);
    res.json(result);
  } catch (err) {
    console.error('[Copilot HR Policy Error]', err);
    res.status(500).json({ success: false, error: 'HR policy lookup error: ' + err.message });
  }
});

module.exports = router;
