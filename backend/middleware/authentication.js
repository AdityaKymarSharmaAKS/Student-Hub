/**
 * F-TECH-Student-Hub Authentication Middleware
 * Company: F-TECH
 * Founder & Owner: Aditya Kumar Sharma
 */

const jwt = require('jsonwebtoken');

// Primary 64-character secret matching .env with legacy fallback support for live deployments
const PRIMARY_JWT_SECRET = process.env.JWT_SECRET || '8d278eff085d21c5e545ec4dc2a711cb2fb8ed9502491f3271e3284f4a669aaf';
const LEGACY_JWT_SECRET = 'f_tech_student_hub_super_secure_jwt_token_2026_aditya';

/**
 * Verifies JWT tokens against primary secret, with graceful fallback to legacy secret
 */
function verifyTokenWithFallback(token) {
  try {
    return jwt.verify(token, PRIMARY_JWT_SECRET);
  } catch (err) {
    if (PRIMARY_JWT_SECRET !== LEGACY_JWT_SECRET) {
      try {
        return jwt.verify(token, LEGACY_JWT_SECRET);
      } catch (legacyErr) {
        throw err;
      }
    }
    throw err;
  }
}

/**
 * Middleware: Enforces that the caller is an authenticated Administrator
 */
function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authorization token required. Please sign in as Administrator.',
      expired: true
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyTokenWithFallback(token);
    const isElevated = decoded && (decoded.isAdmin === true || decoded.role === 'SuperAdmin' || decoded.role === 'Admin');
    if (!isElevated) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Administrator privileges required.'
      });
    }
    req.user = decoded;
    next();
  } catch (error) {
    const isExpired = error.name === 'TokenExpiredError';
    return res.status(401).json({
      success: false,
      message: isExpired
        ? 'Administrator session has expired. Please sign in again.'
        : 'Invalid or expired token. Please sign in again.',
      expired: true,
      errorName: error.name
    });
  }
}

/**
 * Middleware: Enforces that the caller is an authenticated User (Student or Admin)
 * and confirms that the user is not currently blocked.
 */
function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required. Please sign in to access this feature.',
      message: 'Authentication required. Please sign in to access this feature.'
    });
  }

  try {
    const decoded = verifyTokenWithFallback(token);
    
    // Check if user account is blocked in the database
    if (decoded.id && !decoded.isAdmin) {
      const db = require('../config/database');
      const userRow = db.prepare('SELECT is_blocked FROM users WHERE id = ?').get(decoded.id);
      if (userRow && userRow.is_blocked === 1) {
        return res.status(403).json({
          success: false,
          error: 'Your account has been blocked/suspended by administration.',
          message: 'Your account has been suspended by administration.'
        });
      }
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session. Please log in again.',
      expired: true
    });
  }
}

/**
 * Middleware: Soft authentication that extracts user if valid token exists
 */
function optionalUser(req, res, next) {
  const authHeader = req.headers.authorization;
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (token) {
    try {
      const decoded = verifyTokenWithFallback(token);
      req.user = decoded;
    } catch (e) {
      // Ignore token errors for optional routes
    }
  }
  next();
}

module.exports = {
  authenticateAdmin,
  authenticateUser,
  optionalUser,
  JWT_SECRET: PRIMARY_JWT_SECRET,
  verifyTokenWithFallback
};
