const express = require('express');
const router = express.Router();
const db = require('../services/dbService');
const { authenticateToken, requireRole } = require('../services/authService');

// GET /api/v2/reports
router.get('/', authenticateToken, (req, res) => {
  const isHRorAdmin = ['HR_Admin', 'Organization_Admin'].includes(req.user.role);
  const { category, status } = req.query;

  let reports;
  if (isHRorAdmin) {
    reports = db.find('reports', r => r.companyId === req.user.companyId);
  } else {
    reports = db.find('reports', r => r.companyId === req.user.companyId && (r.submitterId === req.user.id || r.isAnonymous));
  }

  // Filter if query params provided
  if (category && category !== 'All') {
    reports = reports.filter(r => r.category === category);
  }
  if (status && status !== 'All') {
    reports = reports.filter(r => r.status === status);
  }

  // Sort newest first
  reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({
    success: true,
    count: reports.length,
    reports
  });
});

// GET /api/v2/reports/export (CSV or JSON export with filters)
router.get('/export', authenticateToken, (req, res) => {
  const format = req.query.format || 'csv';
  const isHRorAdmin = ['HR_Admin', 'Organization_Admin'].includes(req.user.role);

  const reports = isHRorAdmin 
    ? db.find('reports', r => r.companyId === req.user.companyId)
    : db.find('reports', r => r.companyId === req.user.companyId && r.submitterId === req.user.id);

  if (format === 'csv') {
    const headers = ['ReportID', 'Category', 'Description', 'Department', 'Status', 'AssignedTo', 'IsAnonymous', 'CreatedAt'];
    const rows = reports.map(r => [
      r.id,
      `"${(r.category || '').replace(/"/g, '""')}"`,
      `"${(r.description || '').replace(/"/g, '""')}"`,
      `"${(r.department || '').replace(/"/g, '""')}"`,
      r.status,
      `"${(r.assignedTo || 'Unassigned').replace(/"/g, '""')}"`,
      r.isAnonymous ? 'Yes' : 'No',
      r.createdAt
    ]);
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="incluai_reports_export.csv"');
    return res.send(csvContent);
  }

  res.json({
    success: true,
    exportedAt: new Date().toISOString(),
    count: reports.length,
    reports
  });
});

// POST /api/v2/reports (Submit report)
router.post('/', authenticateToken, (req, res) => {
  const { title, category, description, department, isAnonymous } = req.body;

  if (!description || !category) {
    return res.status(400).json({ success: false, error: 'Category and description are required.' });
  }

  const reportId = `REP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  
  // True server-side anonymity: Strip submitter ID, user IP, and auth tokens
  const newReport = {
    id: reportId,
    companyId: req.user.companyId,
    title: title ? title.trim() : `${category} Report`,
    category,
    description: description.trim(),
    department: department ? department.trim() : 'General / Unspecified',
    isAnonymous: Boolean(isAnonymous),
    submitterId: isAnonymous ? null : req.user.id,
    submitterName: isAnonymous ? 'Anonymous Employee' : req.user.name,
    status: 'Submitted',
    assignedTo: 'HR Ethics & Inclusion Team',
    internalNotes: [],
    createdAt: new Date().toISOString()
  };

  db.insert('reports', newReport);

  // Notify HR team of new submission
  const hrUsers = db.find('users', u => u.companyId === req.user.companyId && ['HR_Admin', 'Organization_Admin'].includes(u.role));
  hrUsers.forEach(hr => {
    db.insert('notifications', {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      companyId: req.user.companyId,
      userId: hr.id,
      title: 'New Concern Logged',
      message: `A new workplace concern (${reportId}) was logged under ${category}.`,
      type: 'report',
      read: false,
      timestamp: new Date().toISOString()
    });
  });

  db.logAudit(
    req.user.companyId,
    isAnonymous ? '[ANONYMOUS_REDACTED]' : req.user.id,
    'WORKPLACE_REPORT_SUBMITTED',
    `Report ${reportId} submitted under category ${category}.`
  );

  res.status(201).json({
    success: true,
    message: 'Report submitted securely and assigned for confidential review.',
    report: newReport
  });
});

// PATCH /api/v2/reports/:id/status (Requires HR_Admin or Org_Admin)
router.patch('/:id/status', authenticateToken, requireRole(['HR_Admin', 'Organization_Admin']), (req, res) => {
  const { status, assignedTo, internalNote } = req.body;
  const allowedStatuses = ['Submitted', 'Under Review', 'Action Required', 'In Progress', 'Resolved', 'Closed'];

  if (status && !allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}`
    });
  }

  const existing = db.findOne('reports', r => r.id === req.params.id && r.companyId === req.user.companyId);
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Report not found.' });
  }

  const updatedNotes = [...(existing.internalNotes || [])];
  if (internalNote) {
    updatedNotes.push({
      author: req.user.name,
      note: internalNote.trim(),
      timestamp: new Date().toISOString()
    });
  }

  const updated = db.update(
    'reports',
    r => r.id === req.params.id && r.companyId === req.user.companyId,
    r => ({
      ...r,
      status: status || r.status,
      assignedTo: assignedTo ? assignedTo.trim() : r.assignedTo,
      internalNotes: updatedNotes,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.employeeId
    })
  );

  // Notify submitter if identified
  if (existing.submitterId) {
    db.insert('notifications', {
      id: `notif_${Date.now()}`,
      companyId: req.user.companyId,
      userId: existing.submitterId,
      title: 'Report Status Updated',
      message: `Your report ${existing.id} status was updated to: ${status || existing.status}.`,
      type: 'report',
      read: false,
      timestamp: new Date().toISOString()
    });
  }

  db.logAudit(req.user.companyId, req.user.id, 'REPORT_STATUS_UPDATED', `Report ${req.params.id} updated to ${status}`);

  res.json({
    success: true,
    message: `Report status updated to ${status}.`,
    report: updated
  });
});

module.exports = router;
