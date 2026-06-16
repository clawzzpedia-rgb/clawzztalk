const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { authenticateToken } = require('../auth');
const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const servers = db.prepare(`
      SELECT s.* FROM servers s
      JOIN server_members sm ON s.id = sm.server_id
      WHERE sm.user_id = ?
      ORDER BY s.created_at DESC
    `).all(req.user.id);
    res.json(servers);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', authenticateToken, (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });

    const db = getDb();
    const id = uuidv4();
    db.prepare('INSERT INTO servers (id, name, owner_id) VALUES (?, ?, ?)').run(id, name, req.user.id);
    db.prepare('INSERT INTO server_members (id, server_id, user_id, role) VALUES (?, ?, ?, ?)').run(uuidv4(), id, req.user.id, 'owner');

    const channelId = uuidv4();
    db.prepare('INSERT INTO channels (id, server_id, name) VALUES (?, ?, ?)').run(channelId, id, 'general');

    const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(id);
    res.json(server);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);
    if (!server) return res.status(404).json({ error: 'Server not found' });

    const channels = db.prepare('SELECT * FROM channels WHERE server_id = ? ORDER BY created_at ASC').all(req.params.id);
    const members = db.prepare(`
      SELECT u.id, u.username, u.avatar, u.status, sm.role
      FROM server_members sm JOIN users u ON sm.user_id = u.id
      WHERE sm.server_id = ?
    `).all(req.params.id);

    res.json({ ...server, channels, members });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:id/join', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM server_members WHERE server_id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (existing) return res.status(400).json({ error: 'Already a member' });

    db.prepare('INSERT INTO server_members (id, server_id, user_id) VALUES (?, ?, ?)').run(uuidv4(), req.params.id, req.user.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/search/:query', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const servers = db.prepare('SELECT * FROM servers WHERE name LIKE ? LIMIT 20').all(`%${req.params.query}%`);
    res.json(servers);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id/members', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const members = db.prepare(`
      SELECT u.id, u.username, u.avatar, u.status, sm.role
      FROM server_members sm JOIN users u ON sm.user_id = u.id
      WHERE sm.server_id = ?
    `).all(req.params.id);
    res.json(members);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
