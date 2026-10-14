/**
 * F-TECH-Student-Hub User Authentication Controller
 * Supports registration, login, and profile fetching for any student/member.
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { JWT_SECRET, verifyTokenWithFallback } = require('../middleware/authentication');
const { validateEmail, validatePassword, validateFullName } = require('../middleware/validator');
const postgresService = require('../services/postgresService');

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

exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({ success: false, message: emailValidation.message });
    }

    const cleanEmail = emailValidation.cleanEmail;

    // Check if user already exists in local DB or Cloud PostgreSQL
    let existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (!existing && postgresService.pool) {
      try {
        const pgCheck = await postgresService.query('SELECT id FROM users WHERE LOWER(email) = $1', [cleanEmail]);
        if (pgCheck && pgCheck.rows && pgCheck.rows.length > 0) {
          existing = pgCheck.rows[0];
        }
      } catch (e) {}
    }

    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with this email is already registered.' });
    }

    // Generate cryptographically secure 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store in local email_verifications table (atomic replace)
    db.prepare(`
      INSERT INTO email_verifications (email, otp, expires_at)
      VALUES (?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET otp = excluded.otp, expires_at = excluded.expires_at
    `).run(cleanEmail, otp, expiresAt);

    // Also persist in Cloud PostgreSQL
    if (postgresService.pool) {
      try {
        await postgresService.query(`
          INSERT INTO email_verifications (email, otp, expires_at, created_at)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (email) DO UPDATE SET otp = EXCLUDED.otp, expires_at = EXCLUDED.expires_at
        `, [cleanEmail, otp, expiresAt]);
      } catch (e) {
        console.warn('[F-TECH Cloud OTP Notice]:', e.message);
      }
    }

    console.log(`[F-TECH Security] Verification OTP generated for ${cleanEmail}: ${otp}`);

    res.json({
      success: true,
      message: 'A 6-digit verification code has been dispatched. Please enter the 6-digit code manually.',
      expiresIn: '10 minutes'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.register = async (req, res) => {
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
    let otpRecord = db.prepare('SELECT * FROM email_verifications WHERE email = ?').get(cleanEmail);

    // Fallback check PostgreSQL for OTP
    if (!otpRecord && postgresService.pool) {
      try {
        const pgOtp = await postgresService.query('SELECT * FROM email_verifications WHERE LOWER(email) = $1', [cleanEmail]);
        if (pgOtp && pgOtp.rows && pgOtp.rows.length > 0) {
          otpRecord = pgOtp.rows[0];
          otpRecord.expires_at = new Date(otpRecord.expires_at).getTime();
        }
      } catch (e) {}
    }

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'No verification code found for this email. Please click "Send Code" first.' });
    }

    const expTime = typeof otpRecord.expires_at === 'number' ? otpRecord.expires_at : new Date(otpRecord.expires_at).getTime();
    if (Date.now() > expTime) {
      db.prepare('DELETE FROM email_verifications WHERE email = ?').run(cleanEmail);
      return res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new code.' });
    }

    if (otpRecord.otp !== cleanOtp) {
      return res.status(400).json({ success: false, message: 'Incorrect verification code. Please check your 6-digit code.' });
    }

    // 5. Check if email was registered concurrently in SQLite or Cloud PostgreSQL
    let existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (!existing && postgresService.pool) {
      try {
        const pgUser = await postgresService.query('SELECT id FROM users WHERE LOWER(email) = $1', [cleanEmail]);
        if (pgUser && pgUser.rows && pgUser.rows.length > 0) {
          existing = pgUser.rows[0];
        }
      } catch (e) {}
    }

    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    // 6. Delete used OTP
    db.prepare('DELETE FROM email_verifications WHERE email = ?').run(cleanEmail);
    if (postgresService.pool) {
      try {
        await postgresService.query('DELETE FROM email_verifications WHERE LOWER(email) = $1', [cleanEmail]);
      } catch (e) {}
    }

    // 7. Hash password and insert user
    const passwordHash = bcrypt.hashSync(password, 10);
    const validBranches = ['CSE', 'IT', 'ECE', 'ME', 'Civil', 'Other'];
    const userBranch = validBranches.includes(branch) ? branch : 'CSE';
    const userSem = Math.min(Math.max(parseInt(semester, 10) || 1, 1), 8);
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1').toString().split(',')[0].trim();
    const userAgent = req.headers['user-agent'] || '';

    const insert = db.prepare(`
      INSERT INTO users (full_name, email, password_hash, branch, semester, role, is_blocked)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `);

    const result = insert.run(
      nameVal.cleanName,
      cleanEmail,
      passwordHash,
      userBranch,
      userSem,
      'Student'
    );

    const newUserId = Number(result.lastInsertRowid);

    // 8. Permanently persist in Cloud PostgreSQL (Neon / Supabase)
    const pgUserData = {
      id: newUserId,
      full_name: nameVal.cleanName,
      email: cleanEmail,
      password_hash: passwordHash,
      branch: userBranch,
      semester: userSem,
      role: 'Student',
      is_blocked: 0,
      last_ip: ip,
      last_user_agent: userAgent
    };
    await postgresService.persistUserToPg(pgUserData);

    // 9. Record live user activity
    postgresService.logActivity({
      userId: newUserId,
      email: cleanEmail,
      name: nameVal.cleanName,
      action: 'REGISTER',
      details: `New Account created (${userBranch}, Semester ${userSem})`,
      ip,
      userAgent
    }, db);

    res.status(201).json({
      success: true,
      message: `Account created for ${nameVal.cleanName}! Please sign in to continue.`,
      email: cleanEmail
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email/Username and password are required.' });
    }

    const cleanIdentifier = email.trim().toLowerCase();
    const envAdminUser = (process.env.ADMIN_USERNAME || 'admin').toLowerCase();
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

    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1').toString().split(',')[0].trim();
    const userAgent = req.headers['user-agent'] || '';

    // 1. Check if login matches admin credentials or aliases
    let adminRow = db.prepare('SELECT * FROM admin_users WHERE LOWER(username) = ?').get(cleanIdentifier);
    if (!adminRow && adminAliases.includes(cleanIdentifier)) {
      adminRow = db.prepare('SELECT * FROM admin_users WHERE username = ?').get('admin');
    }

    if (adminRow) {
      const isMatch = bcrypt.compareSync(password, adminRow.password_hash);
      if (isMatch) {
        const user = {
          id: adminRow.id,
          fullName: adminRow.full_name,
          email: cleanIdentifier,
          username: adminRow.username,
          branch: 'Administration',
          semester: 0,
          role: adminRow.role || 'SuperAdmin',
          isAdmin: true
        };
        const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });

        postgresService.logActivity({
          userId: user.id,
          email: 'admin@ftech',
          name: user.fullName,
          action: 'ADMIN_LOGIN',
          details: 'Administrator signed in to Master Command Center',
          ip,
          userAgent
        }, db);

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

    // 2. Check student / registered users in SQLite
    let userRow = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(cleanIdentifier);

    // If not found in SQLite, check Cloud PostgreSQL and sync down!
    if (!userRow && postgresService.pool) {
      try {
        const pgRes = await postgresService.query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanIdentifier]);
        if (pgRes && pgRes.rows && pgRes.rows.length > 0) {
          const u = pgRes.rows[0];
          db.prepare(`
            INSERT INTO users (full_name, email, password_hash, branch, semester, role, is_blocked)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(email) DO UPDATE SET
              full_name = excluded.full_name,
              password_hash = excluded.password_hash,
              branch = excluded.branch,
              semester = excluded.semester,
              role = excluded.role,
              is_blocked = excluded.is_blocked
          `).run(
            u.full_name,
            u.email,
            u.password_hash,
            u.branch,
            u.semester,
            u.role,
            u.is_blocked ? 1 : 0
          );
          userRow = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(cleanIdentifier);
        }
      } catch (e) {
        console.warn('[F-TECH Cloud User Fetch Error]:', e.message);
      }
    }

    if (!userRow) {
      return res.status(401).json({ success: false, message: 'Invalid username/email or password.' });
    }

    // 3. Enforce suspension / blocked user check
    if (userRow.is_blocked === 1) {
      return res.status(403).json({
        success: false,
        error: 'Your account has been suspended/blocked by administration.',
        message: 'Your account has been suspended by administration. Please contact support.'
      });
    }

    const isMatch = bcrypt.compareSync(password, userRow.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid username/email or password.' });
    }

    const isElevatedAdmin = userRow.role === 'SuperAdmin' || userRow.role === 'Admin';
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

    postgresService.logActivity({
      userId: user.id,
      email: user.email,
      name: user.fullName,
      action: 'LOGIN',
      details: isElevatedAdmin ? 'Admin Sign In' : `Student Sign In (${user.branch}, Sem ${user.semester})`,
      ip,
      userAgent
    }, db);

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
    const decoded = verifyTokenWithFallback(token);

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
