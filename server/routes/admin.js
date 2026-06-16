const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { authenticateToken } = require('../auth');
const router = express.Router();

function requireAdmin(req, res, next) {
  const db = getDb();
  const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.user.id);
  if (!user || !user.is_admin) return res.status(403).json({ error: 'Admin access required' });
  next();
}

router.get('/users', authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const users = db.prepare(`
      SELECT id, username, email, avatar, status, is_admin, banned, created_at
      FROM users ORDER BY created_at DESC
    `).all();
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/users/:id/toggle-ban', authenticateToken, requireAdmin, (req, res) => {
  try {
    if (req.user.id === req.params.id) return res.status(400).json({ error: 'Cannot ban yourself' });
    const db = getDb();
    const user = db.prepare('SELECT banned FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const newStatus = user.banned ? 0 : 1;
    db.prepare('UPDATE users SET banned = ? WHERE id = ?').run(newStatus, req.params.id);
    res.json({ banned: newStatus === 1 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/users/:id/toggle-admin', authenticateToken, requireAdmin, (req, res) => {
  try {
    if (req.user.id === req.params.id) return res.status(400).json({ error: 'Cannot change your own admin status' });
    const db = getDb();
    const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const newStatus = user.is_admin ? 0 : 1;
    db.prepare('UPDATE users SET is_admin = ? WHERE id = ?').run(newStatus, req.params.id);
    res.json({ is_admin: newStatus === 1 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/servers', authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const servers = db.prepare(`
      SELECT s.*, u.username as owner_name,
        (SELECT COUNT(*) FROM server_members WHERE server_id = s.id) as member_count,
        (SELECT COUNT(*) FROM channels WHERE server_id = s.id) as channel_count
      FROM servers s JOIN users u ON s.owner_id = u.id
      ORDER BY s.created_at DESC
    `).all();
    res.json(servers);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/servers/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const channels = db.prepare('SELECT id FROM channels WHERE server_id = ?').all(req.params.id);
    for (const ch of channels) {
      db.prepare('DELETE FROM messages WHERE channel_id = ?').run(ch.id);
    }
    db.prepare('DELETE FROM channels WHERE server_id = ?').run(req.params.id);
    db.prepare('DELETE FROM server_members WHERE server_id = ?').run(req.params.id);
    db.prepare('DELETE FROM servers WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/logs', authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const logs = db.prepare(`
      SELECT l.*, u.username FROM login_logs l
      JOIN users u ON l.user_id = u.id
      ORDER BY l.created_at DESC LIMIT 100
    `).all();
    res.json(logs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/recordings', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { channel_id, server_id } = req.body;
    if (!channel_id) return res.status(400).json({ error: 'Channel ID required' });
    const db = getDb();
    const existing = db.prepare("SELECT * FROM recordings WHERE channel_id = ? AND status = 'active'").get(channel_id);
    if (existing) return res.status(400).json({ error: 'Already recording in this channel' });

    const id = uuidv4();
    db.prepare('INSERT INTO recordings (id, channel_id, server_id, started_by) VALUES (?, ?, ?, ?)').run(id, channel_id, server_id || null, req.user.id);
    const rec = db.prepare('SELECT * FROM recordings WHERE id = ?').get(id);
    res.json(rec);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/recordings/:id/stop', authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    db.prepare("UPDATE recordings SET status = 'stopped' WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/recordings', authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const recordings = db.prepare(`
      SELECT r.*, u.username as started_by_name
      FROM recordings r JOIN users u ON r.started_by = u.id
      ORDER BY r.created_at DESC LIMIT 50
    `).all();
    res.json(recordings);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
