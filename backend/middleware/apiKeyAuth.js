/**
 * F-TECH-Student-Hub API Key Gateway Authentication Middleware
 * Company: F-TECH
 * Founder & Owner: Aditya Kumar Sharma
 * Description: Separates frontend and backend via secure X-API-Key validation header.
 */

const API_KEY = process.env.API_KEY || 'ftech_studenthub_api_sec_9941a87c5b632049e31d87f7';

function verifyApiKey(req, res, next) {
  const rawUrl = req.originalUrl || req.url || '';
  
  // Allow health endpoint without API key
  if (rawUrl.includes('/api/health')) {
    return next();
  }

  // Check header or query parameter (query param supports browser direct file download triggers)
  const clientKey = req.headers['x-api-key'] || req.query.apiKey || req.query.api_key;

  if (!clientKey || clientKey.trim() !== API_KEY) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Valid API key required. Missing or invalid F-TECH API Key (X-API-Key).',
      message: 'Access Denied: Missing or invalid F-TECH API Key (X-API-Key). Please connect with authorized gateway credentials.'
    });
  }

  next();
}

module.exports = {
  verifyApiKey,
  API_KEY
};
