/**
 * F-TECH-Student-Hub Admin Controller
 * Company: F-TECH
 * Founder & Owner: Aditya Kumar Sharma
 */

const db = require('../config/database');
const AuthService = require('../services/authService');
const StorageService = require('../services/storageService');

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

// -------------------------------------------------------------
// 2. SUBJECTS & SYLLABUS MANAGEMENT
// -------------------------------------------------------------
exports.getAllSubjectsAdmin = (req, res) => {
  try {
    const subjects = db.prepare(`
      SELECT s.*, 
        (SELECT COUNT(*) FROM documents WHERE subject_code = s.code) as doc_count
      FROM subjects s 
      ORDER BY s.semester ASC, s.code ASC
    `).all();
    res.json({ success: true, count: subjects.length, data: subjects });
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

    insert.run(
      subject_code.toUpperCase().trim(),
      parseInt(exp_no, 10),
      title.trim(),
      objective.trim(),
      language || 'C/C++',
      code,
      output_sample || '',
      viva_questions || ''
    );

    res.status(201).json({ success: true, message: 'Lab experiment added successfully!' });
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

exports.toggleUserBlock = (req, res) => {
  try {
    const { id } = req.params;
    const user = db.prepare('SELECT id, full_name, email, is_blocked FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const nextState = user.is_blocked ? 0 : 1;
    db.prepare('UPDATE users SET is_blocked = ? WHERE id = ?').run(nextState, id);

    res.json({
      success: true,
      is_blocked: nextState,
      message: `User ${user.full_name} (${user.email}) has been ${nextState === 1 ? 'Blocked' : 'Unblocked'}.`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteUser = (req, res) => {
  try {
    const { id } = req.params;
    const user = db.prepare('SELECT id, full_name, email FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);
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
