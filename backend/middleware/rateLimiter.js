/**
 * F-TECH-Student-Hub In-Memory Rate Limiter Middleware
 * Protects auth endpoints against brute force and automated spam attacks.
 */

const requestCounts = new Map();

// Periodic cleanup of expired rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestCounts.entries()) {
    if (now > record.resetTime) {
      requestCounts.delete(key);
    }
  }
}, 5 * 60 * 1000);

function getClientIp(req) {
  if (req.ip) return req.ip;
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const list = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    return list.trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 20, message = 'Too many requests. Please try again later.' }) {
  return function rateLimiter(req, res, next) {
    const ip = getClientIp(req);
    const routePath = req.originalUrl ? req.originalUrl.split('?')[0] : (req.baseUrl || '') + (req.path || '');
    const key = `${routePath}:${ip}`;
    const now = Date.now();

    let record = requestCounts.get(key);
    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs
      };
      requestCounts.set(key, record);
      return next();
    }

    record.count += 1;
    if (record.count > max) {
      const waitSeconds = Math.ceil((record.resetTime - now) / 1000);
      return res.status(429).json({
        success: false,
        message: `${message} Please wait ${waitSeconds} seconds before trying again.`
      });
    }

    next();
  };
}

const authLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: 'Too many authentication attempts from your device.'
});

const adminAuthLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many administrative sign-in attempts. Please wait a few moments before trying again.'
});

const otpLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 15,
  message: 'Too many verification code requests.'
});

const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 15,
  message: 'Upload frequency exceeded. Please wait before submitting more academic materials.'
});

module.exports = {
  authLimiter,
  adminAuthLimiter,
  otpLimiter,
  uploadLimiter
};
