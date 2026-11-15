/**
 * Advanced AI Intelligence Routes — Phase C
 *
 * Exposes 5 enterprise AI features:
 *  POST /api/v2/copilot/advanced/meeting-summary   – Summarize transcript, extract action items
 *  POST /api/v2/copilot/advanced/sentiment         – Analyze sentiment and inclusion climate
 *  POST /api/v2/copilot/advanced/executive-report  – Auto-generate executive management summaries
 *  GET  /api/v2/copilot/advanced/workplace-risks   – Detect systemic hotspots & SLA bottlenecks
 *  POST /api/v2/copilot/advanced/check-accessibility – Evaluate WCAG compliance of descriptions
 */

const express = require('express');
const router = express.Router();
const advancedAiService = require('../services/advancedAiService');
const { authenticateToken, requireRole } = require('../services/authService');

// 1. AI Meeting Assistant
router.post('/meeting-summary', authenticateToken, async (req, res) => {
  try {
    const { transcript, meetingTitle, attendees, department } = req.body;
    if (!transcript) {
      return res.status(400).json({ success: false, error: 'Meeting transcript is required.' });
    }

    const summary = await advancedAiService.summarizeMeeting(transcript, {
      meetingTitle,
      attendees,
      department: department || req.user.department
    });

    res.json(summary);
  } catch (err) {
    console.error('[Meeting Assistant Error]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Employee Sentiment Analysis
router.post('/sentiment', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: 'Text string is required for sentiment analysis.' });
    }

    const analysis = await advancedAiService.analyzeSentiment(text, {
      userId: req.user.id,
      companyId: req.user.companyId
    });

    res.json(analysis);
  } catch (err) {
    console.error('[Sentiment Analysis Error]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. AI Report Generator (Executive Summaries - HR & Org Admin)
router.post('/executive-report', authenticateToken, requireRole(['HR_Admin', 'Organization_Admin']), async (req, res) => {
  try {
    const report = await advancedAiService.generateExecutiveReport(req.user.companyId);
    res.json(report);
  } catch (err) {
    console.error('[Report Generator Error]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Workplace Risk Detection (HR & Org Admin)
router.get('/workplace-risks', authenticateToken, requireRole(['HR_Admin', 'Organization_Admin']), async (req, res) => {
  try {
    const risks = await advancedAiService.detectWorkplaceRisks(req.user.companyId);
    res.json(risks);
  } catch (err) {
    console.error('[Risk Detection Error]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Accessibility Assistant (Interactive WCAG checker)
router.post('/check-accessibility', authenticateToken, async (req, res) => {
  try {
    const { description } = req.body;
    if (!description) {
      return res.status(400).json({ success: false, error: 'Description is required to audit accessibility.' });
    }

    const audit = await advancedAiService.checkAccessibility(description);
    res.json(audit);
  } catch (err) {
    console.error('[Accessibility Assistant Error]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

