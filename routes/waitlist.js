const express = require('express');
const router = express.Router();
const dbService = require('../services/dbService');
const { authenticateToken, requireRole } = require('../services/authService');

// POST /api/v2/waitlist — Join waitlist & save vibe
router.post('/', (req, res) => {
  try {
    const { name, email, mood, hype, msg } = req.body || {};

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'A valid email address is required.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name && typeof name === 'string' && name.trim()) ? name.trim() : 'friend';
    const cleanMood = (mood && typeof mood === 'string') ? mood.trim() : 'running on iced coffee';
    const numHype = Number.isFinite(Number(hype)) ? Math.max(0, Math.min(100, Number(hype))) : 70;
    const cleanMsg = (msg && typeof msg === 'string') ? msg.trim() : '';

    // Check if already registered
    const existing = dbService.findOne('waitlist', m => m.email === cleanEmail);
    if (existing) {
      return res.status(200).json({
        success: true,
        alreadyRegistered: true,
        message: `Welcome back, ${existing.name}! You have spot #${existing.spotNumber}.`,
        member: {
          id: existing.id,
          name: existing.name,
          email: existing.email,
          mood: existing.mood,
          hype: existing.hype,
          spotNumber: existing.spotNumber,
          role: 'Early Member (VIP)',
          companyId: 'COMP001',
          department: 'Early Access Collective',
          employeeId: `EARLY_${existing.spotNumber}`,
          avatar: existing.name ? existing.name.charAt(0).toUpperCase() : '✦'
        },
      });
    }

    const allMembers = dbService.find('waitlist') || [];
    const baseCount = 248; // early batch offset
    const spotNumber = baseCount + allMembers.length + 1;
    const memberId = `wait_${Date.now()}`;

    const newMember = {
      id: memberId,
      spotNumber,
      name: cleanName,
      email: cleanEmail,
      mood: cleanMood,
      hype: numHype,
      msg: cleanMsg,
      createdAt: new Date().toISOString()
    };

    dbService.insert('waitlist', newMember);
    dbService.logAudit('COMMUNITY', memberId, 'WAITLIST_SPOT_SAVED', `Spot #${spotNumber} reserved for ${cleanEmail} (Mood: "${cleanMood}")`);

    return res.status(201).json({
      success: true,
      message: `You're in! Spot #${spotNumber} is reserved for you.`,
      member: {
        id: newMember.id,
        name: newMember.name,
        email: newMember.email,
        mood: newMember.mood,
        hype: newMember.hype,
        spotNumber: newMember.spotNumber,
        role: 'Early Member (VIP)',
        department: 'Early Access Collective',
        employeeId: `EARLY_${spotNumber}`,
        avatar: cleanName ? cleanName.charAt(0).toUpperCase() : '✦'
      },
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
    const baseCount = 248;
    const totalCount = baseCount + members.length;
    
    let totalHype = 84 * baseCount;
    const moodCounts = {
      'running on iced coffee': 96,
      'need to touch grass': 64,
      'soft but unbothered': 52,
      'in my overthinking era': 36
    };

    members.forEach(m => {
      totalHype += (m.hype || 70);
      const moodKey = m.mood || 'running on iced coffee';
      moodCounts[moodKey] = (moodCounts[moodKey] || 0) + 1;
    });

    const averageHype = Math.round(totalHype / (totalCount || 1));

    const recent = members.slice(-6).reverse().map(m => {
      const parts = m.name.split(' ');
      const masked = parts[0] + (parts.length > 1 ? ` ${parts[1][0]}.` : '');
      return {
        name: masked,
        mood: m.mood,
        spotNumber: m.spotNumber,
        createdAt: m.createdAt
      };
    });

    return res.json({
      success: true,
      totalCount,
      averageHype,
      moodCounts,
      recent
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
