const Database = require('better-sqlite3');
const path = require('path');

let db;

function getDb() {
  if (db) return db;
  const dbPath = path.join(__dirname, '..', 'data.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

function initDb() {
  const d = getDb();

  d.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      avatar TEXT DEFAULT NULL,
      status TEXT DEFAULT 'offline',
      is_admin INTEGER DEFAULT 0,
      banned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT DEFAULT NULL,
      owner_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS server_members (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(server_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'text',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT DEFAULT '',
      file_url TEXT DEFAULT NULL,
      file_type TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS dm_channels (
      id TEXT PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS dm_members (
      id TEXT PRIMARY KEY,
      dm_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      UNIQUE(dm_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS dm_messages (
      id TEXT PRIMARY KEY,
      dm_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT DEFAULT '',
      file_url TEXT DEFAULT NULL,
      file_type TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS login_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      ip TEXT DEFAULT NULL,
      user_agent TEXT DEFAULT NULL,
      action TEXT DEFAULT 'login',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS friends (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      friend_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      action_user_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, friend_id)
    );

    CREATE TABLE IF NOT EXISTS recordings (
      id TEXT PRIMARY KEY,
      channel_id TEXT,
      server_id TEXT,
      started_by TEXT NOT NULL,
      file_url TEXT,
      duration INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const count = d.prepare('SELECT COUNT(*) as c FROM users').get();
  if (count.c === 0) {
    const bcrypt = require('bcryptjs');
    const { v4: uuidv4 } = require('uuid');
    const hash = bcrypt.hashSync('admin123', 10);
    const id = uuidv4();
    d.prepare('INSERT INTO users (id, username, email, password, is_admin) VALUES (?, ?, ?, ?, 1)').run(id, 'admin', 'admin@clawzztalk.xyz', hash);
    console.log('Admin account created — email: admin@clawzztalk.xyz / password: admin123');
  }

  const hasAdmin = d.prepare('SELECT COUNT(*) as c FROM users WHERE is_admin = 1').get();
  if (hasAdmin.c === 0) {
    d.prepare('UPDATE users SET is_admin = 1 ORDER BY created_at ASC LIMIT 1').run();
    console.log('First user promoted to admin');
  }

  console.log('Database initialized');
}

module.exports = { getDb, initDb };
