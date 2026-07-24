const express = require('express');
const { nanoid } = require('nanoid');
const bcrypt = require('bcryptjs');
const db = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, (req, res) => {
  try {
    const { destination, label, slug, password, expires_at, utm_source, utm_medium, utm_campaign } = req.body;
    if (!destination) {
      return res.status(400).json({ error: 'Destination URL required' });
    }

    const code = slug && slug.trim() ? slug.trim().replace(/[^a-zA-Z0-9_-]/g, '') : nanoid(8);
    if (!code) {
      return res.status(400).json({ error: 'Invalid slug' });
    }

    const existing = db.get('SELECT id FROM links WHERE code = ?', [code]);
    if (existing) {
      return res.status(409).json({ error: 'Slug already taken' });
    }

    const passwordHash = password ? bcrypt.hashSync(password, 10) : '';

    const id = db.runAndGetId(
      `INSERT INTO links (user_id, code, destination, label, slug, password_hash, expires_at, utm_source, utm_medium, utm_campaign)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.session.userId, code, destination, label || '', slug || '', passwordHash, expires_at || null, utm_source || '', utm_medium || '', utm_campaign || '']
    );
    const link = db.get('SELECT * FROM links WHERE id = ?', [id]);
    res.json(link);
  } catch (err) {
    console.error('POST /api/links error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/', requireAuth, (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  const total = db.get('SELECT COUNT(*) as count FROM links WHERE user_id = ?', [req.session.userId]);
  const links = db.all(
    `SELECT l.*, (SELECT COUNT(*) FROM clicks WHERE link_id = l.id) AS click_count
     FROM links l WHERE l.user_id = ? ORDER BY l.created_at DESC LIMIT ? OFFSET ?`,
    [req.session.userId, limit, offset]
  );
  const hasMore = offset + links.length < total.count;

  res.json({ links, total: total.count, page, limit, hasMore });
});

router.get('/:id', requireAuth, (req, res) => {
  const link = db.get(
    `SELECT l.*, (SELECT COUNT(*) FROM clicks WHERE link_id = l.id) AS click_count
     FROM links l WHERE l.id = ? AND l.user_id = ?`,
    [req.params.id, req.session.userId]
  );
  if (!link) return res.status(404).json({ error: 'Not found' });

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  const total = db.get('SELECT COUNT(*) as count FROM clicks WHERE link_id = ?', [link.id]);
  const clicks = db.all(
    'SELECT * FROM clicks WHERE link_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?',
    [link.id, limit, offset]
  );

  res.json({ link, clicks, total: total.count, page, limit, hasMore: offset + clicks.length < total.count });
});

router.put('/:id', requireAuth, (req, res) => {
  const link = db.get('SELECT id FROM links WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId]);
  if (!link) return res.status(404).json({ error: 'Not found' });

  const { label, password, expires_at, utm_source, utm_medium, utm_campaign } = req.body;
  const passwordHash = password ? bcrypt.hashSync(password, 10) : undefined;

  const fields = [];
  const values = [];

  if (label !== undefined) { fields.push('label = ?'); values.push(label); }
  if (passwordHash !== undefined) { fields.push('password_hash = ?'); values.push(passwordHash); }
  if (expires_at !== undefined) { fields.push('expires_at = ?'); values.push(expires_at || null); }
  if (utm_source !== undefined) { fields.push('utm_source = ?'); values.push(utm_source); }
  if (utm_medium !== undefined) { fields.push('utm_medium = ?'); values.push(utm_medium); }
  if (utm_campaign !== undefined) { fields.push('utm_campaign = ?'); values.push(utm_campaign); }

  if (fields.length > 0) {
    values.push(link.id);
    db.run(`UPDATE links SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  const updated = db.get('SELECT * FROM links WHERE id = ?', [link.id]);
  res.json(updated);
});

router.delete('/:id', requireAuth, (req, res) => {
  const link = db.get('SELECT id FROM links WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId]);
  if (!link) return res.status(404).json({ error: 'Not found' });
  db.run('DELETE FROM clicks WHERE link_id = ?', [link.id]);
  db.run('DELETE FROM links WHERE id = ?', [link.id]);
  res.json({ ok: true });
});

router.get('/:id/export/json', requireAuth, (req, res) => {
  const link = db.get('SELECT * FROM links WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId]);
  if (!link) return res.status(404).json({ error: 'Not found' });
  const clicks = db.all('SELECT * FROM clicks WHERE link_id = ? ORDER BY timestamp DESC', [link.id]);
  res.setHeader('Content-Disposition', `attachment; filename="link-${link.code}-clicks.json"`);
  res.json({ link, clicks });
});

router.get('/:id/export/csv', requireAuth, (req, res) => {
  const link = db.get('SELECT * FROM links WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId]);
  if (!link) return res.status(404).json({ error: 'Not found' });
  const clicks = db.all('SELECT * FROM clicks WHERE link_id = ? ORDER BY timestamp DESC', [link.id]);
  const header = 'timestamp,ip,lat,lng,address,client_lat,client_lng,user_agent';
  const rows = clicks.map(c =>
    `"${c.timestamp || ''}","${c.ip || ''}","${c.lat || ''}","${c.lng || ''}","${(c.address || '').replace(/"/g, '""')}","${c.client_lat || ''}","${c.client_lng || ''}","${(c.user_agent || '').replace(/"/g, '""')}"`
  );
  res.setHeader('Content-Disposition', `attachment; filename="link-${link.code}-clicks.csv"`);
  res.setHeader('Content-Type', 'text/csv');
  res.send([header, ...rows].join('\n'));
});

module.exports = router;