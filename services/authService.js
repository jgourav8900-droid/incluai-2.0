const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : crypto.randomBytes(64).toString('hex'));
if (process.env.NODE_ENV === 'production' && JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be configured with at least 32 characters in production.');
}

function generateToken(user) {
  const payload = {
    id: user.id,
    companyId: user.companyId,
    employeeId: user.employeeId,
    email: user.email,
    role: user.role,
    name: user.name,
    department: user.department
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required. Please sign in.'
    });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired session token.'
    });
  }

  req.user = decoded;
  next();
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }
    
    // Normalize role string comparison
    const userRole = req.user.role;
    if (!allowedRoles.includes(userRole) && userRole !== 'Organization_Admin') {
      return res.status(403).json({
        success: false,
        error: `Forbidden: This operation requires one of [${allowedRoles.join(', ')}] permissions.`
      });
    }
    next();
  };
}

module.exports = {
  generateToken,
  verifyToken,
  authenticateToken,
  requireRole
};
