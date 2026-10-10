/**
 * F-TECH-Student-Hub Public Tutorials Routes
 * Company: F-TECH
 * Founder & Owner: Aditya Kumar Sharma
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/tutorials - List tutorials with optional filtering
router.get('/', (req, res) => {
  try {
    const { semester, subject_code, search } = req.query;
    let query = 'SELECT * FROM tutorials WHERE 1=1';
    const params = [];

    if (semester) {
      query += ' AND semester = ?';
      params.push(parseInt(semester, 10));
    }

    if (subject_code) {
      query += ' AND subject_code = ?';
      params.push(subject_code.toUpperCase().trim());
    }

    if (search) {
      query += ' AND (title LIKE ? OR subject_title LIKE ? OR subject_code LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY semester ASC, id ASC';

    const tutorials = db.prepare(query).all(...params);
    res.json({ success: true, count: tutorials.length, data: tutorials });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/tutorials/:id - Get tutorial by ID
router.get('/:id', (req, res) => {
  try {
    const tutorial = db.prepare('SELECT * FROM tutorials WHERE id = ?').get(req.params.id);
    if (!tutorial) {
      return res.status(404).json({ success: false, message: 'Tutorial not found' });
    }
    res.json({ success: true, data: tutorial });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
