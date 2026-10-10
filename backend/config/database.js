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

    // 5. tutorials table
    db.exec(`
      CREATE TABLE IF NOT EXISTS tutorials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        subject_code TEXT NOT NULL,
        subject_title TEXT,
        semester INTEGER DEFAULT 1,
        video_count INTEGER DEFAULT 10,
        instructor TEXT DEFAULT 'Aditya Kumar Sharma (F-TECH)',
        video_url TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
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

  // 3. Seed Default Tutorials only once on initial platform initialization
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_metadata (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  const tutInit = db.prepare("SELECT value FROM system_metadata WHERE key = 'tutorials_seeded'").get();
  if (!tutInit) {
    const tutCount = db.prepare('SELECT COUNT(*) as count FROM tutorials').get().count;
    if (tutCount === 0) {
      console.log('[F-TECH-Student-Hub] Initializing default academic tutorials...');
      const insertTut = db.prepare(`
        INSERT INTO tutorials (title, subject_code, subject_title, semester, video_count, instructor, video_url, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const initialTutorials = [
        [
          'Complete DSA Zero to Hero Masterclass',
          'KCS-301',
          'Data Structures & Algorithms',
          3,
          12,
          'By F-TECH Engineering Wing',
          'https://www.youtube.com/results?search_query=aktu+data+structures+kcs+301',
          'Arrays, Linked Lists, Stacks, Queues, Binary Trees, AVL Rotations, Graph traversals (BFS/DFS), and AKTU 10-marker derivations.'
        ],
        [
          'OS Concepts, Numericals & Scheduling',
          'KCS-401',
          'Operating Systems',
          4,
          10,
          'By Aditya Kumar Sharma',
          'https://www.youtube.com/results?search_query=aktu+operating+system+kcs+401',
          'Process Synchronization, Semaphores, Peterson\'s algorithm, Banker\'s Deadlock Avoidance, Page Replacement (FIFO, LRU, Optimal).'
        ],
        [
          'Full Stack Web Development & Node.js',
          'KCS-503',
          'Web Technology',
          5,
          8,
          'By F-TECH Tech Lab',
          'https://www.youtube.com/results?search_query=aktu+web+technology+kcs+503',
          'Building client-server architectures, RESTful APIs with Express, JWT sessions, asynchronous JavaScript, and database integration.'
        ],
        [
          'Matrices, Eigenvalues & Calculus',
          'BAS-103',
          'Engineering Mathematics I',
          1,
          14,
          'AKTU 1st Year Core',
          'https://www.youtube.com/results?search_query=aktu+maths+1+bas+103',
          'Cayley-Hamilton Theorem, Rank of Matrix, Partial differentiation, Euler\'s theorem for homogeneous functions, Taylor & Maclaurin series.'
        ]
      ];
      for (const t of initialTutorials) {
        insertTut.run(...t);
      }
      console.log('[F-TECH-Student-Hub] Tutorials seeded successfully.');
    }
    db.prepare("INSERT OR REPLACE INTO system_metadata (key, value) VALUES ('tutorials_seeded', 'true')").run();
  }
}

seedDatabase();

module.exports = db;

