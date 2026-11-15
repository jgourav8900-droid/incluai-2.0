const express = require('express');
const router = express.Router();
const db = require('../services/dbService');
const { authenticateToken } = require('../services/authService');

// GET /api/v2/messages
router.get('/', authenticateToken, (req, res) => {
  const messages = db.find('messages', m => 
    m.companyId === req.user.companyId && 
    (m.toUserId === req.user.id || m.fromUserId === req.user.id)
  );

  messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  res.json({
    success: true,
    count: messages.length,
    messages
  });
});

// POST /api/v2/messages
router.post('/', authenticateToken, (req, res) => {
  const { toUserId, text } = req.body;

  if (!text || !toUserId) {
    return res.status(400).json({ success: false, error: 'Recipient and message text are required.' });
  }

  const recipient = db.findOne('users', u => u.id === toUserId && u.companyId === req.user.companyId);
  if (!recipient) {
    return res.status(404).json({ success: false, error: 'Recipient user not found in this organization.' });
  }

  const newMsg = {
    id: `msg_${Date.now()}`,
    companyId: req.user.companyId,
    fromUserId: req.user.id,
    fromName: req.user.name,
    toUserId: recipient.id,
    toName: recipient.name,
    text: text.trim(),
    timestamp: new Date().toISOString(),
    read: false
  };

  db.insert('messages', newMsg);

  res.status(201).json({
    success: true,
    message: 'Message delivered.',
    messageRecord: newMsg
  });
});

module.exports = router;
