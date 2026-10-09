/**
 * F-TECH-Student-Hub Subject Controller
 * Company: F-TECH
 * Founder & Owner: Aditya Kumar Sharma
 */

const db = require('../config/database');

exports.getAllSubjects = (req, res) => {
  try {
    const { semester, branch, search } = req.query;
    let query = 'SELECT * FROM subjects WHERE 1=1';
    const params = [];

    if (semester) {
      query += ' AND semester = ?';
      params.push(parseInt(semester, 10));
    }
    if (branch && branch !== 'ALL') {
      query += ' AND (branch = ? OR branch = "Common")';
      params.push(branch);
    }
    if (search) {
      query += ' AND (title LIKE ? OR code LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY semester ASC, code ASC';

    const subjects = db.prepare(query).all(...params);
    res.json({ success: true, count: subjects.length, data: subjects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSubjectByCode = (req, res) => {
  try {
    const { code } = req.params;
    const subject = db.prepare('SELECT * FROM subjects WHERE code = ?').get(code.toUpperCase());
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    // Get associated documents
    const documents = db.prepare('SELECT * FROM documents WHERE subject_code = ? ORDER BY type, unit ASC').all(subject.code);
    
    // Get associated lab experiments
    const labs = db.prepare('SELECT * FROM lab_experiments WHERE subject_code = ? ORDER BY exp_no ASC').all(subject.code);

    res.json({
      success: true,
      data: {
        ...subject,
        documents,
        labs
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSubjectLabs = (req, res) => {
  try {
    const { code } = req.params;
    let query = 'SELECT * FROM lab_experiments WHERE 1=1';
    const params = [];

    if (code) {
      query += ' AND subject_code = ?';
      params.push(code.toUpperCase());
    }
    query += ' ORDER BY exp_no ASC';

    const labs = db.prepare(query).all(...params);
    res.json({ success: true, count: labs.length, data: labs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
