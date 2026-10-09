/**
 * F-TECH-Student-Hub User Authentication Controller
 * Supports registration, login, and profile fetching for any student/member.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { JWT_SECRET } = require('../middleware/authentication');

exports.register = (req, res) => {
  try {
    const { fullName, email, password, branch, semester } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, message: 'Full name, email, and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if email already exists in users table
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const userBranch = branch || 'CSE';
    const userSem = parseInt(semester, 10) || 1;

    const insert = db.prepare(`
      INSERT INTO users (full_name, email, password_hash, branch, semester, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      fullName.trim(),
      cleanEmail,
      passwordHash,
      userBranch,
      userSem,
      'Student'
    );

    const userId = Number(result.lastInsertRowid);

    const user = {
      id: userId,
      fullName: fullName.trim(),
      email: cleanEmail,
      branch: userBranch,
      semester: userSem,
      role: 'Student'
    };

    res.status(201).json({
      success: true,
      message: `Account created for ${user.fullName}! Please sign in to continue.`,
      email: cleanEmail
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.login = (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email/Username and password are required.' });
    }

    const cleanIdentifier = email.trim().toLowerCase();

    // 1. Check if login matches admin_users table (e.g. 'admin')
    const adminRow = db.prepare('SELECT * FROM admin_users WHERE LOWER(username) = ?').get(cleanIdentifier);
    if (adminRow) {
      const isMatch = bcrypt.compareSync(password, adminRow.password_hash);
      if (isMatch) {
        const user = {
          id: adminRow.id,
          fullName: adminRow.full_name,
          email: adminRow.username,
          branch: 'Administration',
          semester: 0,
          role: adminRow.role || 'SuperAdmin',
          isAdmin: true
        };
        const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
        return res.json({
          success: true,
          message: `Welcome back Administrator, ${user.fullName}!`,
          token,
          user,
          isAdmin: true,
          redirect: '/admin/dashboard.html'
        });
      }
    }

    // 2. Check student users table
    const userRow = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(cleanIdentifier);
    if (!userRow) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Please check your username/email and password.' });
    }

    const isMatch = bcrypt.compareSync(password, userRow.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid password. Please try again.' });
    }

    const user = {
      id: userRow.id,
      fullName: userRow.full_name,
      email: userRow.email,
      branch: userRow.branch,
      semester: userRow.semester,
      role: userRow.role || 'Student',
      isAdmin: false
    };

    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: `Welcome back, ${user.fullName}!`,
      token,
      user,
      isAdmin: false,
      redirect: '/index.html'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMe = (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch fresh details from DB if student user
    const userRow = db.prepare('SELECT id, full_name, email, branch, semester, role FROM users WHERE id = ?').get(decoded.id);

    if (userRow) {
      return res.json({
        success: true,
        user: {
          id: userRow.id,
          fullName: userRow.full_name,
          email: userRow.email,
          branch: userRow.branch,
          semester: userRow.semester,
          role: userRow.role
        }
      });
    }

    res.json({ success: true, user: decoded });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
  }
};
