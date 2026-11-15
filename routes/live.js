/**
 * Live Audio Copilot Routes — Phase Live
 *
 * Implements:
 *  POST /api/v2/copilot/live/token       – Issues single-use ephemeral auth token for browser Live connection
 *  POST /api/v2/copilot/live/tool-search – RAG tool bridge for function calling (search_company_policy)
 *  POST /api/v2/copilot/live/transcript  – Saves completed voice turn transcripts to conversation history
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const aiService = require('../services/aiService');
const ragService = require('../services/ragService');
const conversationService = require('../services/conversationService');
const { authenticateToken } = require('../services/authService');

// Rate limiting: 60 requests per minute per IP
const liveLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests to Gemini Live. Please pause briefly before reconnecting.'
  }
});

// Definition of the search_company_policy tool for Live session
const POLICY_TOOL_DECLARATION = {
  functionDeclarations: [
    {
      name: 'search_company_policy',
      description: 'Search company workplace handbooks, benefits, and HR policies for verified guidelines and entitlements.',
      parameters: {
        type: 'OBJECT',
        properties: {
          query: {
            type: 'STRING',
            description: 'The search query topic (e.g., parental leave, remote work hours, annual PTO, accommodations).'
          }
        },
        required: ['query']
      }
    }
  ]
};

// ── 1. POST /token ────────────────────────────────────────────────────────────
// Issues ephemeral token for Live API connection directly from browser
router.post('/token', authenticateToken, liveLimiter, async (req, res) => {
  try {
    if (!aiService.geminiClient) {
      return res.status(503).json({
        success: false,
        error: 'Google Gemini Live service is not available. Ensure a valid GEMINI_API_KEY is configured in server environment.'
      });
    }

    const liveModel = process.env.GEMINI_LIVE_MODEL || 'gemini-2.0-flash';

    // Ephemeral token expires in 10 minutes (600 seconds)
    const expireTime = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const newSessionExpireTime = new Date(Date.now() + 60 * 1000).toISOString();

    const authToken = await aiService.geminiClient.authTokens.create({
      config: {
        expireTime,
        newSessionExpireTime,
        uses: 1,
        liveConnectConstraints: {
          model: liveModel
        }
      }
    });

    if (!authToken || !authToken.name) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate ephemeral session token from Gemini API.'
      });
    }

    const liveSystemPrompt = aiService.buildLiveSystemPrompt
      ? aiService.buildLiveSystemPrompt(req.user)
      : 'You are the spoken voice assistant for INCLUAI 2.0. Answer concisely in natural speech.';

    res.json({
      success: true,
      token: authToken.name,
      model: liveModel,
      expiresAt: expireTime,
      systemInstruction: liveSystemPrompt,
      tools: [POLICY_TOOL_DECLARATION]
    });
  } catch (err) {
    console.error('[Live Token Error]', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to issue ephemeral live token: ' + err.message
    });
  }
});

// ── 2. POST /tool-search ──────────────────────────────────────────────────────
// Function calling bridge: executes searchCompanyDocuments and returns plain text
router.post('/tool-search', authenticateToken, liveLimiter, async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Query string is required for policy search.'
      });
    }

    // Input limit matching text copilot guard
    const cleanQuery = query.trim().slice(0, 1000);
    const companyId = req.user.companyId || 'COMP001';

    const docs = await ragService.searchCompanyDocuments(companyId, cleanQuery, 0.05, 4);

    if (!docs || docs.length === 0) {
      return res.json({
        success: true,
        found: false,
        result: 'No company policy documents matched this query. Advise the user to contact HR directly.'
      });
    }

    // Format plain text context suitable for spoken synthesis
    const formatted = docs.map(d =>
      `DOCUMENT: ${d.title} (Section: ${d.section})\n${d.snippet || d.content}`
    ).join('\n\n');

    res.json({
      success: true,
      found: true,
      matchesCount: docs.length,
      topCitation: {
        title: docs[0].title,
        section: docs[0].section
      },
      result: formatted
    });
  } catch (err) {
    console.error('[Live Tool Search Error]', err.message);
    res.status(500).json({
      success: false,
      error: 'Tool search failed: ' + err.message
    });
  }
});

// ── 3. POST /transcript ───────────────────────────────────────────────────────
// Persists voice turns to conversation history without storing raw audio
router.post('/transcript', authenticateToken, liveLimiter, async (req, res) => {
  try {
    const { role, content } = req.body;
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ success: false, error: 'Transcript content is required.' });
    }

    const cleanRole = role === 'assistant' ? 'assistant' : 'user';
    const cleanContent = content.trim().slice(0, 2000);

    const saved = await conversationService.addMessage({
      userId: req.user.id,
      companyId: req.user.companyId || 'COMP001',
      role: cleanRole,
      content: cleanContent
    });

    res.json({
      success: true,
      message: 'Transcript saved to conversation context.',
      entry: saved
    });
  } catch (err) {
    console.error('[Live Transcript Save Error]', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to record transcript: ' + err.message
    });
  }
});

module.exports = router;

