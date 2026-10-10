-- ====================================================================
-- F-TECH-Student-Hub Database Schema
-- Company: F-TECH
-- Founder & Owner: Aditya Kumar Sharma
-- Description: Core schema for Subjects, AKTU Papers, Notes, Labs, 
--              Tutorials, Community Discussions, and Admin Analytics
-- ====================================================================

-- 1. Subjects Table
CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    branch TEXT NOT NULL DEFAULT 'CSE',
    semester INTEGER NOT NULL,
    credits INTEGER DEFAULT 4,
    description TEXT,
    icon TEXT DEFAULT 'book',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Documents Table (Notes, AKTU PYQs, Lab Manuals, Tutorials)
CREATE TABLE IF NOT EXISTS documents (
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

-- 3. Lab Experiments Table
CREATE TABLE IF NOT EXISTS lab_experiments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_code TEXT NOT NULL,
    exp_no INTEGER NOT NULL,
    title TEXT NOT NULL,
    objective TEXT NOT NULL,
    language TEXT DEFAULT 'C/C++',
    code TEXT NOT NULL,
    output_sample TEXT,
    viva_questions TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Community Posts (Discussion & Doubts)
CREATE TABLE IF NOT EXISTS community_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author_name TEXT NOT NULL,
    author_badge TEXT DEFAULT 'Student',
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    answers_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Community Answers Table
CREATE TABLE IF NOT EXISTS community_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    author_name TEXT NOT NULL,
    author_badge TEXT DEFAULT 'Contributor',
    content TEXT NOT NULL,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    is_accepted INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(post_id) REFERENCES community_posts(id) ON DELETE CASCADE
);

-- 6. Donations & Supporters Table
CREATE TABLE IF NOT EXISTS donations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    donor_name TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT DEFAULT 'UPI',
    message TEXT,
    badge_tier TEXT DEFAULT 'Bronze',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT DEFAULT 'SuperAdmin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. Student & Member Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    branch TEXT DEFAULT 'CSE',
    semester INTEGER DEFAULT 1,
    role TEXT DEFAULT 'Student',
    is_blocked INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 9. Email Verifications / OTP Table
CREATE TABLE IF NOT EXISTS email_verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    otp TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 10. Document Downloads Log Table (Auditing who downloaded what)
CREATE TABLE IF NOT EXISTS document_downloads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    user_id INTEGER,
    user_email TEXT,
    user_name TEXT,
    ip_address TEXT,
    downloaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- 11. Document Votes / Feedback Table (Likes & Dislikes per user)
CREATE TABLE IF NOT EXISTS document_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    voter_identifier TEXT NOT NULL,
    vote_type INTEGER NOT NULL, -- +1 for like, -1 for dislike
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(document_id, voter_identifier),
    FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- 12. Community Single-Vote Enforcement Table (Posts & Answers)
CREATE TABLE IF NOT EXISTS community_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_type TEXT NOT NULL, -- 'post' or 'answer'
    target_id INTEGER NOT NULL,
    voter_identifier TEXT NOT NULL,
    vote_type INTEGER NOT NULL, -- +1 for upvote, -1 for downvote
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(target_type, target_id, voter_identifier)
);

-- 13. Tutorials Table (Playlists & Concept Guides)
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
);


