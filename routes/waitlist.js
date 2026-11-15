const express = require('express');
const router = express.Router();
const dbService = require('../services/dbService');
const { authenticateToken, requireRole } = require('../services/authService');

// POST /api/v2/waitlist — Join waitlist & save vibe
router.post('/', (req, res) => {
  try {
    const { email } = req.body || {};

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'A valid email address is required.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    // Keep duplicate lookups private; the public form must not reveal stored identity data.
    const existing = dbService.findOne('waitlist', m => m.email === cleanEmail);
    if (existing) {
      return res.status(202).json({
        success: true,
        message: 'If the address is eligible, project update interest has been recorded.'
      });
    }

    const allMembers = dbService.find('waitlist') || [];
    const spotNumber = allMembers.length + 1;
    const memberId = `wait_${Date.now()}`;

    const newMember = {
      id: memberId,
      spotNumber,
      email: cleanEmail,
      createdAt: new Date().toISOString()
    };

    dbService.insert('waitlist', newMember);
    dbService.logAudit('COMMUNITY', memberId, 'WAITLIST_SPOT_SAVED', 'Project update interest captured.');

    return res.status(202).json({
      success: true,
      message: 'If the address is eligible, project update interest has been recorded.'
    });
  } catch (err) {
    console.error('[Waitlist API Error]', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to save waitlist reservation.'
    });
  }
});

// GET /api/v2/waitlist/stats — Live public aggregate vibe telemetry
router.get('/stats', (req, res) => {
  try {
    const members = dbService.find('waitlist') || [];
    return res.json({
      success: true,
      totalCount: members.length
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v2/waitlist — Admin list
router.get('/', authenticateToken, requireRole(['Organization_Admin', 'HR_Admin']), (req, res) => {
  try {
    const list = dbService.find('waitlist') || [];
    return res.json({
      success: true,
      count: list.length,
      waitlist: list.map(({ token, ...rest }) => rest)
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
