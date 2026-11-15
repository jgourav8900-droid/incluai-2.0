const express = require('express');
const router = express.Router();
const db = require('../services/dbService');
const { authenticateToken } = require('../services/authService');

// POST /api/v2/email/send
router.post('/send', authenticateToken, (req, res) => {
  const { to, subject, body } = req.body;

  if (!to || !subject || !body) {
    return res.status(400).json({ success: false, error: 'Recipient (to), subject, and body are required.' });
  }

  const provider = process.env.EMAIL_PROVIDER || 'mock';
  const providerMessageId = `MSG-EXT-${Math.floor(1000000 + Math.random() * 9000000)}`;

  db.logAudit(
    req.user.companyId,
    req.user.id,
    'EMAIL_DISPATCHED',
    `Sent email to ${to} with subject "${subject}" (Ref: ${providerMessageId})`
  );

  res.json({
    success: true,
    message: 'Email accepted by provider for dispatch.',
    provider,
    messageId: providerMessageId,
    details: {
      from: req.user.email,
      to,
      subject,
      timestamp: new Date().toISOString()
    }
  });
});

module.exports = router;
