/**
 * F-TECH-Student-Hub User Authentication Routes
 * Hardened with rate-limiting and email verification OTP endpoints
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authLimiter, otpLimiter } = require('../middleware/rateLimiter');

// POST /api/auth/send-otp (Rate-limited, generates and verifies email)
router.post('/send-otp', otpLimiter, authController.sendOtp);

// POST /api/auth/register (Rate-limited, requires strict validation & valid OTP)
router.post('/register', authLimiter, authController.register);

// POST /api/auth/login (Rate-limited against brute-force attacks)
router.post('/login', authLimiter, authController.login);

// GET /api/auth/me
router.get('/me', authController.getMe);

module.exports = router;
