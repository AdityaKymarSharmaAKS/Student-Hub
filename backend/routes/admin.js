/**
 * F-TECH-Student-Hub Admin Routes
 * Company: F-TECH
 * Founder & Owner: Aditya Kumar Sharma
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateAdmin } = require('../middleware/authentication');

// Authentication
router.post('/login', adminController.login);

// Dashboard Statistics
router.get('/stats', authenticateAdmin, adminController.getStats);

// 1. Documents (Notes, Papers, Labs, Tutorials, Syllabus)
router.get('/documents', authenticateAdmin, adminController.getAllDocumentsAdmin);
router.put('/documents/:id/status', authenticateAdmin, adminController.updateDocumentStatus);
router.delete('/documents/:id', authenticateAdmin, adminController.deleteDocument);

// 2. Subjects & Syllabus
router.get('/subjects', authenticateAdmin, adminController.getAllSubjectsAdmin);
router.post('/subjects', authenticateAdmin, adminController.createSubject);
router.delete('/subjects/:id', authenticateAdmin, adminController.deleteSubject);

// 3. Lab Experiments
router.get('/labs', authenticateAdmin, adminController.getAllLabsAdmin);
router.post('/labs', authenticateAdmin, adminController.createLab);
router.delete('/labs/:id', authenticateAdmin, adminController.deleteLab);

// 4. Community Moderation
router.get('/community/posts', authenticateAdmin, adminController.getAllCommunityPostsAdmin);
router.delete('/community/posts/:id', authenticateAdmin, adminController.deleteCommunityPost);
router.delete('/community/answers/:id', authenticateAdmin, adminController.deleteCommunityAnswer);

// 5. User Accounts Governance
router.get('/users', authenticateAdmin, adminController.getAllUsersAdmin);
router.put('/users/:id/block', authenticateAdmin, adminController.toggleUserBlock);
router.delete('/users/:id', authenticateAdmin, adminController.deleteUser);

// 6. Download Tracking & Audit Trail
router.get('/downloads/logs', authenticateAdmin, adminController.getDownloadLogs);

module.exports = router;
