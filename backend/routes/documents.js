/**
 * F-TECH-Student-Hub Documents Routes
 * Company: F-TECH
 * Founder & Owner: Aditya Kumar Sharma
 */

const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { upload, handleUploadErrors } = require('../middleware/upload-validation');
const { optionalUser, authenticateUser } = require('../middleware/authentication');
const { uploadLimiter } = require('../middleware/rateLimiter');

// GET /api/documents (filter by type, subject, semester, branch, year, unit)
router.get('/', optionalUser, documentController.getDocuments);

// GET /api/documents/:id (single document details)
router.get('/:id', optionalUser, documentController.getDocumentById);

// GET /api/documents/:id/download (download document file - authentication required)
router.get('/:id/download', authenticateUser, documentController.downloadDocument);

// POST /api/documents/:id/vote (like or dislike document)
router.post('/:id/vote', optionalUser, documentController.voteDocument);

// POST /api/documents/upload (upload notes/papers with file, rate-limited - authentication required)
router.post('/upload', uploadLimiter, authenticateUser, upload.single('file'), handleUploadErrors, documentController.uploadDocument);

module.exports = router;
