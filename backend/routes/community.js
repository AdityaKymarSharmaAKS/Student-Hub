/**
 * F-TECH-Student-Hub Community Discussion Routes
 * Company: F-TECH
 * Founder & Owner: Aditya Kumar Sharma
 */

const express = require('express');
const router = express.Router();
const communityController = require('../controllers/communityController');

// GET /api/community (list discussions)
router.get('/', communityController.getPosts);

// GET /api/community/:id (get post details & answers)
router.get('/:id', communityController.getPostDetails);

// POST /api/community (create a new doubt or discussion)
router.post('/', communityController.createPost);

// POST /api/community/:id/vote (single-vote like/dislike)
router.post('/:id/vote', communityController.votePost);

// POST /api/community/:id/upvote (legacy upvote discussion)
router.post('/:id/upvote', communityController.upvotePost);

// POST /api/community/:id/answers (reply to a discussion)
router.post('/:id/answers', communityController.addAnswer);

// POST /api/community/answers/:id/vote (single-vote like/dislike for answer)
router.post('/answers/:id/vote', communityController.voteAnswer);

// POST /api/community/answers/:id/upvote (legacy upvote answer)
router.post('/answers/:id/upvote', communityController.upvoteAnswer);

module.exports = router;
