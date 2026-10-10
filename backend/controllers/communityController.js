/**
 * F-TECH-Student-Hub Community Controller
 * Company: F-TECH
 * Founder & Owner: Aditya Kumar Sharma
 */

const db = require('../config/database');

exports.getPosts = (req, res) => {
  try {
    const { tag, search } = req.query;
    let query = 'SELECT * FROM community_posts WHERE 1=1';
    const params = [];

    if (tag) {
      query += ' AND tags LIKE ?';
      params.push(`%${tag}%`);
    }
    if (search) {
      query += ' AND (title LIKE ? OR content LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY upvotes DESC, id DESC';

    const posts = db.prepare(query).all(...params);
    res.json({ success: true, count: posts.length, data: posts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPostDetails = (req, res) => {
  try {
    const { id } = req.params;
    const post = db.prepare('SELECT * FROM community_posts WHERE id = ?').get(id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Increment views
    db.prepare('UPDATE community_posts SET views = views + 1 WHERE id = ?').run(id);

    const answers = db.prepare('SELECT * FROM community_answers WHERE post_id = ? ORDER BY upvotes DESC, id ASC').all(id);

    res.json({
      success: true,
      data: {
        ...post,
        answers
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createPost = (req, res) => {
  try {
    const { title, content, author_name, tags, author_badge } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required.' });
    }

    const insert = db.prepare(`
      INSERT INTO community_posts (title, content, author_name, tags, author_badge)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      title,
      content,
      author_name || 'Engineering Scholar',
      tags || 'aktu,general',
      author_badge || 'Student'
    );

    res.status(201).json({
      success: true,
      message: 'Discussion question posted successfully to F-TECH Student-Hub!',
      postId: Number(result.lastInsertRowid)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.upvotePost = (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('UPDATE community_posts SET upvotes = upvotes + 1 WHERE id = ?').run(id);
    const updated = db.prepare('SELECT upvotes FROM community_posts WHERE id = ?').get(id);
    res.json({ success: true, upvotes: updated ? updated.upvotes : 0 });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addAnswer = (req, res) => {
  try {
    const { id } = req.params;
    const { content, author_name, author_badge } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, message: 'Content is required' });
    }

    const insert = db.prepare(`
      INSERT INTO community_answers (post_id, content, author_name, author_badge)
      VALUES (?, ?, ?, ?)
    `);

    insert.run(
      id,
      content,
      author_name || 'F-TECH Student Contributor',
      author_badge || 'Peer Helper'
    );

    db.prepare('UPDATE community_posts SET answers_count = answers_count + 1 WHERE id = ?').run(id);

    res.status(201).json({ success: true, message: 'Answer added successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.upvoteAnswer = (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('UPDATE community_answers SET upvotes = upvotes + 1 WHERE id = ?').run(id);
    const updated = db.prepare('SELECT upvotes FROM community_answers WHERE id = ?').get(id);
    res.json({ success: true, upvotes: updated ? updated.upvotes : 0 });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
