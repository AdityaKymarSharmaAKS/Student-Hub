/**
 * F-TECH-Student-Hub PostgreSQL & Supabase Database Service
 * Company: F-TECH
 * Founder & Owner: Aditya Kumar Sharma
 * Description: Manages connection to PostgreSQL (Neon Lakebase / Supabase),
 *              real-time user persistence (never forgotten),
 *              and live user activity tracking.
 */

const { Pool } = require('pg');

let pool = null;
let isConnected = false;

if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    pool.connect((err, client, release) => {
      if (err) {
        console.warn('[F-TECH PostgreSQL] Connection notice:', err.message);
      } else {
        isConnected = true;
        console.log('[F-TECH PostgreSQL] Connected successfully to Cloud PostgreSQL (Neon/Supabase)!');
        release();
      }
    });
  } catch (e) {
    console.warn('[F-TECH PostgreSQL] Initialization warning:', e.message);
  }
}

// Optional Supabase Client initialization
let supabaseClient = null;
if (process.env.SUPABASE_URL && (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY)) {
  try {
    const { createClient } = require('@supabase/supabase-js');
    supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY
    );
    console.log('[F-TECH Supabase] Initialized Supabase Client SDK');
  } catch (e) {
    console.warn('[F-TECH Supabase] SDK notice:', e.message);
  }
}

async function query(text, params) {
  if (!pool) return null;
  try {
    return await pool.query(text, params);
  } catch (err) {
    console.warn('[F-TECH PostgreSQL Query Error]:', err.message);
    return null;
  }
}

// 1. Sync User to PostgreSQL (never forgotten)
async function persistUserToPg(user) {
  if (!pool) return;
  try {
    const sql = `
      INSERT INTO users (full_name, email, password_hash, branch, semester, role, is_blocked, last_active_at, last_ip, last_user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9)
      ON CONFLICT (email) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        password_hash = EXCLUDED.password_hash,
        branch = EXCLUDED.branch,
        semester = EXCLUDED.semester,
        role = EXCLUDED.role,
        is_blocked = EXCLUDED.is_blocked,
        last_active_at = NOW(),
        last_ip = COALESCE(EXCLUDED.last_ip, users.last_ip),
        last_user_agent = COALESCE(EXCLUDED.last_user_agent, users.last_user_agent);
    `;
    await pool.query(sql, [
      user.full_name || user.fullName,
      (user.email || '').toLowerCase().trim(),
      user.password_hash,
      user.branch || 'CSE',
      user.semester || 1,
      user.role || 'Student',
      user.is_blocked ? 1 : 0,
      user.last_ip || null,
      user.last_user_agent || null
    ]);
  } catch (e) {
    console.warn('[F-TECH PostgreSQL User Persist]:', e.message);
  }
}

// 2. Pull Users from PostgreSQL into local database (on startup/recovery)
async function syncUsersFromPg(localDb) {
  if (!pool) return;
  try {
    const res = await pool.query('SELECT * FROM users ORDER BY id ASC');
    if (res && res.rows && res.rows.length > 0) {
      console.log(`[F-TECH PostgreSQL] Restoring/syncing ${res.rows.length} users from cloud PostgreSQL...`);
      const insert = localDb.prepare(`
        INSERT INTO users (id, full_name, email, password_hash, branch, semester, role, is_blocked, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(email) DO UPDATE SET
          full_name = excluded.full_name,
          password_hash = excluded.password_hash,
          branch = excluded.branch,
          semester = excluded.semester,
          role = excluded.role,
          is_blocked = excluded.is_blocked
      `);
      for (const u of res.rows) {
        insert.run(
          u.id,
          u.full_name,
          u.email,
          u.password_hash,
          u.branch,
          u.semester,
          u.role,
          u.is_blocked,
          u.created_at ? new Date(u.created_at).toISOString() : new Date().toISOString()
        );
      }
    }
  } catch (e) {
    console.warn('[F-TECH PostgreSQL Sync Notice]:', e.message);
  }
}

// 3. Record Live Activity Log
async function logActivity({ userId, email, name, action, details, ip, userAgent }, localDb = null) {
  // Save in local DB
  if (localDb) {
    try {
      localDb.prepare(`
        INSERT INTO user_activity_logs (user_id, user_email, user_name, action, details, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId || null,
        email || 'guest@studenthub',
        name || 'Guest Visitor',
        action,
        details || '',
        ip || '127.0.0.1',
        userAgent || ''
      );

      // Update user's last_active_at and IP if logged in
      if (email && email !== 'guest@studenthub') {
        localDb.prepare(`
          UPDATE users 
          SET last_active_at = datetime('now'), last_ip = ?, last_user_agent = ?
          WHERE LOWER(email) = ?
        `).run(ip || '127.0.0.1', userAgent || '', email.toLowerCase().trim());
      }
    } catch (e) {
      console.warn('[F-TECH Local Activity Log]:', e.message);
    }
  }

  // Save in Cloud PostgreSQL
  if (pool) {
    try {
      await pool.query(`
        INSERT INTO user_activity_logs (user_id, user_email, user_name, action, details, ip_address, user_agent, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, [
        userId || null,
        email || 'guest@studenthub',
        name || 'Guest Visitor',
        action,
        details || '',
        ip || '127.0.0.1',
        userAgent || ''
      ]);

      if (email && email !== 'guest@studenthub') {
        await pool.query(`
          UPDATE users
          SET last_active_at = NOW(), last_ip = $1, last_user_agent = $2
          WHERE LOWER(email) = $3
        `, [ip || '127.0.0.1', userAgent || '', email.toLowerCase().trim()]);
      }
    } catch (e) {
      console.warn('[F-TECH Cloud Activity Log]:', e.message);
    }
  }
}

// 4. Live Tracking Data Query
async function getLiveTrackingData(localDb) {
  let onlineUsers = [];
  let recentLogs = [];
  let userCounts = { total: 0, online: 0, blocked: 0 };

  // Try Cloud PostgreSQL first
  if (pool) {
    try {
      const activeRes = await pool.query(`
        SELECT id, full_name, email, branch, semester, role, is_blocked, last_active_at, last_ip, last_user_agent
        FROM users
        ORDER BY last_active_at DESC NULLS LAST
        LIMIT 50
      `);
      if (activeRes && activeRes.rows) {
        onlineUsers = activeRes.rows;
      }

      const logsRes = await pool.query(`
        SELECT id, user_id, user_email, user_name, action, details, ip_address, user_agent, created_at
        FROM user_activity_logs
        ORDER BY id DESC
        LIMIT 60
      `);
      if (logsRes && logsRes.rows) {
        recentLogs = logsRes.rows;
      }

      const countRes = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE is_blocked = 1) as blocked,
          COUNT(*) FILTER (WHERE last_active_at >= NOW() - INTERVAL '30 minutes') as online
        FROM users
      `);
      if (countRes && countRes.rows[0]) {
        userCounts = {
          total: parseInt(countRes.rows[0].total, 10) || 0,
          online: parseInt(countRes.rows[0].online, 10) || 0,
          blocked: parseInt(countRes.rows[0].blocked, 10) || 0
        };
      }
      return {
        onlineUsers,
        liveUsers: onlineUsers,
        recentLogs,
        activityLogs: recentLogs,
        userCounts,
        stats: {
          totalUsers: userCounts.total,
          activeToday: userCounts.online,
          blockedUsers: userCounts.blocked,
          totalDownloads: 0
        },
        database: 'PostgreSQL (Cloud Neon / Supabase)'
      };
    } catch (e) {
      console.warn('[F-TECH Cloud Live Tracking Query]:', e.message);
    }
  }

  // Fallback to SQLite if PostgreSQL offline
  if (localDb) {
    try {
      onlineUsers = localDb.prepare(`
        SELECT id, full_name, email, branch, semester, role, is_blocked, last_active_at, last_ip, last_user_agent
        FROM users
        ORDER BY last_active_at DESC
        LIMIT 50
      `).all();

      recentLogs = localDb.prepare(`
        SELECT * FROM user_activity_logs ORDER BY id DESC LIMIT 60
      `).all();

      const total = localDb.prepare('SELECT COUNT(*) as count FROM users').get().count || 0;
      const blocked = localDb.prepare('SELECT COUNT(*) as count FROM users WHERE is_blocked = 1').get().count || 0;
      const online = localDb.prepare("SELECT COUNT(*) as count FROM users WHERE last_active_at >= datetime('now', '-30 minutes')").get().count || 0;
      userCounts = { total, online, blocked };
    } catch (e) {
      console.warn('[F-TECH Local Live Tracking Query]:', e.message);
    }
  }

  return {
    onlineUsers,
    liveUsers: onlineUsers,
    recentLogs,
    activityLogs: recentLogs,
    userCounts,
    stats: {
      totalUsers: userCounts.total,
      activeToday: userCounts.online,
      blockedUsers: userCounts.blocked,
      totalDownloads: 0
    },
    database: 'Local SQLite'
  };
}

module.exports = {
  pool,
  query,
  supabaseClient,
  persistUserToPg,
  syncUsersFromPg,
  logActivity,
  getLiveTrackingData
};
