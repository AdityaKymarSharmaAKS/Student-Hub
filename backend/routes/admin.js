/**
 * F-TECH-Student-Hub Admin Routes
 * Company: F-TECH
 * Founder & Owner: Aditya Kumar Sharma
 * 100% Administrative Governance & Real-Time Tracking
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateAdmin } = require('../middleware/authentication');
const { adminAuthLimiter } = require('../middleware/rateLimiter');

// Authentication (Rate-limited against brute-force attacks)
router.post('/login', adminAuthLimiter, adminController.login);

// Dashboard Statistics & Analytics
router.get('/stats', authenticateAdmin, adminController.getStats);

// 1. Documents (Notes, Papers, Labs, Tutorials, Syllabus)
router.get('/documents', authenticateAdmin, adminController.getAllDocumentsAdmin);
router.put('/documents/:id', authenticateAdmin, adminController.updateDocument);
router.put('/documents/:id/status', authenticateAdmin, adminController.updateDocumentStatus);
router.delete('/documents/:id', authenticateAdmin, adminController.deleteDocument);

// 2. Subjects & Syllabus
router.get('/subjects', authenticateAdmin, adminController.getAllSubjectsAdmin);
router.post('/subjects', authenticateAdmin, adminController.createSubject);
router.put('/subjects/:id', authenticateAdmin, adminController.updateSubject);
router.delete('/subjects/:id', authenticateAdmin, adminController.deleteSubject);
router.put('/semesters', authenticateAdmin, adminController.updateMaxSemesters);

// 2B. Subsubjects / Course Units (Modules)
router.get('/subsubjects', authenticateAdmin, adminController.getAllSubsubjectsAdmin);
router.post('/subsubjects', authenticateAdmin, adminController.createSubsubject);
router.put('/subsubjects/:id', authenticateAdmin, adminController.updateSubsubject);
router.delete('/subsubjects/:id', authenticateAdmin, adminController.deleteSubsubject);

// 3. Lab Experiments
router.get('/labs', authenticateAdmin, adminController.getAllLabsAdmin);
router.post('/labs', authenticateAdmin, adminController.createLab);
router.put('/labs/:id', authenticateAdmin, adminController.updateLab);
router.delete('/labs/:id', authenticateAdmin, adminController.deleteLab);

// 4. Community Moderation
router.get('/community/posts', authenticateAdmin, adminController.getAllCommunityPostsAdmin);
router.delete('/community/posts/:id', authenticateAdmin, adminController.deleteCommunityPost);
router.delete('/community/answers/:id', authenticateAdmin, adminController.deleteCommunityAnswer);

// 5. User Accounts Governance
router.get('/users', authenticateAdmin, adminController.getAllUsersAdmin);
router.put('/users/:id/block', authenticateAdmin, adminController.toggleUserBlock);
router.delete('/users/:id', authenticateAdmin, adminController.deleteUser);

// 6. Live User Tracking & Activity Audit Trail
router.get('/users/live-tracking', authenticateAdmin, adminController.getLiveTracking);
router.get('/downloads/logs', authenticateAdmin, adminController.getDownloadLogs);

// 7. Video Tutorials & Playlists
router.get('/tutorials', authenticateAdmin, adminController.getAllTutorialsAdmin);
router.post('/tutorials', authenticateAdmin, adminController.createTutorial);
router.put('/tutorials/:id', authenticateAdmin, adminController.updateTutorial);
router.delete('/tutorials/:id', authenticateAdmin, adminController.deleteTutorial);

module.exports = router;
