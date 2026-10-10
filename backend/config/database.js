/**
 * F-TECH-Student-Hub Database Configuration & Initializer
 * Company: F-TECH
 * Founder & Owner: Aditya Kumar Sharma
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbDir = path.join(__dirname, '..', '..', 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = process.env.DATABASE_PATH 
  ? path.resolve(__dirname, '..', '..', process.env.DATABASE_PATH)
  : path.join(dbDir, 'student_hub.db');

const db = new DatabaseSync(dbPath);

// Execute schema
const schemaFile = path.join(dbDir, 'schema.sql');
if (fs.existsSync(schemaFile)) {
  const schemaSQL = fs.readFileSync(schemaFile, 'utf8');
  db.exec(schemaSQL);
}

// Safe migrations for newly added columns
function runMigrations() {
  try {
    // 1. documents table
    const docCols = db.prepare("PRAGMA table_info(documents)").all().map(c => c.name);
    if (!docCols.includes('likes_count')) {
      db.exec("ALTER TABLE documents ADD COLUMN likes_count INTEGER DEFAULT 0");
    }
    if (!docCols.includes('dislikes_count')) {
      db.exec("ALTER TABLE documents ADD COLUMN dislikes_count INTEGER DEFAULT 0");
    }

    // 2. users table
    const userCols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
    if (!userCols.includes('is_blocked')) {
      db.exec("ALTER TABLE users ADD COLUMN is_blocked INTEGER DEFAULT 0");
    }

    // 3. community_posts table
    const postCols = db.prepare("PRAGMA table_info(community_posts)").all().map(c => c.name);
    if (!postCols.includes('downvotes')) {
      db.exec("ALTER TABLE community_posts ADD COLUMN downvotes INTEGER DEFAULT 0");
    }

    // 4. community_answers table
    const ansCols = db.prepare("PRAGMA table_info(community_answers)").all().map(c => c.name);
    if (!ansCols.includes('downvotes')) {
      db.exec("ALTER TABLE community_answers ADD COLUMN downvotes INTEGER DEFAULT 0");
    }
  } catch (err) {
    console.warn('[F-TECH-Student-Hub] Migration notice:', err.message);
  }
}
runMigrations();

// Seed Initial Data if empty
function seedDatabase() {
  const countRow = db.prepare('SELECT COUNT(*) as count FROM subjects').get();
  if (countRow.count === 0) {
    console.log('[F-TECH-Student-Hub] Seeding initial academic database...');

    // 1. Subjects
    const insertSubject = db.prepare(`
      INSERT INTO subjects (code, title, branch, semester, credits, description, icon)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const subjects = [
      ['KCS-301', 'Data Structures & Algorithms', 'CSE', 3, 4, 'Linear & non-linear structures, Trees, Graphs, Sorting & Searching, Dynamic Programming.', 'binary'],
      ['KCS-401', 'Operating Systems', 'CSE', 4, 4, 'Process management, concurrency, deadlock, virtual memory, paging and file systems.', 'cpu'],
      ['KCS-302', 'Computer Organization & Architecture', 'CSE', 3, 4, 'Instruction sets, ALU design, memory hierarchy, pipelining, and cache memory.', 'layers'],
      ['KCS-303', 'Discrete Mathematics', 'CSE', 3, 4, 'Set theory, relations, recurrence relations, graph theory, propositional logic.', 'git-merge'],
      ['BAS-103', 'Engineering Mathematics I', 'Common', 1, 4, 'Differential calculus, Matrices, Multiple integrals, Vector calculus.', 'calculator'],
      ['KCS-501', 'Database Management Systems', 'CSE', 5, 4, 'Relational models, SQL, ER diagrams, Normalization, indexing, ACID transactions.', 'database'],
      ['KCS-502', 'Design & Analysis of Algorithms', 'CSE', 5, 4, 'Divide & Conquer, Greedy method, Dynamic Programming, NP-completeness.', 'workflow'],
      ['KCS-503', 'Web Technology', 'CSE', 5, 3, 'HTML5, CSS3, Modern JS, Node.js, Express, REST APIs, Session management.', 'globe'],
      ['KCS-601', 'Compiler Design', 'CSE', 6, 4, 'Lexical analysis, syntax parsers, intermediate code generation, code optimization.', 'terminal'],
      ['KCS-701', 'Artificial Intelligence & ML', 'CSE', 7, 4, 'Search algorithms, Knowledge representation, neural nets, regression, ML pipelines.', 'sparkles']
    ];

    for (const sub of subjects) {
      insertSubject.run(...sub);
    }
    console.log('[F-TECH-Student-Hub] Academic subjects seeded successfully.');
  }

  // Ensure Default Admin User exists
  const adminCount = db.prepare('SELECT COUNT(*) as count FROM admin_users').get();
  if (adminCount.count === 0) {
    const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'ftechadmin2026', 10);
    const insertAdmin = db.prepare(`
      INSERT INTO admin_users (username, password_hash, full_name, role)
      VALUES (?, ?, ?, ?)
    `);
    insertAdmin.run(
      process.env.ADMIN_USERNAME || 'admin',
      hash,
      'Aditya Kumar Sharma',
      'SuperAdmin'
    );
    console.log('[F-TECH-Student-Hub] Default admin account initialized.');
  }
}

seedDatabase();

module.exports = db;

