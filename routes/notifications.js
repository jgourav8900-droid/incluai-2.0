const express = require('express');
const router = express.Router();
const db = require('../services/dbService');
const { authenticateToken } = require('../services/authService');

// GET /api/v2/notifications
router.get('/', authenticateToken, (req, res) => {
  const notifs = db.find('notifications', n => 
    n.companyId === req.user.companyId && n.userId === req.user.id
  );

  notifs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const unreadCount = notifs.filter(n => !n.read).length;

  res.json({
    success: true,
    unreadCount,
    notifications: notifs
  });
});

// PATCH /api/v2/notifications/:id/read
router.patch('/:id/read', authenticateToken, (req, res) => {
  const updated = db.update(
    'notifications',
    n => n.id === req.params.id && n.userId === req.user.id,
    n => ({ ...n, read: true })
  );

  if (!updated) {
    return res.status(404).json({ success: false, error: 'Notification not found.' });
  }

  res.json({ success: true, notification: updated });
});

// POST /api/v2/notifications/mark-all-read
router.post('/mark-all-read', authenticateToken, (req, res) => {
  const rawDb = db.read();
  (rawDb.notifications || []).forEach(n => {
    if (n.userId === req.user.id && n.companyId === req.user.companyId) {
      n.read = true;
    }
  });
  db.write(rawDb);

  res.json({ success: true, message: 'All notifications marked as read.' });
});

module.exports = router;
