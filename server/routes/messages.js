const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { authenticateToken } = require('../auth');
const router = express.Router();

router.get('/channel/:channelId', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const messages = db.prepare(`
      SELECT m.*, u.username, u.avatar
      FROM messages m JOIN users u ON m.user_id = u.id
      WHERE m.channel_id = ?
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `).all(req.params.channelId, limit, offset);

    res.json(messages.reverse());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/channel/:channelId', authenticateToken, (req, res) => {
  try {
    const { content, file_url, file_type } = req.body;
    const db = getDb();
    const id = uuidv4();

    db.prepare(`
      INSERT INTO messages (id, channel_id, user_id, content, file_url, file_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, req.params.channelId, req.user.id, content || '', file_url || null, file_type || null);

    const message = db.prepare(`
      SELECT m.*, u.username, u.avatar
      FROM messages m JOIN users u ON m.user_id = u.id
      WHERE m.id = ?
    `).get(id);

    res.json(message);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const msg = db.prepare('SELECT * FROM messages WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!msg) return res.status(403).json({ error: 'Unauthorized' });

    db.prepare('DELETE FROM messages WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/dm/:dmId', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const messages = db.prepare(`
      SELECT m.*, u.username, u.avatar
      FROM dm_messages m JOIN users u ON m.user_id = u.id
      WHERE m.dm_id = ?
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `).all(req.params.dmId, limit, offset);

    res.json(messages.reverse());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/dm/:dmId', authenticateToken, (req, res) => {
  try {
    const { content, file_url, file_type } = req.body;
    const db = getDb();
    const id = uuidv4();

    db.prepare(`
      INSERT INTO dm_messages (id, dm_id, user_id, content, file_url, file_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, req.params.dmId, req.user.id, content || '', file_url || null, file_type || null);

    const message = db.prepare(`
      SELECT m.*, u.username, u.avatar
      FROM dm_messages m JOIN users u ON m.user_id = u.id
      WHERE m.id = ?
    `).get(id);

    res.json(message);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
