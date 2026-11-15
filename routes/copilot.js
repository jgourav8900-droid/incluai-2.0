const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const aiService = require('../services/aiService');
const { authenticateToken } = require('../services/authService');

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
  if (aiService.geminiClient && aiService.isGeminiVerified === null) {
    await aiService.verifyGemini();
  }
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

// POST /api/v2/copilot/config (Set Gemini API key dynamically - Admin only)
const { requireRole } = require('../services/authService');
router.post('/config', authenticateToken, requireRole(['Organization_Admin']), (req, res) => {
  const { apiKey, model } = req.body;
  if (apiKey) {
    process.env.GEMINI_API_KEY = apiKey.trim();
  }
  if (model) {
    process.env.GEMINI_MODEL = model.trim();
  }
  aiService.initGeminiClient();
  res.json({
    success: true,
    message: 'Google Gemini configuration updated successfully',
    status: aiService.getStatus()
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
