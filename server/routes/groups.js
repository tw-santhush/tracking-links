const express = require('express');
const db = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  const groups = await db.all(
    `SELECT g.*, (SELECT COUNT(*) FROM links WHERE group_id = g.id) AS link_count
     FROM groups g WHERE g.user_id = ? ORDER BY g.name`,
    [req.session.userId]
  );
  res.json(groups);
});

router.post('/', requireAuth, async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name required' });
  const id = await db.runAndGetId('INSERT INTO groups (user_id, name) VALUES (?, ?)', [req.session.userId, name.trim()]);
  const group = await db.get('SELECT * FROM groups WHERE id = ?', [id]);
  res.json({ ...group, link_count: 0 });
});

router.put('/:id', requireAuth, async (req, res) => {
  const group = await db.get('SELECT id FROM groups WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId]);
  if (!group) return res.status(404).json({ error: 'Not found' });
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name required' });
  await db.run('UPDATE groups SET name = ? WHERE id = ?', [name.trim(), group.id]);
  res.json({ ok: true });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const group = await db.get('SELECT id FROM groups WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId]);
  if (!group) return res.status(404).json({ error: 'Not found' });
  const linkCount = await db.get('SELECT COUNT(*) as count FROM links WHERE group_id = ?', [group.id]);
  if (linkCount.count > 0) return res.status(400).json({ error: `Group has ${linkCount.count} link(s). Move or delete them first.` });
  await db.run('DELETE FROM groups WHERE id = ?', [group.id]);
  res.json({ ok: true });
});

module.exports = router;