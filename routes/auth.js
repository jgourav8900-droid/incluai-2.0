const express = require('express');
const router = express.Router();
const db = require('../services/dbService');
const { generateToken, authenticateToken } = require('../services/authService');

// POST /api/v2/auth/signup
router.post('/signup', (req, res) => {
  const { name, email, password, confirmPassword, companyName, role } = req.body;

  // Validation
  if (!name || !email || !password || !companyName) {
    return res.status(400).json({
      success: false,
      error: 'Name, email, password, and company name are required.'
    });
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: 'Please enter a valid work email address.'
    });
  }

  // Password length validation
  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 6 characters long.'
    });
  }

  // Password confirmation check
  if (confirmPassword && password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      error: 'Passwords do not match.'
    });
  }

  // Check duplicate email
  const existingUser = db.findOne('users', u => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(409).json({
      success: false,
      error: 'An account with this email address already exists.'
    });
  }

  // Enforce secure role assignment: Default to 'Employee', only allow non-administrative signup
  // Administrative roles (HR_Admin, Organization_Admin) must be provisioned internally
  const ALLOWED_SIGNUP_ROLES = ['Employee', 'Manager'];
  const assignedRole = ALLOWED_SIGNUP_ROLES.includes(role) ? role : 'Employee';
  const companyId = `COMP_${companyName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)}` || 'COMP001';
  const empId = `EMP${Math.floor(1000 + Math.random() * 9000)}`;

  const initials = name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const newUser = {
    id: `usr_${Date.now()}`,
    companyId,
    companyName: companyName.trim(),
    employeeId: empId,
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash: db.hashPassword(password),
    role: assignedRole,
    department: 'General',
    avatar: initials,
    preferences: {
      theme: 'dark',
      emailNotifications: true,
      language: 'English',
      soundAlerts: false
    },
    createdAt: new Date().toISOString()
  };

  db.insert('users', newUser);
  db.logAudit(companyId, newUser.id, 'USER_SIGNUP', `User ${newUser.email} signed up under ${companyName}.`);

  const token = generateToken(newUser);

  return res.status(201).json({
    success: true,
    message: 'Account created successfully.',
    token,
    user: {
      id: newUser.id,
      companyId: newUser.companyId,
      companyName: newUser.companyName,
      employeeId: newUser.employeeId,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      department: newUser.department,
      avatar: newUser.avatar,
      preferences: newUser.preferences
    }
  });
});

// POST /api/v2/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required.'
    });
  }

  const user = db.findOne('users', u => u.email.toLowerCase() === email.toLowerCase().trim());
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Invalid email or password.'
    });
  }

  const hashedPassword = db.hashPassword(password);
  if (user.passwordHash !== hashedPassword) {
    return res.status(401).json({
      success: false,
      error: 'Invalid email or password.'
    });
  }

  const token = generateToken(user);
  db.logAudit(user.companyId, user.id, 'USER_LOGIN', `User ${user.email} authenticated successfully.`);

  return res.json({
    success: true,
    message: 'Login successful.',
    token,
    user: {
      id: user.id,
      companyId: user.companyId,
      companyName: user.companyName || 'INCLUAI Enterprise',
      employeeId: user.employeeId,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      avatar: user.avatar,
      preferences: user.preferences || { theme: 'dark', emailNotifications: true, language: 'English' }
    }
  });
});

// GET /api/v2/auth/me
router.get('/me', authenticateToken, (req, res) => {
  const user = db.findOne('users', u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found.' });
  }

  return res.json({
    success: true,
    user: {
      id: user.id,
      companyId: user.companyId,
      companyName: user.companyName || 'INCLUAI Enterprise',
      employeeId: user.employeeId,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      avatar: user.avatar,
      preferences: user.preferences || { theme: 'dark', emailNotifications: true, language: 'English' },
      createdAt: user.createdAt
    }
  });
});

// PUT /api/v2/auth/profile
router.put('/profile', authenticateToken, (req, res) => {
  const { name, department } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, error: 'Name cannot be empty.' });
  }

  const updated = db.update(
    'users',
    u => u.id === req.user.id,
    u => ({
      ...u,
      name: name.trim(),
      department: department ? department.trim() : u.department,
      avatar: name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    })
  );

  res.json({
    success: true,
    message: 'Profile updated successfully.',
    user: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      department: updated.department,
      avatar: updated.avatar
    }
  });
});

// PUT /api/v2/auth/password
router.put('/password', authenticateToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, error: 'Current password and new password are required.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, error: 'New password must be at least 6 characters.' });
  }

  const user = db.findOne('users', u => u.id === req.user.id);
  if (!user || user.passwordHash !== db.hashPassword(currentPassword)) {
    return res.status(401).json({ success: false, error: 'Incorrect current password.' });
  }

  db.update(
    'users',
    u => u.id === req.user.id,
    u => ({ ...u, passwordHash: db.hashPassword(newPassword) })
  );

  db.logAudit(req.user.companyId, req.user.id, 'PASSWORD_CHANGE', 'User updated their password.');

  res.json({ success: true, message: 'Password changed successfully.' });
});

// GET /api/v2/auth/demo-accounts
router.get('/demo-accounts', (req, res) => {
  res.json({
    success: true,
    accounts: [
      { email: 'emp@comp001.internal', role: 'Employee', name: 'Maya Patel', defaultPassword: 'password123' },
      { email: 'hr@comp001.internal', role: 'HR_Admin', name: 'Sarah Connor', defaultPassword: 'password123' },
      { email: 'admin@comp001.internal', role: 'Organization_Admin', name: 'David Vance', defaultPassword: 'password123' }
    ]
  });
});

module.exports = router;
