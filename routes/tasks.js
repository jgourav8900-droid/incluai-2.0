const express = require('express');
const router = express.Router();
const db = require('../services/dbService');
const { authenticateToken } = require('../services/authService');

// GET /api/v2/tasks
router.get('/', authenticateToken, (req, res) => {
  const isHRorAdmin = ['HR_Admin', 'Organization_Admin'].includes(req.user.role);

  let tasks;
  if (isHRorAdmin) {
    tasks = db.find('tasks', t => t.companyId === req.user.companyId);
  } else {
    tasks = db.find('tasks', t => t.companyId === req.user.companyId && (t.userId === req.user.id || !t.userId));
  }

  // Sort newest first
  tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({
    success: true,
    count: tasks.length,
    tasks
  });
});

// POST /api/v2/tasks
router.post('/', authenticateToken, (req, res) => {
  const { title, description, priority, deadline, status, assignedTo } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, error: 'Task title is required.' });
  }

  const validPriorities = ['Low', 'Medium', 'High', 'Urgent'];
  const validStatuses = ['Pending', 'In Progress', 'Completed'];

  const newTask = {
    id: `tsk_${Date.now()}`,
    companyId: req.user.companyId,
    userId: req.user.id,
    creatorName: req.user.name,
    title: title.trim(),
    description: description ? description.trim() : '',
    priority: validPriorities.includes(priority) ? priority : 'Medium',
    status: validStatuses.includes(status) ? status : 'Pending',
    deadline: deadline || new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    assignedTo: assignedTo ? assignedTo.trim() : req.user.name,
    createdAt: new Date().toISOString()
  };

  db.insert('tasks', newTask);
  db.logAudit(req.user.companyId, req.user.id, 'TASK_CREATED', `Created task: ${newTask.title}`);

  res.status(201).json({
    success: true,
    message: 'Task created successfully.',
    task: newTask
  });
});

// PUT /api/v2/tasks/:id (Edit task)
router.put('/:id', authenticateToken, (req, res) => {
  const { title, description, priority, deadline, status, assignedTo } = req.body;

  const isHRorAdmin = ['HR_Admin', 'Organization_Admin'].includes(req.user.role);

  const existing = db.findOne('tasks', t => t.id === req.params.id && t.companyId === req.user.companyId);
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Task not found.' });
  }

  // Authorization check: User must own the task or be HR/Admin
  if (!isHRorAdmin && existing.userId !== req.user.id) {
    return res.status(403).json({ success: false, error: 'You are not authorized to edit this task.' });
  }

  const updated = db.update(
    'tasks',
    t => t.id === req.params.id,
    t => ({
      ...t,
      title: title ? title.trim() : t.title,
      description: description !== undefined ? description.trim() : t.description,
      priority: priority || t.priority,
      deadline: deadline || t.deadline,
      status: status || t.status,
      assignedTo: assignedTo !== undefined ? assignedTo.trim() : t.assignedTo,
      updatedAt: new Date().toISOString()
    })
  );

  res.json({
    success: true,
    message: 'Task updated successfully.',
    task: updated
  });
});

// DELETE /api/v2/tasks/:id
router.delete('/:id', authenticateToken, (req, res) => {
  const isHRorAdmin = ['HR_Admin', 'Organization_Admin'].includes(req.user.role);

  const existing = db.findOne('tasks', t => t.id === req.params.id && t.companyId === req.user.companyId);
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Task not found.' });
  }

  if (!isHRorAdmin && existing.userId !== req.user.id) {
    return res.status(403).json({ success: false, error: 'You are not authorized to delete this task.' });
  }

  // Remove task from DB
  const rawDb = db.read();
  rawDb.tasks = (rawDb.tasks || []).filter(t => t.id !== req.params.id);
  db.write(rawDb);

  db.logAudit(req.user.companyId, req.user.id, 'TASK_DELETED', `Deleted task ${req.params.id}`);

  res.json({
    success: true,
    message: 'Task deleted successfully.'
  });
});

module.exports = router;
