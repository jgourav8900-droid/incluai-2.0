const express = require('express');
const router = express.Router();
const metricsService = require('../services/metricsService');
const { authenticateToken } = require('../services/authService');

// GET /api/v2/observability/metrics
router.get('/metrics', (req, res) => {
  const data = metricsService.getMetrics();
  res.json({
    success: true,
    telemetry: data
  });
});

// GET /api/v2/observability/health
router.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    version: '2.0.0',
    service: 'INCLUAI Kernel',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
