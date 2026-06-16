const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { generateToken, authenticateToken } = require('../auth');
const router = express.Router();

router.post('/register', (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'All fields required' });

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
    if (existing) return res.status(400).json({ error: 'User already exists' });

    const hashed = bcrypt.hashSync(password, 10);
    const id = uuidv4();
    db.prepare('INSERT INTO users (id, username, email, password) VALUES (?, ?, ?, ?)').run(id, username, email, hashed);

    const token = generateToken({ id, username });
    res.json({ token, user: { id, username, email, avatar: null, status: 'offline' } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'All fields required' });

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    if (user.banned) return res.status(403).json({ error: 'Account suspended' });

    const match = bcrypt.compareSync(password, user.password);
    if (!match) return res.status(400).json({ error: 'Invalid credentials' });

    db.prepare('INSERT INTO login_logs (id, user_id, ip, user_agent) VALUES (?, ?, ?, ?)').run(
      uuidv4(), user.id, req.ip || req.headers['x-forwarded-for'] || null, req.headers['user-agent'] || null
    );

    const token = generateToken({ id: user.id, username: user.username });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar, status: user.status, is_admin: !!user.is_admin } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/me', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT id, username, email, avatar, status, is_admin, banned, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.banned) return res.status(403).json({ error: 'Account suspended' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
