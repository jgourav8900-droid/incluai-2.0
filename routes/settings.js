const express = require('express');
const router = express.Router();
const db = require('../services/dbService');
const { authenticateToken } = require('../services/authService');

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', native: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', native: 'Deutsch', flag: '🇩🇪' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ja', name: 'Japanese', native: '日本語', flag: '🇯🇵' }
];

const SUPPORTED_THEMES = [
  { id: 'cyber-dark', name: 'Cyber Midnight', type: 'dark', primary: '#ff8a1f', accent: '#19f0c4', bg: '#06070a' },
  { id: 'obsidian', name: 'Obsidian OLED', type: 'dark', primary: '#00e5ff', accent: '#7c5cff', bg: '#020408' },
  { id: 'emerald', name: 'Matrix Emerald', type: 'dark', primary: '#00ff88', accent: '#10b981', bg: '#03140d' },
  { id: 'royal', name: 'Royal Nebula', type: 'dark', primary: '#ff4fd8', accent: '#8b5cf6', bg: '#0a061a' },
  { id: 'glacier', name: 'Glacier Crisp', type: 'light', primary: '#0284c7', accent: '#0ea5e9', bg: '#f8fafc' },
  { id: 'solar', name: 'Solar Amber', type: 'dark', primary: '#f97316', accent: '#fbbf24', bg: '#120e0a' }
];

// GET /api/v2/settings/meta - Public listing of themes & languages
router.get('/meta', (req, res) => {
  res.json({
    success: true,
    languages: SUPPORTED_LANGUAGES,
    themes: SUPPORTED_THEMES,
    defaultTheme: 'cyber-dark',
    defaultLanguage: 'en'
  });
});

// GET /api/v2/settings
router.get('/', authenticateToken, (req, res) => {
  const user = db.findOne('users', u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found.' });
  }

  res.json({
    success: true,
    preferences: user.preferences || {
      theme: 'cyber-dark',
      emailNotifications: true,
      language: 'en',
      soundAlerts: false
    },
    meta: {
      languages: SUPPORTED_LANGUAGES,
      themes: SUPPORTED_THEMES
    }
  });
});

// PUT /api/v2/settings
router.put('/', authenticateToken, (req, res) => {
  const { theme, emailNotifications, language, soundAlerts } = req.body;

  const validTheme = SUPPORTED_THEMES.some(t => t.id === theme) ? theme : undefined;
  const validLang = SUPPORTED_LANGUAGES.some(l => l.code === language || l.name === language) 
    ? (SUPPORTED_LANGUAGES.find(l => l.code === language || l.name === language)?.code || 'en') 
    : undefined;

  const updated = db.update(
    'users',
    u => u.id === req.user.id,
    u => ({
      ...u,
      preferences: {
        theme: validTheme || (u.preferences && u.preferences.theme) || 'cyber-dark',
        emailNotifications: emailNotifications !== undefined ? Boolean(emailNotifications) : true,
        language: validLang || (u.preferences && u.preferences.language) || 'en',
        soundAlerts: soundAlerts !== undefined ? Boolean(soundAlerts) : false
      }
    })
  );

  db.logAudit(req.user.companyId, req.user.id, 'PREFERENCES_UPDATED', `Updated theme to ${updated.preferences.theme}, language to ${updated.preferences.language}`);

  res.json({
    success: true,
    message: 'Settings saved successfully.',
    preferences: updated.preferences,
    meta: {
      languages: SUPPORTED_LANGUAGES,
      themes: SUPPORTED_THEMES
    }
  });
});

module.exports = router;
