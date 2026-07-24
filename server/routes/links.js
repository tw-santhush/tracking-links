const express = require('express');
const { nanoid } = require('nanoid');
const db = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, (req, res) => {
  const { destination, label } = req.body;
  if (!destination) {
    return res.status(400).json({ error: 'Destination URL required' });
  }
  const code = nanoid(8);
  const id = db.runAndGetId(
    'INSERT INTO links (user_id, code, destination, label) VALUES (?, ?, ?, ?)',
    [req.session.userId, code, destination, label || '']
  );
  const link = db.get('SELECT * FROM links WHERE id = ?', [id]);
  res.json(link);
});

router.get('/', requireAuth, (req, res) => {
  const links = db.all(
    `SELECT l.*, (SELECT COUNT(*) FROM clicks WHERE link_id = l.id) AS click_count
     FROM links l WHERE l.user_id = ? ORDER BY l.created_at DESC`,
    [req.session.userId]
  );
  res.json(links);
});

router.get('/:id', requireAuth, (req, res) => {
  const link = db.get(
    `SELECT l.*, (SELECT COUNT(*) FROM clicks WHERE link_id = l.id) AS click_count
     FROM links l WHERE l.id = ? AND l.user_id = ?`,
    [req.params.id, req.session.userId]
  );
  if (!link) return res.status(404).json({ error: 'Not found' });

  const clicks = db.all(
    'SELECT * FROM clicks WHERE link_id = ? ORDER BY timestamp DESC',
    [link.id]
  );

  res.json({ link, clicks });
});

router.delete('/:id', requireAuth, (req, res) => {
  const link = db.get('SELECT id FROM links WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId]);
  if (!link) return res.status(404).json({ error: 'Not found' });
  db.run('DELETE FROM clicks WHERE link_id = ?', [link.id]);
  db.run('DELETE FROM links WHERE id = ?', [link.id]);
  res.json({ ok: true });
});

module.exports = router;