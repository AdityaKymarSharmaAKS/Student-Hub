/**
 * ====================================================================
 * F-TECH-Student-Hub API Server
 * ====================================================================
 * Company: F-TECH
 * Founder & Owner: Aditya Kumar Sharma
 * Web App: F-TECH-Student-Hub
 * Description: High-performance academic server supporting AKTU PYQs,
 *              handwritten notes, practical lab code, tutorials,
 *              community boards, and admin governance.
 * ====================================================================
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and Body Parsers
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure database and uploads directory exist
require('./config/database');

// Static assets & frontend serving
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/subjects', require('./routes/subjects'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/community', require('./routes/community'));
app.use('/api/admin', require('./routes/admin'));

// Public Stats Endpoint
app.get('/api/stats', (req, res) => {
  try {
    const db = require('./config/database');
    const subjectsCount = db.prepare('SELECT COUNT(*) as count FROM subjects').get().count || 0;
    const documentsCount = db.prepare('SELECT COUNT(*) as count FROM documents WHERE is_approved = 1').get().count || 0;
    const totalDownloads = db.prepare('SELECT SUM(downloads_count) as total FROM documents').get().total || 0;
    const totalViews = db.prepare('SELECT SUM(views_count) as total FROM documents').get().total || 0;
    const papersCount = db.prepare("SELECT COUNT(*) as count FROM documents WHERE type = 'aktu-paper' AND is_approved = 1").get().count || 0;
    const notesCount = db.prepare("SELECT COUNT(*) as count FROM documents WHERE type = 'notes' AND is_approved = 1").get().count || 0;

    res.json({
      success: true,
      stats: {
        subjectsCount,
        documentsCount,
        totalDownloads,
        totalViews,
        papersCount,
        notesCount,
        company: 'F-TECH',
        founder: 'Aditya Kumar Sharma'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// API Health & Metadata Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    app: 'F-TECH-Student-Hub',
    company: 'F-TECH',
    founder: 'Aditya Kumar Sharma',
    timestamp: new Date().toISOString()
  });
});

// Fallback for root
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[F-TECH Server Error]:', err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log('================================================================');
  console.log('  🚀 F-TECH-Student-Hub is Running!');
  console.log('  🏢 Company: F-TECH');
  console.log('  👑 Founder & Owner: Aditya Kumar Sharma');
  console.log(`  🌐 Local URL: http://localhost:${PORT}`);
  console.log(`  📂 Static Portal: ${frontendPath}`);
  console.log('================================================================');
});
