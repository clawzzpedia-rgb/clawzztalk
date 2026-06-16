const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { authenticateToken } = require('../auth');
const router = express.Router();

router.get('/search/:query', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const users = db.prepare(`
      SELECT id, username, avatar, status FROM users
      WHERE username LIKE ? AND id != ?
      LIMIT 20
    `).all(`%${req.params.query}%`, req.user.id);
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/dm', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const dms = db.prepare(`
      SELECT dc.id as dm_id, u.id as user_id, u.username, u.avatar, u.status
      FROM dm_channels dc
      JOIN dm_members dm1 ON dc.id = dm1.dm_id AND dm1.user_id = ?
      JOIN dm_members dm2 ON dc.id = dm2.dm_id AND dm2.user_id != ?
      JOIN users u ON dm2.user_id = u.id
      ORDER BY dc.created_at DESC
    `).all(req.user.id, req.user.id);
    res.json(dms);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/dm/:userId', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare(`
      SELECT dc.id FROM dm_channels dc
      JOIN dm_members dm1 ON dc.id = dm1.dm_id AND dm1.user_id = ?
      JOIN dm_members dm2 ON dc.id = dm2.dm_id AND dm2.user_id = ?
    `).get(req.user.id, req.params.userId);

    if (existing) {
      const user = db.prepare('SELECT id, username, avatar, status FROM users WHERE id = ?').get(req.params.userId);
      return res.json({ dm_id: existing.id, user });
    }

    const dmId = uuidv4();
    db.prepare('INSERT INTO dm_channels (id) VALUES (?)').run(dmId);
    db.prepare('INSERT INTO dm_members (id, dm_id, user_id) VALUES (?, ?, ?)').run(uuidv4(), dmId, req.user.id);
    db.prepare('INSERT INTO dm_members (id, dm_id, user_id) VALUES (?, ?, ?)').run(uuidv4(), dmId, req.params.userId);

    const user = db.prepare('SELECT id, username, avatar, status FROM users WHERE id = ?').get(req.params.userId);
    res.json({ dm_id: dmId, user });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
