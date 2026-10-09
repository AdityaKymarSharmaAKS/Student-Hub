/**
 * F-TECH-Student-Hub Authentication Middleware
 * Company: F-TECH
 * Founder & Owner: Aditya Kumar Sharma
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'f_tech_student_hub_super_secure_jwt_token_2026_aditya';

function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }
}

module.exports = {
  authenticateAdmin,
  JWT_SECRET
};
