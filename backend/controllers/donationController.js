/**
 * F-TECH-Student-Hub Donation Controller
 * Company: F-TECH
 * Founder & Owner: Aditya Kumar Sharma
 */

const db = require('../config/database');

// GET /api/donations (get list of recent supporters)
exports.getDonations = (req, res) => {
  try {
    const donations = db.prepare(`
      SELECT id, donor_name, amount, payment_method, message, badge_tier, created_at 
      FROM donations 
      ORDER BY id DESC 
      LIMIT 20
    `).all();

    const stats = db.prepare(`
      SELECT COUNT(*) as total_supporters, COALESCE(SUM(amount), 0) as total_raised 
      FROM donations
    `).get();

    res.json({
      success: true,
      data: donations,
      stats: {
        totalSupporters: stats.total_supporters || 0,
        totalRaised: stats.total_raised || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/donations (record a new contribution/supporter)
exports.createDonation = (req, res) => {
  try {
    const { donor_name, amount, payment_method, message } = req.body;

    if (!donor_name || amount === undefined || amount === null) {
      return res.status(400).json({
        success: false,
        message: 'Donor name and donation amount are required.'
      });
    }

    const cleanName = String(donor_name).trim().slice(0, 60);
    if (cleanName.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Donor name must be at least 2 characters long.'
      });
    }

    const numAmount = Math.round(parseFloat(amount) * 100) / 100;
    if (isNaN(numAmount) || numAmount < 1 || numAmount > 50000) {
      return res.status(400).json({
        success: false,
        message: 'Donation amount must be between ₹1 and ₹50,000.'
      });
    }

    const cleanMessage = message ? String(message).trim().slice(0, 180) : 'Proud supporter of F-TECH Student-Hub';
    const validMethods = ['UPI', 'Card', 'NetBanking', 'QR', 'Cash'];
    const cleanMethod = validMethods.includes(payment_method) ? payment_method : 'UPI';

    // Calculate badge tier deterministically from verified amount
    let tier = 'Supporter';
    if (numAmount >= 499) {
      tier = 'Patron of Education';
    } else if (numAmount >= 199) {
      tier = 'Academic Hero';
    } else if (numAmount >= 49) {
      tier = 'Chai Supporter';
    }

    const insert = db.prepare(`
      INSERT INTO donations (donor_name, amount, payment_method, message, badge_tier)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      cleanName,
      numAmount,
      cleanMethod,
      cleanMessage,
      tier
    );

    res.status(201).json({
      success: true,
      message: `Thank you ${cleanName}! Your contribution as a ${tier} has been recorded.`,
      donationId: Number(result.lastInsertRowid),
      tier
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
