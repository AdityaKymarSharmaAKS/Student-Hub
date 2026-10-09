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
    const cleanUser = (username || '').trim().toLowerCase();
    const envAdminUser = (process.env.ADMIN_USERNAME || 'admin').toLowerCase();
    const envAdminPass = process.env.ADMIN_PASSWORD || 'ftechadmin2026';
    const adminAliases = ['admin', 'aditya', 'aditya kumar sharma', 'aditya5407sharma@gmail.com', 'aditya@gmail.com', 'admin@ftech.com', envAdminUser];

    let admin = db.prepare('SELECT * FROM admin_users WHERE LOWER(username) = ?').get(cleanUser);
    if (!admin && adminAliases.includes(cleanUser)) {
      admin = db.prepare('SELECT * FROM admin_users WHERE username = ?').get('admin');
    }

    if (!admin) {
      throw new Error('Invalid username or credentials');
    }

    const isValid = (password === envAdminPass) || bcrypt.compareSync(password, admin.password_hash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    const token = jwt.sign(
      {
        id: admin.id,
        username: admin.username,
        name: admin.full_name,
        fullName: admin.full_name,
        role: admin.role || 'SuperAdmin',
        isAdmin: true
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        fullName: admin.full_name,
        role: admin.role || 'SuperAdmin',
        isAdmin: true
      },
      user: {
        id: admin.id,
        fullName: admin.full_name,
        email: admin.username,
        role: admin.role || 'SuperAdmin',
        isAdmin: true
      },
      isAdmin: true,
      redirect: '/admin/dashboard.html'
    };
  }
}

module.exports = AuthService;
