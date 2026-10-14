/**
 * F-TECH-Student-Hub Subject Controller
 * Company: F-TECH
 * Founder & Owner: Aditya Kumar Sharma
 */

const db = require('../config/database');

// Helper to determine the system's active maximum semesters
function getActiveMaxSemesters() {
  const metaRow = db.prepare("SELECT value FROM system_metadata WHERE key = 'max_semesters'").get();
  const configuredMax = metaRow ? parseInt(metaRow.value, 10) : 8;
  const dbMaxRow = db.prepare("SELECT MAX(semester) as max_sem FROM subjects").get();
  const dbMax = dbMaxRow && dbMaxRow.max_sem ? dbMaxRow.max_sem : 8;
  return Math.max(8, configuredMax, dbMax);
}

// GET /api/subjects/meta/semesters
exports.getSemesters = (req, res) => {
  try {
    const totalSemesters = getActiveMaxSemesters();
    const semestersList = [];

    for (let i = 1; i <= totalSemesters; i++) {
      const countRow = db.prepare("SELECT COUNT(*) as cnt FROM subjects WHERE semester = ?").get(i);
      const sylCountRow = db.prepare(`
        SELECT COUNT(*) as cnt FROM documents 
        WHERE semester = ? AND type = 'syllabus' AND is_approved = 1
      `).get(i);

      semestersList.push({
        semester: i,
        name: `Semester ${i}`,
        subjectsCount: countRow ? countRow.cnt : 0,
        syllabusCount: sylCountRow ? sylCountRow.cnt : 0
      });
    }

    res.json({
      success: true,
      maxSemesters: totalSemesters,
      data: semestersList
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllSubjects = (req, res) => {
  try {
    const { semester, branch, search } = req.query;
    let query = `
      SELECT s.*,
        (SELECT COUNT(*) FROM documents WHERE subject_code = s.code AND type = 'syllabus' AND is_approved = 1) as has_syllabus,
        (SELECT file_name FROM documents WHERE subject_code = s.code AND type = 'syllabus' AND is_approved = 1 ORDER BY id DESC LIMIT 1) as syllabus_file_name,
        (SELECT id FROM documents WHERE subject_code = s.code AND type = 'syllabus' AND is_approved = 1 ORDER BY id DESC LIMIT 1) as syllabus_doc_id
      FROM subjects s 
      WHERE 1=1
    `;
    const params = [];

    if (semester) {
      query += ' AND s.semester = ?';
      params.push(parseInt(semester, 10));
    }
    if (branch && branch !== 'ALL') {
      query += ' AND (s.branch = ? OR s.branch = "Common")';
      params.push(branch);
    }
    if (search) {
      query += ' AND (s.title LIKE ? OR s.code LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY s.semester ASC, s.code ASC';

    const subjects = db.prepare(query).all(...params);
    res.json({ success: true, count: subjects.length, maxSemesters: getActiveMaxSemesters(), data: subjects });
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

    // 1. Fetch official syllabus document (uploaded by admin in DOCX or PDF format)
    const syllabus = db.prepare(`
      SELECT id, title, file_name, file_size, mime_type, author_name, created_at, downloads_count
      FROM documents 
      WHERE subject_code = ? AND type = 'syllabus' AND is_approved = 1 
      ORDER BY id DESC LIMIT 1
    `).get(subject.code);

    // 2. Fetch all other curriculum subjects belonging to this same semester
    const semesterSubjects = db.prepare(`
      SELECT s.id, s.code, s.title, s.credits, s.branch,
        (SELECT id FROM documents WHERE subject_code = s.code AND type = 'syllabus' AND is_approved = 1 ORDER BY id DESC LIMIT 1) as syllabus_doc_id,
        (SELECT file_name FROM documents WHERE subject_code = s.code AND type = 'syllabus' AND is_approved = 1 ORDER BY id DESC LIMIT 1) as syllabus_file_name
      FROM subjects s 
      WHERE s.semester = ? 
      ORDER BY s.code ASC
    `).all(subject.semester);

    // 3. Get total semesters configuration
    const totalSemesters = getActiveMaxSemesters();

    res.json({
      success: true,
      data: {
        ...subject,
        syllabus: syllabus || null,
        semesterSubjects: semesterSubjects || [],
        totalSemesters
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
