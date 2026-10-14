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
    // 1. documents table: ensure 'syllabus' is accepted in CHECK constraint
    const docTableSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='documents'").get();
    if (docTableSql && !docTableSql.sql.includes('syllabus')) {
      db.exec("PRAGMA foreign_keys = OFF;");
      db.exec(`
        CREATE TABLE documents_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('notes', 'aktu-paper', 'lab', 'tutorial', 'syllabus')),
          subject_id INTEGER,
          subject_code TEXT,
          semester INTEGER NOT NULL,
          branch TEXT NOT NULL DEFAULT 'CSE',
          unit INTEGER DEFAULT 1,
          year INTEGER,
          file_path TEXT,
          file_name TEXT NOT NULL,
          file_size INTEGER DEFAULT 1048576,
          mime_type TEXT DEFAULT 'application/pdf',
          author_name TEXT DEFAULT 'Aditya Kumar Sharma (F-TECH)',
          uploader_role TEXT DEFAULT 'Admin',
          downloads_count INTEGER DEFAULT 0,
          views_count INTEGER DEFAULT 0,
          likes_count INTEGER DEFAULT 0,
          dislikes_count INTEGER DEFAULT 0,
          rating REAL DEFAULT 4.9,
          is_approved INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE SET NULL
        );
      `);
      const existingCols = db.prepare("PRAGMA table_info(documents)").all().map(c => c.name);
      const commonCols = ['id', 'title', 'type', 'subject_id', 'subject_code', 'semester', 'branch', 'unit', 'year', 'file_path', 'file_name', 'file_size', 'mime_type', 'author_name', 'uploader_role', 'downloads_count', 'views_count', 'likes_count', 'dislikes_count', 'rating', 'is_approved', 'created_at'].filter(c => existingCols.includes(c));
      const colList = commonCols.join(', ');
      db.exec(`INSERT INTO documents_new (${colList}) SELECT ${colList} FROM documents;`);
      db.exec("DROP TABLE documents;");
      db.exec("ALTER TABLE documents_new RENAME TO documents;");
      db.exec("PRAGMA foreign_keys = ON;");
      console.log('[F-TECH-Student-Hub] Migrated documents table to support syllabus type.');
    }

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
    if (!userCols.includes('last_active_at')) {
      db.exec("ALTER TABLE users ADD COLUMN last_active_at DATETIME");
    }
    if (!userCols.includes('last_ip')) {
      db.exec("ALTER TABLE users ADD COLUMN last_ip TEXT");
    }
    if (!userCols.includes('last_user_agent')) {
      db.exec("ALTER TABLE users ADD COLUMN last_user_agent TEXT");
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

    // 6. subsubjects / units table
    db.exec(`
      CREATE TABLE IF NOT EXISTS subsubjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject_code TEXT NOT NULL,
        unit_number INTEGER NOT NULL DEFAULT 1,
        title TEXT NOT NULL,
        description TEXT,
        topics TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 7. user_activity_logs table
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        user_email TEXT,
        user_name TEXT,
        action TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        user_agent TEXT,
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

  const semMeta = db.prepare("SELECT value FROM system_metadata WHERE key = 'max_semesters'").get();
  if (!semMeta) {
    db.prepare("INSERT INTO system_metadata (key, value) VALUES ('max_semesters', '8')").run();
  }

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

  // 4. Seed Standard Subsubjects / Units if empty
  const subsubCount = db.prepare('SELECT COUNT(*) as count FROM subsubjects').get().count;
  if (subsubCount === 0) {
    console.log('[F-TECH-Student-Hub] Initializing standard academic course units & modules...');
    const insertSub = db.prepare(`
      INSERT INTO subsubjects (subject_code, unit_number, title, description, topics)
      VALUES (?, ?, ?, ?, ?)
    `);

    const standardUnits = [
      ['KCS-301', 1, 'Unit 1: Introduction to Data Structures & Arrays', 'Linear data structures, memory layout, pointers and sparse matrices.', 'Time Complexity, Big-Oh Notation, Arrays, Row-Major, Column-Major, Sparse Matrices.'],
      ['KCS-301', 2, 'Unit 2: Stacks, Queues & Recursion', 'LIFO & FIFO concepts, recursion simulation, evaluation of postfix/prefix expressions.', 'Stack ADT, Queue, Circular Queue, Deque, Tower of Hanoi, Infix to Postfix.'],
      ['KCS-301', 3, 'Unit 3: Linked Lists & Applications', 'Singly, doubly, and circular linked lists, polynomial arithmetic.', 'Dynamic Memory, Singly Linked List, Doubly Linked List, Header Nodes, Polynomial Addition.'],
      ['KCS-301', 4, 'Unit 4: Non-Linear Structures: Trees & Graphs', 'Binary search trees, AVL rotations, graph traversals and spanning trees.', 'Binary Trees, BST, AVL Tree Balance Factors, Threaded Binary Trees, BFS, DFS, Kruskal, Prim.'],
      ['KCS-301', 5, 'Unit 5: Searching, Sorting & Hash Tables', 'Searching algorithms, internal and external sorting, hashing collision resolution.', 'Binary Search, Quick Sort, Merge Sort, Heap Sort, Hash Functions, Open Addressing, Chaining.'],
      
      ['KCS-401', 1, 'Unit 1: OS Principles & System Calls', 'Architecture of modern operating systems, dual-mode execution and services.', 'Monolithic vs Microkernel, System Calls, Trap Handlers, Process State Diagram.'],
      ['KCS-401', 2, 'Unit 2: CPU Scheduling & Process Sync', 'Preemptive vs non-preemptive algorithms, Critical Section Problem, semaphores.', 'FCFS, SJF, Round Robin, Multilevel Queues, Peterson Solution, Semaphores, Monitors.'],
      ['KCS-401', 3, 'Unit 3: Deadlock Avoidance & Detection', 'Conditions for deadlock, resource allocation graphs, Banker algorithm.', 'Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait, Banker Algorithm, Safety Check.'],
      ['KCS-401', 4, 'Unit 4: Memory Management & Virtual Memory', 'Paging, segmentation, address translation, page replacement algorithms.', 'Page Tables, TLB, Page Fault Handler, FIFO, LRU, Optimal Page Replacement, Thrashing.'],
      ['KCS-401', 5, 'Unit 5: File Systems & I/O Systems', 'Directory structures, disk scheduling algorithms, file allocation methods.', 'Contiguous, Linked, Indexed Allocation, SSTF, SCAN, C-SCAN Disk Scheduling.']
    ];

    for (const u of standardUnits) {
      insertSub.run(...u);
    }
  }
}

seedDatabase();

// Sync Users from Cloud PostgreSQL (Neon / Supabase) on startup
setTimeout(async () => {
  try {
    const postgresService = require('../services/postgresService');
    await postgresService.syncUsersFromPg(db);
  } catch (e) {
    console.warn('[F-TECH Boot Sync Notice]:', e.message);
  }
}, 800);

module.exports = db;

