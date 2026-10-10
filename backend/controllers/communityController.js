/**
 * F-TECH-Student-Hub Community Controller
 * Company: F-TECH
 * Founder & Owner: Aditya Kumar Sharma
 */

const db = require('../config/database');

function getVoterIdentifier(req) {
  // 1. If JWT user is authenticated
  if (req.user && (req.user.email || req.user.id)) {
    return `user:${req.user.email || req.user.id}`;
  }
  // 2. Client specified voter_id header or body
  const customId = req.headers['x-voter-id'] || (req.body && req.body.voter_id) || req.query.voter_id;
  if (customId) {
    return `client:${customId}`;
  }
  // 3. Fallback to client IP
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'guest-session';
  return `ip:${ip.toString().replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
}

exports.getPosts = (req, res) => {
  try {
    const { tag, search } = req.query;
    const voterId = getVoterIdentifier(req);

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

    // Attach userVote if available
    const userVotes = db.prepare(
      "SELECT target_id, vote_type FROM community_votes WHERE target_type = 'post' AND voter_identifier = ?"
    ).all(voterId);
    const voteMap = {};
    for (const v of userVotes) {
      voteMap[v.target_id] = v.vote_type;
    }

    const postsWithVote = posts.map(p => ({
      ...p,
      downvotes: p.downvotes || 0,
      userVote: voteMap[p.id] || 0
    }));

    res.json({ success: true, count: postsWithVote.length, data: postsWithVote });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPostDetails = (req, res) => {
  try {
    const { id } = req.params;
    const voterId = getVoterIdentifier(req);

    const post = db.prepare('SELECT * FROM community_posts WHERE id = ?').get(id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Increment views
    db.prepare('UPDATE community_posts SET views = views + 1 WHERE id = ?').run(id);

    const postVote = db.prepare(
      "SELECT vote_type FROM community_votes WHERE target_type = 'post' AND target_id = ? AND voter_identifier = ?"
    ).get(id, voterId);

    const answers = db.prepare('SELECT * FROM community_answers WHERE post_id = ? ORDER BY upvotes DESC, id ASC').all(id);

    // Fetch user votes on these answers
    const ansVotes = db.prepare(
      "SELECT target_id, vote_type FROM community_votes WHERE target_type = 'answer' AND voter_identifier = ?"
    ).all(voterId);
    const ansVoteMap = {};
    for (const v of ansVotes) {
      ansVoteMap[v.target_id] = v.vote_type;
    }

    const answersWithVote = answers.map(a => ({
      ...a,
      downvotes: a.downvotes || 0,
      userVote: ansVoteMap[a.id] || 0
    }));

    res.json({
      success: true,
      data: {
        ...post,
        downvotes: post.downvotes || 0,
        userVote: postVote ? postVote.vote_type : 0,
        answers: answersWithVote
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

    // Check if user is blocked
    if (req.user && req.user.email) {
      const u = db.prepare('SELECT is_blocked FROM users WHERE email = ?').get(req.user.email);
      if (u && u.is_blocked) {
        return res.status(403).json({ success: false, message: 'Your account has been restricted by F-TECH administration.' });
      }
    }

    const insert = db.prepare(`
      INSERT INTO community_posts (title, content, author_name, tags, author_badge, downvotes)
      VALUES (?, ?, ?, ?, ?, 0)
    `);

    const result = insert.run(
      title,
      content,
      author_name || (req.user ? req.user.name : 'Engineering Scholar'),
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

// Single-Vote handler for Community Posts (Vote: +1 or -1, or toggle off)
exports.votePost = (req, res) => {
  try {
    const { id } = req.params;
    const voteType = parseInt(req.body.vote_type, 10) === -1 ? -1 : 1;
    const voterId = getVoterIdentifier(req);

    const post = db.prepare('SELECT id, upvotes, downvotes FROM community_posts WHERE id = ?').get(id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const existingVote = db.prepare(
      "SELECT id, vote_type FROM community_votes WHERE target_type = 'post' AND target_id = ? AND voter_identifier = ?"
    ).get(id, voterId);

    let currentVote = 0;

    if (!existingVote) {
      // 1. Insert new vote
      db.prepare(`
        INSERT INTO community_votes (target_type, target_id, voter_identifier, vote_type)
        VALUES ('post', ?, ?, ?)
      `).run(id, voterId, voteType);

      if (voteType === 1) {
        db.prepare('UPDATE community_posts SET upvotes = upvotes + 1 WHERE id = ?').run(id);
      } else {
        db.prepare('UPDATE community_posts SET downvotes = downvotes + 1 WHERE id = ?').run(id);
      }
      currentVote = voteType;
    } else if (existingVote.vote_type === voteType) {
      // 2. Toggle off (cancel vote)
      db.prepare('DELETE FROM community_votes WHERE id = ?').run(existingVote.id);
      if (voteType === 1) {
        db.prepare('UPDATE community_posts SET upvotes = MAX(0, upvotes - 1) WHERE id = ?').run(id);
      } else {
        db.prepare('UPDATE community_posts SET downvotes = MAX(0, downvotes - 1) WHERE id = ?').run(id);
      }
      currentVote = 0;
    } else {
      // 3. Switch vote (e.g. upvote to downvote or vice-versa)
      db.prepare('UPDATE community_votes SET vote_type = ? WHERE id = ?').run(voteType, existingVote.id);
      if (voteType === 1) {
        db.prepare('UPDATE community_posts SET upvotes = upvotes + 1, downvotes = MAX(0, downvotes - 1) WHERE id = ?').run(id);
      } else {
        db.prepare('UPDATE community_posts SET upvotes = MAX(0, upvotes - 1), downvotes = downvotes + 1 WHERE id = ?').run(id);
      }
      currentVote = voteType;
    }

    const updated = db.prepare('SELECT upvotes, downvotes FROM community_posts WHERE id = ?').get(id);
    res.json({
      success: true,
      upvotes: updated ? updated.upvotes : 0,
      downvotes: updated ? updated.downvotes : 0,
      currentVote,
      message: currentVote === 0 ? 'Vote cleared' : (currentVote === 1 ? 'Upvoted (+1)' : 'Downvoted (-1)')
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Backwards-compatible upvote endpoint
exports.upvotePost = (req, res) => {
  req.body = req.body || {};
  req.body.vote_type = 1;
  return exports.votePost(req, res);
};

exports.addAnswer = (req, res) => {
  try {
    const { id } = req.params;
    const { content, author_name, author_badge } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, message: 'Content is required' });
    }

    if (req.user && req.user.email) {
      const u = db.prepare('SELECT is_blocked FROM users WHERE email = ?').get(req.user.email);
      if (u && u.is_blocked) {
        return res.status(403).json({ success: false, message: 'Your account has been restricted by F-TECH administration.' });
      }
    }

    const insert = db.prepare(`
      INSERT INTO community_answers (post_id, content, author_name, author_badge, downvotes)
      VALUES (?, ?, ?, ?, 0)
    `);

    insert.run(
      id,
      content,
      author_name || (req.user ? req.user.name : 'F-TECH Student Contributor'),
      author_badge || 'Peer Helper'
    );

    db.prepare('UPDATE community_posts SET answers_count = answers_count + 1 WHERE id = ?').run(id);

    res.status(201).json({ success: true, message: 'Answer added successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Single-Vote handler for Community Answers
exports.voteAnswer = (req, res) => {
  try {
    const { id } = req.params;
    const voteType = parseInt(req.body.vote_type, 10) === -1 ? -1 : 1;
    const voterId = getVoterIdentifier(req);

    const answer = db.prepare('SELECT id, upvotes, downvotes FROM community_answers WHERE id = ?').get(id);
    if (!answer) {
      return res.status(404).json({ success: false, message: 'Answer not found' });
    }

    const existingVote = db.prepare(
      "SELECT id, vote_type FROM community_votes WHERE target_type = 'answer' AND target_id = ? AND voter_identifier = ?"
    ).get(id, voterId);

    let currentVote = 0;

    if (!existingVote) {
      db.prepare(`
        INSERT INTO community_votes (target_type, target_id, voter_identifier, vote_type)
        VALUES ('answer', ?, ?, ?)
      `).run(id, voterId, voteType);

      if (voteType === 1) {
        db.prepare('UPDATE community_answers SET upvotes = upvotes + 1 WHERE id = ?').run(id);
      } else {
        db.prepare('UPDATE community_answers SET downvotes = downvotes + 1 WHERE id = ?').run(id);
      }
      currentVote = voteType;
    } else if (existingVote.vote_type === voteType) {
      db.prepare('DELETE FROM community_votes WHERE id = ?').run(existingVote.id);
      if (voteType === 1) {
        db.prepare('UPDATE community_answers SET upvotes = MAX(0, upvotes - 1) WHERE id = ?').run(id);
      } else {
        db.prepare('UPDATE community_answers SET downvotes = MAX(0, downvotes - 1) WHERE id = ?').run(id);
      }
      currentVote = 0;
    } else {
      db.prepare('UPDATE community_votes SET vote_type = ? WHERE id = ?').run(voteType, existingVote.id);
      if (voteType === 1) {
        db.prepare('UPDATE community_answers SET upvotes = upvotes + 1, downvotes = MAX(0, downvotes - 1) WHERE id = ?').run(id);
      } else {
        db.prepare('UPDATE community_answers SET upvotes = MAX(0, upvotes - 1), downvotes = downvotes + 1 WHERE id = ?').run(id);
      }
      currentVote = voteType;
    }

    const updated = db.prepare('SELECT upvotes, downvotes FROM community_answers WHERE id = ?').get(id);
    res.json({
      success: true,
      upvotes: updated ? updated.upvotes : 0,
      downvotes: updated ? updated.downvotes : 0,
      currentVote,
      message: currentVote === 0 ? 'Vote cleared' : (currentVote === 1 ? 'Upvoted (+1)' : 'Downvoted (-1)')
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Backwards-compatible upvote endpoint
exports.upvoteAnswer = (req, res) => {
  req.body = req.body || {};
  req.body.vote_type = 1;
  return exports.voteAnswer(req, res);
};
