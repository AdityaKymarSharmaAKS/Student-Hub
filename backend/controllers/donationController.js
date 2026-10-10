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
    const { donor_name, amount, payment_method, message, badge_tier } = req.body;

    if (!donor_name || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Donor name and amount are required.'
      });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid donation amount is required.'
      });
    }

    // Determine badge tier if not provided
    let tier = badge_tier;
    if (!tier) {
      if (numAmount >= 499) tier = 'Patron of Education';
      else if (numAmount >= 199) tier = 'Academic Hero';
      else if (numAmount >= 49) tier = 'Chai Supporter';
      else tier = 'Supporter';
    }

    const insert = db.prepare(`
      INSERT INTO donations (donor_name, amount, payment_method, message, badge_tier)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      donor_name.trim(),
      numAmount,
      payment_method || 'UPI',
      message ? message.trim() : 'Proud supporter of F-TECH Student-Hub',
      tier
    );

    res.status(201).json({
      success: true,
      message: `Thank you ${donor_name.trim()}! Your support as a ${tier} has been recorded.`,
      donationId: Number(result.lastInsertRowid),
      tier
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
