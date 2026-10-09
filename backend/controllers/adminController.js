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
    const postsCount = db.prepare('SELECT COUNT(*) as count FROM community_posts').get().count;
    const papersCount = db.prepare("SELECT COUNT(*) as count FROM documents WHERE type = 'aktu-paper'").get().count;
    const notesCount = db.prepare("SELECT COUNT(*) as count FROM documents WHERE type = 'notes'").get().count;

    const recentDocs = db.prepare('SELECT * FROM documents ORDER BY id DESC LIMIT 5').all();

    res.json({
      success: true,
      stats: {
        subjectsCount,
        documentsCount,
        totalDownloads,
        totalViews,
        postsCount,
        papersCount,
        notesCount,
        company: 'F-TECH',
        founder: 'Aditya Kumar Sharma'
      },
      recentDocs
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllDocumentsAdmin = (req, res) => {
  try {
    const docs = db.prepare('SELECT * FROM documents ORDER BY id DESC').all();
    res.json({ success: true, count: docs.length, data: docs });
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

    db.prepare('DELETE FROM documents WHERE id = ?').run(id);

    res.json({ success: true, message: `Document "${doc.title}" removed successfully` });
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

    const insert = db.prepare(`
      INSERT INTO subjects (code, title, branch, semester, credits, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      code.toUpperCase(),
      title,
      branch || 'CSE',
      parseInt(semester, 10),
      parseInt(credits, 10) || 4,
      description || ''
    );

    res.status(201).json({ success: true, message: 'Subject created successfully in F-TECH Student-Hub!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
