/**
 * F-TECH-Student-Hub Document Controller
 * Company: F-TECH
 * Founder & Owner: Aditya Kumar Sharma
 */

const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const StorageService = require('../services/storageService');
const postgresService = require('../services/postgresService');

function getVoterIdentifier(req) {
  if (req.user && (req.user.email || req.user.id)) {
    return `user:${req.user.email || req.user.id}`;
  }
  const customId = req.headers['x-voter-id'] || (req.body && req.body.voter_id) || req.query.voter_id;
  if (customId) {
    return `client:${customId}`;
  }
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'guest-session';
  return `ip:${ip.toString().replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
}

exports.getDocuments = (req, res) => {
  try {
    const { type, subject_code, semester, branch, year, unit, search, limit } = req.query;
    const voterId = getVoterIdentifier(req);

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

    // Fetch user votes
    const votes = db.prepare('SELECT document_id, vote_type FROM document_votes WHERE voter_identifier = ?').all(voterId);
    const voteMap = {};
    for (const v of votes) {
      voteMap[v.document_id] = v.vote_type;
    }

    const docsWithVotes = docs.map(d => ({
      ...d,
      likes_count: d.likes_count || 0,
      dislikes_count: d.dislikes_count || 0,
      userVote: voteMap[d.id] || 0
    }));

    res.json({ success: true, count: docsWithVotes.length, data: docsWithVotes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDocumentById = (req, res) => {
  try {
    const { id } = req.params;
    const voterId = getVoterIdentifier(req);

    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    if (doc.is_approved === 0) {
      // Check if user is admin
      const isAdmin = req.user && (req.user.role === 'SuperAdmin' || req.user.role === 'Admin');
      if (!isAdmin) {
        return res.status(403).json({ success: false, message: 'This document is currently restricted by F-TECH administration.' });
      }
    }

    // Increment view count
    db.prepare('UPDATE documents SET views_count = views_count + 1 WHERE id = ?').run(id);

    const vote = db.prepare(
      'SELECT vote_type FROM document_votes WHERE document_id = ? AND voter_identifier = ?'
    ).get(id, voterId);

    res.json({
      success: true,
      data: {
        ...doc,
        likes_count: doc.likes_count || 0,
        dislikes_count: doc.dislikes_count || 0,
        userVote: vote ? vote.vote_type : 0
      }
    });
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

    if (doc.is_approved === 0) {
      return res.status(403).json({ success: false, message: 'This material is blocked by F-TECH administration.' });
    }

    // Increment download count
    db.prepare('UPDATE documents SET downloads_count = downloads_count + 1 WHERE id = ?').run(id);

    // Record audit download log
    const userEmail = (req.user && req.user.email) ? req.user.email : (req.query.user_email || 'student@studenthub');
    const userName = (req.user && (req.user.fullName || req.user.name)) ? (req.user.fullName || req.user.name) : (req.query.user_name || 'Student');
    const userId = req.user ? req.user.id : null;
    const ipAddress = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1').toString().split(',')[0].trim();
    const userAgent = req.headers['user-agent'] || '';

    try {
      db.prepare(`
        INSERT INTO document_downloads (document_id, user_id, user_email, user_name, ip_address)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, userId, userEmail, userName, ipAddress);
      
      postgresService.logActivity({
        userId,
        email: userEmail,
        name: userName,
        action: 'DOWNLOAD',
        details: `Downloaded: "${doc.title}" (${doc.subject_code || 'General'})`,
        ip: ipAddress,
        userAgent
      }, db);
    } catch (e) {
      console.warn('[F-TECH Download Audit Log]', e.message);
    }

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

// Like / Dislike voting for Documents
exports.voteDocument = (req, res) => {
  try {
    const { id } = req.params;
    const voteType = parseInt(req.body.vote_type, 10) === -1 ? -1 : 1;
    const voterId = getVoterIdentifier(req);

    const doc = db.prepare('SELECT id, likes_count, dislikes_count FROM documents WHERE id = ?').get(id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const existingVote = db.prepare(
      'SELECT id, vote_type FROM document_votes WHERE document_id = ? AND voter_identifier = ?'
    ).get(id, voterId);

    let currentVote = 0;

    if (!existingVote) {
      db.prepare(`
        INSERT INTO document_votes (document_id, voter_identifier, vote_type)
        VALUES (?, ?, ?)
      `).run(id, voterId, voteType);

      if (voteType === 1) {
        db.prepare('UPDATE documents SET likes_count = likes_count + 1 WHERE id = ?').run(id);
      } else {
        db.prepare('UPDATE documents SET dislikes_count = dislikes_count + 1 WHERE id = ?').run(id);
      }
      currentVote = voteType;
    } else if (existingVote.vote_type === voteType) {
      db.prepare('DELETE FROM document_votes WHERE id = ?').run(existingVote.id);
      if (voteType === 1) {
        db.prepare('UPDATE documents SET likes_count = MAX(0, likes_count - 1) WHERE id = ?').run(id);
      } else {
        db.prepare('UPDATE documents SET dislikes_count = MAX(0, dislikes_count - 1) WHERE id = ?').run(id);
      }
      currentVote = 0;
    } else {
      db.prepare('UPDATE document_votes SET vote_type = ? WHERE id = ?').run(voteType, existingVote.id);
      if (voteType === 1) {
        db.prepare('UPDATE documents SET likes_count = likes_count + 1, dislikes_count = MAX(0, dislikes_count - 1) WHERE id = ?').run(id);
      } else {
        db.prepare('UPDATE documents SET likes_count = MAX(0, likes_count - 1), dislikes_count = dislikes_count + 1 WHERE id = ?').run(id);
      }
      currentVote = voteType;
    }

    const updated = db.prepare('SELECT likes_count, dislikes_count FROM documents WHERE id = ?').get(id);
    res.json({
      success: true,
      likes_count: updated ? updated.likes_count : 0,
      dislikes_count: updated ? updated.dislikes_count : 0,
      currentVote,
      message: currentVote === 0 ? 'Reaction removed' : (currentVote === 1 ? 'Liked (+1)' : 'Disliked (-1)')
    });
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

    const validTypes = ['notes', 'aktu-paper', 'lab', 'tutorial', 'syllabus'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, message: `Invalid document type. Allowed types: ${validTypes.join(', ')}` });
    }

    const cleanTitle = title.trim();
    if (cleanTitle.length < 3 || cleanTitle.length > 150) {
      return res.status(400).json({ success: false, message: 'Title length must be between 3 and 150 characters.' });
    }

    const file = req.file;
    const isAdmin = req.user && (req.user.role === 'SuperAdmin' || req.user.role === 'Admin' || req.user.isAdmin);

    // SECURITY ENFORCEMENT: Official syllabus is strictly uploaded by Admin in PDF or DOCX/DOC format
    if (type === 'syllabus') {
      if (!isAdmin) {
        if (file && file.path && fs.existsSync(file.path)) {
          try { fs.unlinkSync(file.path); } catch (e) {}
        }
        return res.status(403).json({
          success: false,
          message: 'Security Policy Violation: Only administrators are authorized to upload official syllabus documents.'
        });
      }

      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'Official syllabus upload requires an attached file.'
        });
      }

      const ext = path.extname(file.originalname).toLowerCase();
      if (!['.pdf', '.docx', '.doc'].includes(ext)) {
        if (file.path && fs.existsSync(file.path)) {
          try { fs.unlinkSync(file.path); } catch (e) {}
        }
        return res.status(400).json({
          success: false,
          message: 'Official syllabus must be uploaded in PDF (.pdf) or Word Document (.docx, .doc) format only.'
        });
      }
    }

    const metaRow = db.prepare("SELECT value FROM system_metadata WHERE key = 'max_semesters'").get();
    const maxSemesters = metaRow ? parseInt(metaRow.value, 10) : 8;
    const parsedSemester = parseInt(semester, 10) || 1;
    if (parsedSemester < 1 || parsedSemester > maxSemesters) {
      if (file && file.path && fs.existsSync(file.path)) {
        try { fs.unlinkSync(file.path); } catch (e) {}
      }
      return res.status(400).json({
        success: false,
        message: `Semester must be between 1 and ${maxSemesters}.`
      });
    }

    const rawFileName = file ? file.originalname : `${cleanTitle.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}.pdf`;
    const sanitizedFileName = rawFileName.replace(/[\r\n"']/g, '').replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = file ? file.path : null;
    const fileSize = file ? file.size : 1024 * 1024;
    const mimeType = file ? file.mimetype : 'application/pdf';

    const isApproved = isAdmin ? 1 : 0; // Require admin approval for student uploads

    let subjectId = req.body.subject_id ? parseInt(req.body.subject_id, 10) : null;
    const cleanSubCode = subject_code ? subject_code.toUpperCase().trim() : null;
    if (cleanSubCode) {
      const sub = db.prepare('SELECT id, branch, semester FROM subjects WHERE code = ?').get(cleanSubCode);
      if (sub) {
        subjectId = sub.id;
      }
    }

    const insert = db.prepare(`
      INSERT INTO documents (
        title, type, subject_id, subject_code, semester, branch, unit, year, 
        file_path, file_name, file_size, mime_type, author_name, 
        uploader_role, is_approved, likes_count, dislikes_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
    `);

    const result = insert.run(
      cleanTitle,
      type,
      subjectId,
      cleanSubCode || 'GENERAL',
      parsedSemester,
      branch || 'CSE',
      unit ? parseInt(unit, 10) : 1,
      year ? parseInt(year, 10) : new Date().getFullYear(),
      filePath,
      sanitizedFileName,
      fileSize,
      mimeType,
      (author_name || (isAdmin ? 'Aditya Kumar Sharma (Admin)' : (req.user ? req.user.name || req.user.fullName : 'F-TECH Student Contributor'))).trim(),
      isAdmin ? 'Admin' : 'Student',
      isApproved
    );

    res.status(201).json({
      success: true,
      message: isAdmin 
        ? 'Document uploaded and published successfully!' 
        : 'Document submitted successfully! It will appear publicly upon moderator approval.',
      isApproved,
      documentId: Number(result.lastInsertRowid)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
