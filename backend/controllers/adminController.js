/**
 * F-TECH-Student-Hub Admin Controller
 * Company: F-TECH
 * Founder & Owner: Aditya Kumar Sharma
 */

const db = require('../config/database');
const AuthService = require('../services/authService');
const StorageService = require('../services/storageService');
const postgresService = require('../services/postgresService');

exports.login = (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const authData = AuthService.login(username, password);
    res.json({
      success: true,
      message: 'Admin authentication successful. Welcome to F-TECH Student-Hub!',
      ...authData
    });
  } catch (error) {
    res.status(401).json({ success: false, message: error.message });
  }
};

exports.verifyToken = (req, res) => {
  res.json({
    success: true,
    valid: true,
    admin: req.user
  });
};

exports.getStats = (req, res) => {
  try {
    const subjectsCount = db.prepare('SELECT COUNT(*) as count FROM subjects').get().count;
    const documentsCount = db.prepare('SELECT COUNT(*) as count FROM documents').get().count;
    const totalDownloads = db.prepare('SELECT SUM(downloads_count) as total FROM documents').get().total || 0;
    const totalViews = db.prepare('SELECT SUM(views_count) as total FROM documents').get().total || 0;
    const totalLikes = db.prepare('SELECT SUM(likes_count) as total FROM documents').get().total || 0;
    const totalDislikes = db.prepare('SELECT SUM(dislikes_count) as total FROM documents').get().total || 0;
    const postsCount = db.prepare('SELECT COUNT(*) as count FROM community_posts').get().count;
    const papersCount = db.prepare("SELECT COUNT(*) as count FROM documents WHERE type = 'aktu-paper'").get().count;
    const notesCount = db.prepare("SELECT COUNT(*) as count FROM documents WHERE type = 'notes'").get().count;
    const labsCount = db.prepare('SELECT COUNT(*) as count FROM lab_experiments').get().count;
    const tutorialsCount = db.prepare('SELECT COUNT(*) as count FROM tutorials').get().count;
    const usersCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const blockedDocsCount = db.prepare('SELECT COUNT(*) as count FROM documents WHERE is_approved = 0').get().count;

    const recentDownloads = db.prepare(`
      SELECT dd.id, dd.user_email, dd.user_name, dd.ip_address, dd.downloaded_at,
             d.title as doc_title, d.subject_code, d.type as doc_type
      FROM document_downloads dd
      LEFT JOIN documents d ON dd.document_id = d.id
      ORDER BY dd.id DESC
      LIMIT 6
    `).all();

    res.json({
      success: true,
      stats: {
        subjectsCount,
        documentsCount,
        totalDownloads,
        totalViews,
        totalLikes,
        totalDislikes,
        postsCount,
        papersCount,
        notesCount,
        labsCount,
        tutorialsCount,
        usersCount,
        blockedDocsCount,
        company: 'F-TECH',
        founder: 'Aditya Kumar Sharma'
      },
      recentDownloads
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------------------------------------------------
// 1. DOCUMENTS MANAGEMENT
// -------------------------------------------------------------
exports.getAllDocumentsAdmin = (req, res) => {
  try {
    const docs = db.prepare('SELECT * FROM documents ORDER BY id DESC').all();
    res.json({ success: true, count: docs.length, data: docs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateDocumentStatus = (req, res) => {
  try {
    const { id } = req.params;
    const { is_approved } = req.body;
    const statusVal = is_approved ? 1 : 0;

    const doc = db.prepare('SELECT id, title FROM documents WHERE id = ?').get(id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    db.prepare('UPDATE documents SET is_approved = ? WHERE id = ?').run(statusVal, id);
    res.json({
      success: true,
      message: `Document "${doc.title}" has been ${statusVal === 1 ? 'Approved / Unblocked' : 'Blocked'}`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteDocument = (req, res) => {
  try {
    const { id } = req.params;
    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    if (doc.file_path) {
      StorageService.deleteFile(doc.file_path);
    }

    // Delete related download logs and votes
    db.prepare('DELETE FROM document_downloads WHERE document_id = ?').run(id);
    db.prepare('DELETE FROM document_votes WHERE document_id = ?').run(id);
    db.prepare('DELETE FROM documents WHERE id = ?').run(id);

    res.json({ success: true, message: `Document "${doc.title}" removed permanently` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateDocument = (req, res) => {
  try {
    const { id } = req.params;
    const { title, type, subject_code, semester, unit, author_name, is_approved } = req.body;
    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const cleanTitle = (title || doc.title).trim();
    const cleanType = type || doc.type;
    const cleanSubCode = subject_code ? subject_code.toUpperCase().trim() : doc.subject_code;
    const cleanSem = parseInt(semester, 10) || doc.semester;
    const cleanUnit = parseInt(unit, 10) || doc.unit;
    const cleanAuthor = (author_name || doc.author_name).trim();
    const approvedVal = is_approved !== undefined ? (is_approved ? 1 : 0) : doc.is_approved;

    db.prepare(`
      UPDATE documents
      SET title = ?, type = ?, subject_code = ?, semester = ?, unit = ?, author_name = ?, is_approved = ?
      WHERE id = ?
    `).run(cleanTitle, cleanType, cleanSubCode, cleanSem, cleanUnit, cleanAuthor, approvedVal, id);

    res.json({ success: true, message: `Document "${cleanTitle}" updated successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------------------------------------------------
// 2. SUBJECTS & SYLLABUS MANAGEMENT
// -------------------------------------------------------------
exports.getAllSubjectsAdmin = (req, res) => {
  try {
    const metaRow = db.prepare("SELECT value FROM system_metadata WHERE key = 'max_semesters'").get();
    const configuredMax = metaRow ? parseInt(metaRow.value, 10) : 8;

    const subjects = db.prepare(`
      SELECT s.*, 
        (SELECT COUNT(*) FROM documents WHERE subject_code = s.code) as doc_count,
        (SELECT id FROM documents WHERE subject_code = s.code AND type = 'syllabus' AND is_approved = 1 ORDER BY id DESC LIMIT 1) as syllabus_id,
        (SELECT file_name FROM documents WHERE subject_code = s.code AND type = 'syllabus' AND is_approved = 1 ORDER BY id DESC LIMIT 1) as syllabus_file_name
      FROM subjects s 
      ORDER BY s.semester ASC, s.code ASC
    `).all();
    res.json({ success: true, count: subjects.length, max_semesters: configuredMax, data: subjects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createSubject = (req, res) => {
  try {
    const { code, title, branch, semester, credits, description } = req.body;
    if (!code || !title || !semester) {
      return res.status(400).json({ success: false, message: 'Code, title, and semester are required' });
    }

    const cleanCode = code.toUpperCase().trim();
    const existing = db.prepare('SELECT id FROM subjects WHERE code = ?').get(cleanCode);
    if (existing) {
      return res.status(409).json({ success: false, message: `Subject code "${cleanCode}" already exists` });
    }

    const insert = db.prepare(`
      INSERT INTO subjects (code, title, branch, semester, credits, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      cleanCode,
      title.trim(),
      branch || 'CSE',
      parseInt(semester, 10),
      parseInt(credits, 10) || 4,
      description || ''
    );

    res.status(201).json({ success: true, message: `Subject ${cleanCode} added successfully to F-TECH Student-Hub!` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteSubject = (req, res) => {
  try {
    const { id } = req.params;
    const sub = db.prepare('SELECT * FROM subjects WHERE id = ?').get(id);
    if (!sub) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    // Unlink documents associated with this subject ID or code
    db.prepare('UPDATE documents SET subject_id = NULL WHERE subject_id = ?').run(id);

    // Delete subject
    db.prepare('DELETE FROM subjects WHERE id = ?').run(id);

    res.json({ success: true, message: `Subject ${sub.code} - "${sub.title}" deleted successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateSubject = (req, res) => {
  try {
    const { id } = req.params;
    const { code, title, branch, semester, credits, description } = req.body;
    const sub = db.prepare('SELECT * FROM subjects WHERE id = ?').get(id);
    if (!sub) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    const cleanCode = (code || sub.code).toUpperCase().trim();
    db.prepare(`
      UPDATE subjects
      SET code = ?, title = ?, branch = ?, semester = ?, credits = ?, description = ?
      WHERE id = ?
    `).run(
      cleanCode,
      (title || sub.title).trim(),
      branch || sub.branch,
      parseInt(semester, 10) || sub.semester,
      parseInt(credits, 10) || sub.credits,
      description !== undefined ? description : sub.description,
      id
    );

    res.json({ success: true, message: `Subject ${cleanCode} updated successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------------------------------------------------
// 2B. SUBSUBJECTS / UNITS MANAGEMENT
// -------------------------------------------------------------
exports.getAllSubsubjectsAdmin = (req, res) => {
  try {
    const { subject_code } = req.query;
    let sql = 'SELECT * FROM subsubjects';
    const params = [];
    if (subject_code) {
      sql += ' WHERE UPPER(subject_code) = ?';
      params.push(subject_code.toUpperCase().trim());
    }
    sql += ' ORDER BY subject_code ASC, unit_number ASC';
    const subsubjects = db.prepare(sql).all(...params);
    res.json({ success: true, count: subsubjects.length, data: subsubjects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createSubsubject = async (req, res) => {
  try {
    const { subject_code, unit_number, title, description, topics } = req.body;
    if (!subject_code || !title) {
      return res.status(400).json({ success: false, message: 'Subject code and unit title are required.' });
    }

    const cleanSubCode = subject_code.toUpperCase().trim();
    const unitNum = parseInt(unit_number, 10) || 1;

    const result = db.prepare(`
      INSERT INTO subsubjects (subject_code, unit_number, title, description, topics)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      cleanSubCode,
      unitNum,
      title.trim(),
      (description || '').trim(),
      (topics || '').trim()
    );

    // Sync to PostgreSQL if available
    if (postgresService.pool) {
      try {
        await postgresService.query(`
          INSERT INTO subsubjects (subject_code, unit_number, title, description, topics)
          VALUES ($1, $2, $3, $4, $5)
        `, [cleanSubCode, unitNum, title.trim(), (description || '').trim(), (topics || '').trim()]);
      } catch (e) {}
    }

    res.status(201).json({
      success: true,
      message: `Unit / Subsubject "${title}" added successfully for ${cleanSubCode}!`,
      id: Number(result.lastInsertRowid)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateSubsubject = async (req, res) => {
  try {
    const { id } = req.params;
    const { subject_code, unit_number, title, description, topics } = req.body;
    const existing = db.prepare('SELECT * FROM subsubjects WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Subsubject not found' });
    }

    const cleanSubCode = (subject_code || existing.subject_code).toUpperCase().trim();
    const unitNum = parseInt(unit_number, 10) || existing.unit_number;
    const cleanTitle = (title || existing.title).trim();
    const cleanDesc = description !== undefined ? description.trim() : existing.description;
    const cleanTopics = topics !== undefined ? topics.trim() : existing.topics;

    db.prepare(`
      UPDATE subsubjects
      SET subject_code = ?, unit_number = ?, title = ?, description = ?, topics = ?
      WHERE id = ?
    `).run(cleanSubCode, unitNum, cleanTitle, cleanDesc, cleanTopics, id);

    res.json({ success: true, message: `Subsubject "${cleanTitle}" updated successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteSubsubject = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM subsubjects WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Subsubject not found' });
    }

    db.prepare('DELETE FROM subsubjects WHERE id = ?').run(id);

    res.json({ success: true, message: `Subsubject "${existing.title}" deleted.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------------------------------------------------
// 3. LAB EXPERIMENTS MANAGEMENT
// -------------------------------------------------------------
exports.getAllLabsAdmin = (req, res) => {
  try {
    const labs = db.prepare('SELECT * FROM lab_experiments ORDER BY subject_code ASC, exp_no ASC').all();
    res.json({ success: true, count: labs.length, data: labs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createLab = (req, res) => {
  try {
    const { subject_code, exp_no, title, objective, language, code, output_sample, viva_questions } = req.body;
    if (!subject_code || !exp_no || !title || !objective || !code) {
      return res.status(400).json({ success: false, message: 'Subject code, experiment number, title, objective, and code are required.' });
    }

    const insert = db.prepare(`
      INSERT INTO lab_experiments (subject_code, exp_no, title, objective, language, code, output_sample, viva_questions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      subject_code.toUpperCase().trim(),
      parseInt(exp_no, 10),
      title.trim(),
      objective.trim(),
      language || 'C/C++',
      code,
      output_sample || '',
      viva_questions || ''
    );

    res.status(201).json({
      success: true,
      message: 'Lab experiment added successfully!',
      id: Number(result.lastInsertRowid)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteLab = (req, res) => {
  try {
    const { id } = req.params;
    const lab = db.prepare('SELECT id, title FROM lab_experiments WHERE id = ?').get(id);
    if (!lab) {
      return res.status(404).json({ success: false, message: 'Lab experiment not found' });
    }

    db.prepare('DELETE FROM lab_experiments WHERE id = ?').run(id);
    res.json({ success: true, message: `Lab experiment "${lab.title}" deleted.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateLab = (req, res) => {
  try {
    const { id } = req.params;
    const { subject_code, exp_no, title, objective, language, code, output_sample, viva_questions } = req.body;
    const lab = db.prepare('SELECT * FROM lab_experiments WHERE id = ?').get(id);
    if (!lab) {
      return res.status(404).json({ success: false, message: 'Lab experiment not found' });
    }

    db.prepare(`
      UPDATE lab_experiments
      SET subject_code = ?, exp_no = ?, title = ?, objective = ?, language = ?, code = ?, output_sample = ?, viva_questions = ?
      WHERE id = ?
    `).run(
      (subject_code || lab.subject_code).toUpperCase().trim(),
      parseInt(exp_no, 10) || lab.exp_no,
      (title || lab.title).trim(),
      (objective || lab.objective).trim(),
      language || lab.language,
      code !== undefined ? code : lab.code,
      output_sample !== undefined ? output_sample : lab.output_sample,
      viva_questions !== undefined ? viva_questions : lab.viva_questions,
      id
    );

    res.json({ success: true, message: `Lab experiment "${lab.title}" updated successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------------------------------------------------
// 4. COMMUNITY MODERATION
// -------------------------------------------------------------
exports.getAllCommunityPostsAdmin = (req, res) => {
  try {
    const posts = db.prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM community_answers WHERE post_id = p.id) as actual_answers_count
      FROM community_posts p
      ORDER BY p.id DESC
    `).all();
    res.json({ success: true, count: posts.length, data: posts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteCommunityPost = (req, res) => {
  try {
    const { id } = req.params;
    const post = db.prepare('SELECT id, title FROM community_posts WHERE id = ?').get(id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    db.prepare("DELETE FROM community_votes WHERE target_type = 'post' AND target_id = ?").run(id);
    db.prepare('DELETE FROM community_answers WHERE post_id = ?').run(id);
    db.prepare('DELETE FROM community_posts WHERE id = ?').run(id);

    res.json({ success: true, message: `Discussion question "${post.title}" and its replies deleted.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteCommunityAnswer = (req, res) => {
  try {
    const { id } = req.params;
    const ans = db.prepare('SELECT id, post_id FROM community_answers WHERE id = ?').get(id);
    if (!ans) {
      return res.status(404).json({ success: false, message: 'Answer not found' });
    }

    db.prepare("DELETE FROM community_votes WHERE target_type = 'answer' AND target_id = ?").run(id);
    db.prepare('DELETE FROM community_answers WHERE id = ?').run(id);
    db.prepare('UPDATE community_posts SET answers_count = MAX(0, answers_count - 1) WHERE id = ?').run(ans.post_id);

    res.json({ success: true, message: 'Answer deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------------------------------------------------
// 5. USER ACCOUNTS MANAGEMENT
// -------------------------------------------------------------
exports.getAllUsersAdmin = (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, full_name, email, branch, semester, role, is_blocked, created_at,
        (SELECT COUNT(*) FROM document_downloads WHERE user_email = users.email) as download_activity
      FROM users
      ORDER BY id DESC
    `).all();
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.toggleUserBlock = async (req, res) => {
  try {
    const { id } = req.params;
    const user = db.prepare('SELECT id, full_name, email, is_blocked FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const nextState = user.is_blocked ? 0 : 1;
    db.prepare('UPDATE users SET is_blocked = ? WHERE id = ?').run(nextState, id);

    // Sync to Cloud PostgreSQL (Neon / Supabase)
    if (postgresService && postgresService.pool) {
      try {
        await postgresService.query('UPDATE users SET is_blocked = $1 WHERE LOWER(email) = LOWER($2)', [nextState, user.email]);
      } catch (pgErr) {
        console.warn('[F-TECH PG User Block Sync Notice]:', pgErr.message);
      }
    }

    const actionText = nextState === 1 ? 'BLOCKED' : 'UNBLOCKED';
    postgresService.logActivity({
      userId: user.id,
      email: user.email,
      name: user.full_name,
      action: actionText,
      details: `Account access ${actionText.toLowerCase()} by Administrator`,
      ip: (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1').toString().split(',')[0].trim(),
      userAgent: req.headers['user-agent'] || ''
    }, db);

    res.json({
      success: true,
      is_blocked: nextState,
      message: `User ${user.full_name} (${user.email}) has been ${nextState === 1 ? 'Blocked' : 'Unblocked'}.`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = db.prepare('SELECT id, full_name, email FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);

    // Remove from Cloud PostgreSQL
    if (postgresService && postgresService.pool) {
      try {
        await postgresService.query('DELETE FROM users WHERE LOWER(email) = LOWER($1)', [user.email]);
      } catch (pgErr) {
        console.warn('[F-TECH PG User Delete Sync Notice]:', pgErr.message);
      }
    }

    res.json({ success: true, message: `User account ${user.email} permanently removed.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------------------------------------------------
// 6. DOWNLOAD LOGS & USER AUDIT TRAIL
// -------------------------------------------------------------
exports.getDownloadLogs = (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const logs = db.prepare(`
      SELECT dd.id, dd.user_id, dd.user_email, dd.user_name, dd.ip_address, dd.downloaded_at,
             d.id as doc_id, d.title as doc_title, d.subject_code, d.type as doc_type,
             d.downloads_count, d.likes_count, d.dislikes_count
      FROM document_downloads dd
      LEFT JOIN documents d ON dd.document_id = d.id
      ORDER BY dd.id DESC
      LIMIT ?
    `).all(parseInt(limit, 10));

    res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------------------------------------------------
// 7. TUTORIALS & VIDEO GUIDES MANAGEMENT
// -------------------------------------------------------------
exports.getAllTutorialsAdmin = (req, res) => {
  try {
    const tutorials = db.prepare('SELECT * FROM tutorials ORDER BY semester ASC, subject_code ASC, id DESC').all();
    res.json({ success: true, count: tutorials.length, data: tutorials });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createTutorial = (req, res) => {
  try {
    const { title, subject_code, subject_title, semester, video_count, instructor, video_url, description } = req.body;
    if (!title || !subject_code || !video_url) {
      return res.status(400).json({ success: false, message: 'Tutorial title, subject code, and video/playlist URL are required.' });
    }

    const insert = db.prepare(`
      INSERT INTO tutorials (title, subject_code, subject_title, semester, video_count, instructor, video_url, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      title.trim(),
      subject_code.toUpperCase().trim(),
      (subject_title || '').trim(),
      parseInt(semester, 10) || 1,
      parseInt(video_count, 10) || 1,
      (instructor || 'Aditya Kumar Sharma (F-TECH)').trim(),
      video_url.trim(),
      (description || '').trim()
    );

    res.status(201).json({ success: true, message: `Tutorial "${title}" added successfully!` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateTutorial = (req, res) => {
  try {
    const { id } = req.params;
    const { title, subject_code, subject_title, semester, video_count, instructor, video_url, description } = req.body;
    const existing = db.prepare('SELECT id FROM tutorials WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Tutorial not found' });
    }

    const update = db.prepare(`
      UPDATE tutorials
      SET title = ?, subject_code = ?, subject_title = ?, semester = ?, video_count = ?, instructor = ?, video_url = ?, description = ?
      WHERE id = ?
    `);

    update.run(
      title.trim(),
      subject_code.toUpperCase().trim(),
      (subject_title || '').trim(),
      parseInt(semester, 10) || 1,
      parseInt(video_count, 10) || 1,
      (instructor || 'Aditya Kumar Sharma (F-TECH)').trim(),
      video_url.trim(),
      (description || '').trim(),
      id
    );

    res.json({ success: true, message: `Tutorial "${title}" updated successfully!` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteTutorial = (req, res) => {
  try {
    const { id } = req.params;
    const tut = db.prepare('SELECT id, title FROM tutorials WHERE id = ?').get(id);
    if (!tut) {
      return res.status(404).json({ success: false, message: 'Tutorial not found' });
    }

    db.prepare('DELETE FROM tutorials WHERE id = ?').run(id);
    res.json({ success: true, message: `Tutorial "${tut.title}" deleted successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------------------------------------------------
// 8. SEMESTER SYSTEM CONFIGURATION
// -------------------------------------------------------------
exports.updateMaxSemesters = (req, res) => {
  try {
    const { max_semesters } = req.body;
    const num = parseInt(max_semesters, 10);
    if (isNaN(num) || num < 1 || num > 20) {
      return res.status(400).json({ success: false, message: 'Total academic semesters must be a valid number between 1 and 20.' });
    }

    db.prepare(`
      INSERT INTO system_metadata (key, value)
      VALUES ('max_semesters', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(String(num));

    res.json({
      success: true,
      message: `System semester range successfully updated to ${num} semesters.`,
      max_semesters: num
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------------------------------------------------
// 9. LIVE USER TRACKING & REAL-TIME AUDIT
// -------------------------------------------------------------
exports.getLiveTracking = async (req, res) => {
  try {
    const data = await postgresService.getLiveTrackingData(db);
    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
