/**
 * F-TECH-Student-Hub Donations Routes
 * Company: F-TECH
 * Founder & Owner: Aditya Kumar Sharma
 */

const express = require('express');
const router = express.Router();
const donationController = require('../controllers/donationController');

// GET /api/donations (list recent supporters)
router.get('/', donationController.getDonations);

// POST /api/donations (record new contribution)
router.post('/', donationController.createDonation);

module.exports = router;
