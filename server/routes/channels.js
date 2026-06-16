const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { authenticateToken } = require('../auth');
const router = express.Router();

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { server_id, name } = req.body;
    if (!server_id || !name) return res.status(400).json({ error: 'Server ID and name required' });

    const db = getDb();
    const id = uuidv4();
    await db.prepare('INSERT INTO channels (id, server_id, name) VALUES (?, ?, ?)').run(id, server_id, name);
    const channel = await db.prepare('SELECT * FROM channels WHERE id = ?').get(id);
    res.json(channel);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    await db.prepare('DELETE FROM messages WHERE channel_id = ?').run(req.params.id);
    await db.prepare('DELETE FROM channels WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
