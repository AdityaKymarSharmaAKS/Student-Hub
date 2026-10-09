/**
 * F-TECH-Student-Hub Authentication Service
 * Company: F-TECH
 * Founder & Owner: Aditya Kumar Sharma
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { JWT_SECRET } = require('../middleware/authentication');

class AuthService {
  static login(username, password) {
    const admin = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
    if (!admin) {
      throw new Error('Invalid username or credentials');
    }

    const isValid = bcrypt.compareSync(password, admin.password_hash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    const token = jwt.sign(
      {
        id: admin.id,
        username: admin.username,
        name: admin.full_name,
        role: admin.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return {
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        fullName: admin.full_name,
        role: admin.role
      }
    };
  }
}

module.exports = AuthService;
