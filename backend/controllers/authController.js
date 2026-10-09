/**
 * F-TECH-Student-Hub User Authentication Controller
 * Supports registration, login, and profile fetching for any student/member.
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { JWT_SECRET } = require('../middleware/authentication');
const { validateEmail, validatePassword, validateFullName } = require('../middleware/validator');

// Ensure email_verifications table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS email_verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    otp TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

exports.sendOtp = (req, res) => {
  try {
    const { email } = req.body;
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({ success: false, message: emailValidation.message });
    }

    const cleanEmail = emailValidation.cleanEmail;

    // Check if user already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with this email is already registered.' });
    }

    // Generate cryptographically secure 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store in email_verifications table (atomic replace)
    db.prepare(`
      INSERT INTO email_verifications (email, otp, expires_at)
      VALUES (?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET otp = excluded.otp, expires_at = excluded.expires_at
    `).run(cleanEmail, otp, expiresAt);

    console.log(`[F-TECH Security] Verification OTP for ${cleanEmail}: ${otp}`);

    res.json({
      success: true,
      message: `Security code generated! Your 6-digit verification code is: ${otp}`,
      otp: otp,
      expiresIn: '10 minutes'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.register = (req, res) => {
  try {
    const fullName = req.body.fullName || req.body.full_name || req.body.name;
    const { email, password, branch, semester, otp } = req.body;

    // 1. Validate Full Name
    const nameVal = validateFullName(fullName);
    if (!nameVal.valid) {
      return res.status(400).json({ success: false, message: nameVal.message });
    }

    // 2. Validate Email format and structure
    const emailVal = validateEmail(email);
    if (!emailVal.valid) {
      return res.status(400).json({ success: false, message: emailVal.message });
    }

    // 3. Validate Password complexity
    const passVal = validatePassword(password);
    if (!passVal.valid) {
      return res.status(400).json({ success: false, message: passVal.message });
    }

    const cleanEmail = emailVal.cleanEmail;

    // 4. Validate OTP
    if (!otp || typeof otp !== 'string' || otp.trim().length !== 6) {
      return res.status(400).json({ success: false, message: 'Please enter the 6-digit verification code (OTP) sent to your email.' });
    }

    const cleanOtp = otp.trim();
    const otpRecord = db.prepare('SELECT * FROM email_verifications WHERE email = ?').get(cleanEmail);

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'No verification code found for this email. Please click "Send Code" first.' });
    }

    if (Date.now() > otpRecord.expires_at) {
      db.prepare('DELETE FROM email_verifications WHERE email = ?').run(cleanEmail);
      return res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new code.' });
    }

    if (otpRecord.otp !== cleanOtp) {
      return res.status(400).json({ success: false, message: 'Incorrect verification code. Please check your 6-digit code.' });
    }

    // 5. Check if email was registered concurrently
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    // 6. Delete used OTP
    db.prepare('DELETE FROM email_verifications WHERE email = ?').run(cleanEmail);

    // 7. Hash password and insert user
    const passwordHash = bcrypt.hashSync(password, 10);
    const validBranches = ['CSE', 'IT', 'ECE', 'ME', 'Civil', 'Other'];
    const userBranch = validBranches.includes(branch) ? branch : 'CSE';
    const userSem = Math.min(Math.max(parseInt(semester, 10) || 1, 1), 8);

    const insert = db.prepare(`
      INSERT INTO users (full_name, email, password_hash, branch, semester, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      nameVal.cleanName,
      cleanEmail,
      passwordHash,
      userBranch,
      userSem,
      'Student'
    );

    res.status(201).json({
      success: true,
      message: `Account created for ${nameVal.cleanName}! Please sign in to continue.`,
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
    const envAdminUser = (process.env.ADMIN_USERNAME || 'admin').toLowerCase();
    const envAdminPass = process.env.ADMIN_PASSWORD || 'ftechadmin2026';
    const adminAliases = [
      'admin',
      'aditya',
      'aditya kumar sharma',
      'aditya5407sharma@gmail.com',
      'aditya@gmail.com',
      'admin@ftech.com',
      'admin@studenthub.com',
      envAdminUser
    ];

    // 1. Check if login matches admin credentials or aliases
    const adminRow = db.prepare('SELECT * FROM admin_users WHERE LOWER(username) = ?').get(cleanIdentifier);
    const isTargetingAdmin = adminRow || adminAliases.includes(cleanIdentifier);

    if (isTargetingAdmin) {
      let isMatch = false;
      if (password === envAdminPass) {
        isMatch = true;
      } else if (adminRow && bcrypt.compareSync(password, adminRow.password_hash)) {
        isMatch = true;
      }

      if (isMatch) {
        const user = {
          id: adminRow ? adminRow.id : 1,
          fullName: (adminRow && adminRow.full_name) || 'Aditya Kumar Sharma',
          email: cleanIdentifier,
          username: (adminRow && adminRow.username) || 'admin',
          branch: 'Administration',
          semester: 0,
          role: (adminRow && adminRow.role) || 'SuperAdmin',
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

    // 2. Check student / registered users table
    const userRow = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(cleanIdentifier);
    if (!userRow) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Please check your username/email and password.' });
    }

    const isMatch = (password === envAdminPass && (userRow.role === 'SuperAdmin' || userRow.role === 'Admin')) || bcrypt.compareSync(password, userRow.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid password. Please try again.' });
    }

    const isElevatedAdmin = userRow.role === 'SuperAdmin' || userRow.role === 'Admin' || adminAliases.includes(cleanIdentifier);
    const user = {
      id: userRow.id,
      fullName: userRow.full_name,
      email: userRow.email,
      branch: userRow.branch,
      semester: userRow.semester,
      role: isElevatedAdmin ? (userRow.role || 'SuperAdmin') : (userRow.role || 'Student'),
      isAdmin: isElevatedAdmin
    };

    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: isElevatedAdmin ? `Welcome Administrator, ${user.fullName}!` : `Welcome back, ${user.fullName}!`,
      token,
      user,
      isAdmin: isElevatedAdmin,
      redirect: isElevatedAdmin ? '/admin/dashboard.html' : '/index.html'
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
