/**
 * F-TECH-Student-Hub Document Controller
 * Company: F-TECH
 * Founder & Owner: Aditya Kumar Sharma
 */

const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const StorageService = require('../services/storageService');

exports.getDocuments = (req, res) => {
  try {
    const { type, subject_code, semester, branch, year, unit, search, limit } = req.query;
    let query = 'SELECT * FROM documents WHERE is_approved = 1';
    const params = [];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    if (subject_code) {
      query += ' AND subject_code = ?';
      params.push(subject_code.toUpperCase());
    }
    if (semester) {
      query += ' AND semester = ?';
      params.push(parseInt(semester, 10));
    }
    if (branch && branch !== 'ALL') {
      query += ' AND (branch = ? OR branch = "Common")';
      params.push(branch);
    }
    if (year) {
      query += ' AND year = ?';
      params.push(parseInt(year, 10));
    }
    if (unit) {
      query += ' AND unit = ?';
      params.push(parseInt(unit, 10));
    }
    if (search) {
      query += ' AND (title LIKE ? OR subject_code LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY downloads_count DESC, id DESC';

    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(limit, 10));
    }

    const docs = db.prepare(query).all(...params);
    res.json({ success: true, count: docs.length, data: docs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDocumentById = (req, res) => {
  try {
    const { id } = req.params;
    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Increment view count
    db.prepare('UPDATE documents SET views_count = views_count + 1 WHERE id = ?').run(id);

    res.json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.downloadDocument = (req, res) => {
  try {
    const { id } = req.params;
    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Increment download count
    db.prepare('UPDATE documents SET downloads_count = downloads_count + 1 WHERE id = ?').run(id);

    // If actual uploaded file exists on disk, stream it
    if (doc.file_path && fs.existsSync(doc.file_path)) {
      return res.download(doc.file_path, doc.file_name);
    }

    // Otherwise, generate interactive academic PDF placeholder or text buffer
    const mockContent = Buffer.from(
      `%PDF-1.4\n% F-TECH-Student-Hub\n% Founder: Aditya Kumar Sharma (F-TECH)\n% Title: ${doc.title}\n% Code: ${doc.subject_code}\n% Downloaded from F-TECH Student-Hub (AKTU Study Portal)\n%%EOF`
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.file_name || 'ftech-document.pdf'}"`);
    return res.send(mockContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.uploadDocument = (req, res) => {
  try {
    const { title, type, subject_code, semester, branch, unit, year, author_name } = req.body;
    
    if (!title || !type || !semester) {
      return res.status(400).json({ success: false, message: 'Title, type, and semester are required.' });
    }

    const file = req.file;
    const fileName = file ? file.originalname : `${title.toLowerCase().replace(/\s+/g, '-')}.pdf`;
    const filePath = file ? file.path : null;
    const fileSize = file ? file.size : 1024 * 1024;
    const mimeType = file ? file.mimetype : 'application/pdf';

    const insert = db.prepare(`
      INSERT INTO documents (
        title, type, subject_code, semester, branch, unit, year, 
        file_path, file_name, file_size, mime_type, author_name, 
        uploader_role, is_approved
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Student uploads can be automatically approved or pending
    const isApproved = req.user ? 1 : 1; 

    const result = insert.run(
      title,
      type,
      subject_code ? subject_code.toUpperCase() : 'GENERAL',
      parseInt(semester, 10) || 1,
      branch || 'CSE',
      unit ? parseInt(unit, 10) : 1,
      year ? parseInt(year, 10) : new Date().getFullYear(),
      filePath,
      fileName,
      fileSize,
      mimeType,
      author_name || 'F-TECH Student Contributor',
      req.user ? 'Admin' : 'Student',
      isApproved
    );

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully to F-TECH Student-Hub!',
      documentId: Number(result.lastInsertRowid)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
