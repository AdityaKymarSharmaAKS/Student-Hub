/**
 * F-TECH-Student-Hub Subjects Routes
 * Company: F-TECH
 * Founder & Owner: Aditya Kumar Sharma
 */

const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');

// GET /api/subjects (list with optional filters)
router.get('/', subjectController.getAllSubjects);

// GET /api/subjects/labs (list all or filtered labs)
router.get('/labs/all', subjectController.getSubjectLabs);

// GET /api/subjects/:code (subject details, syllabus, notes, labs)
router.get('/:code', subjectController.getSubjectByCode);

// GET /api/subjects/:code/labs (subject specific lab experiments)
router.get('/:code/labs', subjectController.getSubjectLabs);

module.exports = router;
