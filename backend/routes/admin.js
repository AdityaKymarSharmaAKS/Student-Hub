/**
 * F-TECH-Student-Hub Admin Routes
 * Company: F-TECH
 * Founder & Owner: Aditya Kumar Sharma
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateAdmin } = require('../middleware/authentication');

// POST /api/admin/login (Admin credentials authentication)
router.post('/login', adminController.login);

// GET /api/admin/stats (Dashboard statistics and counts)
router.get('/stats', authenticateAdmin, adminController.getStats);

// GET /api/admin/documents (Fetch all documents for management)
router.get('/documents', authenticateAdmin, adminController.getAllDocumentsAdmin);

// DELETE /api/admin/documents/:id (Delete a document)
router.delete('/documents/:id', authenticateAdmin, adminController.deleteDocument);

// POST /api/admin/subjects (Add a new subject)
router.post('/subjects', authenticateAdmin, adminController.createSubject);

module.exports = router;
