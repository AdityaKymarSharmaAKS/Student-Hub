/**
 * F-TECH-Student-Hub Documents Routes
 * Company: F-TECH
 * Founder & Owner: Aditya Kumar Sharma
 */

const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { upload, handleUploadErrors } = require('../middleware/upload-validation');

// GET /api/documents (filter by type, subject, semester, branch, year, unit)
router.get('/', documentController.getDocuments);

// GET /api/documents/:id (single document details)
router.get('/:id', documentController.getDocumentById);

// GET /api/documents/:id/download (download document file)
router.get('/:id/download', documentController.downloadDocument);

// POST /api/documents/:id/vote (like or dislike document)
router.post('/:id/vote', documentController.voteDocument);

// POST /api/documents/upload (upload notes/papers with file)
router.post('/upload', upload.single('file'), handleUploadErrors, documentController.uploadDocument);

module.exports = router;
