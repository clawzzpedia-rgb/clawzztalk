const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { authenticateToken } = require('../auth');
const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const friends = db.prepare(`
      SELECT u.id, u.username, u.avatar, u.status, f.created_at AS friended_at
      FROM friends f
      JOIN users u ON (CASE WHEN f.user_id = ? THEN f.friend_id ELSE f.user_id END) = u.id
      WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted'
    `).all(req.user.id, req.user.id, req.user.id);
    res.json(friends);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/pending', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const pending = db.prepare(`
      SELECT f.id AS request_id, u.id, u.username, u.avatar, u.status, f.created_at
      FROM friends f
      JOIN users u ON f.user_id = u.id
      WHERE f.friend_id = ? AND f.status = 'pending'
    `).all(req.user.id);
    res.json(pending);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/sent', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const sent = db.prepare(`
      SELECT f.id AS request_id, u.id, u.username, u.avatar, u.status, f.created_at
      FROM friends f
      JOIN users u ON f.friend_id = u.id
      WHERE f.user_id = ? AND f.status = 'pending'
    `).all(req.user.id);
    res.json(sent);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/status/:userId', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const row = db.prepare(`
      SELECT status, action_user_id FROM friends
      WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
    `).get(req.user.id, req.params.userId, req.params.userId, req.user.id);
    res.json({ status: row?.status || 'none', action_user_id: row?.action_user_id || null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/request/:userId', authenticateToken, (req, res) => {
  try {
    if (req.user.id === req.params.userId) return res.status(400).json({ error: 'Cannot friend yourself' });
    const db = getDb();
    const existing = db.prepare(`
      SELECT status FROM friends
      WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
    `).get(req.user.id, req.params.userId, req.params.userId, req.user.id);

    if (existing) return res.status(400).json({ error: 'Friend request already ' + existing.status });

    const id = uuidv4();
    db.prepare('INSERT INTO friends (id, user_id, friend_id, status, action_user_id) VALUES (?, ?, ?, ?, ?)').run(id, req.user.id, req.params.userId, 'pending', req.user.id);
    res.json({ id, status: 'pending' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/accept/:userId', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare(`
      UPDATE friends SET status = 'accepted'
      WHERE friend_id = ? AND user_id = ? AND status = 'pending'
    `).run(req.user.id, req.params.userId);
    if (result.changes === 0) return res.status(404).json({ error: 'No pending request found' });
    res.json({ status: 'accepted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/reject/:userId', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare(`
      DELETE FROM friends
      WHERE friend_id = ? AND user_id = ? AND status = 'pending'
    `).run(req.user.id, req.params.userId);
    if (result.changes === 0) return res.status(404).json({ error: 'No pending request found' });
    res.json({ status: 'rejected' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:userId', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    db.prepare(`
      DELETE FROM friends
      WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
    `).run(req.user.id, req.params.userId, req.params.userId, req.user.id);
    res.json({ status: 'removed' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
