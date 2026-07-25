const express = require('express');
const { nanoid } = require('nanoid');
const bcrypt = require('bcryptjs');
const db = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, async (req, res) => {
  try {
    const { destination, label, slug, password, expires_at, utm_source, utm_medium, utm_campaign, group_id } = req.body;
    if (!destination) {
      return res.status(400).json({ error: 'Destination URL required' });
    }

    const code = slug && slug.trim() ? slug.trim().replace(/[^a-zA-Z0-9_-]/g, '') : nanoid(8);
    if (!code) {
      return res.status(400).json({ error: 'Invalid slug' });
    }

    const existing = await db.get('SELECT id FROM links WHERE code = ?', [code]);
    if (existing) {
      return res.status(409).json({ error: 'Slug already taken' });
    }

    const passwordHash = password ? bcrypt.hashSync(password, 10) : '';

    const id = await db.runAndGetId(
      `INSERT INTO links (user_id, code, destination, label, slug, password_hash, expires_at, utm_source, utm_medium, utm_campaign, group_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.session.userId, code, destination, label || '', slug || '', passwordHash, expires_at || null, utm_source || '', utm_medium || '', utm_campaign || '', group_id || 0]
    );
    const link = await db.get('SELECT * FROM links WHERE id = ?', [id]);
    res.json(link);
  } catch (err) {
    console.error('POST /api/links error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/', requireAuth, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const { group_id } = req.query;

  let conditions = 'WHERE user_id = ?';
  const params = [req.session.userId];

  if (group_id) {
    conditions += ' AND group_id = ?';
    params.push(parseInt(group_id));
  }

  const total = await db.get(`SELECT COUNT(*) as count FROM links ${conditions}`, params);
  const links = await db.all(
    `SELECT l.*, (SELECT COUNT(*) FROM clicks WHERE link_id = l.id) AS click_count
     FROM links l ${conditions} ORDER BY l.created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const hasMore = offset + links.length < total.count;

  res.json({ links, total: total.count, page, limit, hasMore });
});

router.get('/:id', requireAuth, async (req, res) => {
  const link = await db.get(
    `SELECT l.*, (SELECT COUNT(*) FROM clicks WHERE link_id = l.id) AS click_count
     FROM links l WHERE l.id = ? AND l.user_id = ?`,
    [req.params.id, req.session.userId]
  );
  if (!link) return res.status(404).json({ error: 'Not found' });

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  const { date_from, date_to, browser, os, device } = req.query;

  const conditions = ['link_id = ?'];
  const params = [link.id];

  if (date_from) { conditions.push('timestamp >= ?'); params.push(date_from + ' 00:00:00'); }
  if (date_to) { conditions.push('timestamp <= ?'); params.push(date_to + ' 23:59:59'); }

  if (browser) {
    if (browser === 'Chrome') conditions.push("user_agent LIKE '%Chrome%' AND user_agent NOT LIKE '%Edg%'");
    else if (browser === 'Firefox') conditions.push("user_agent LIKE '%Firefox%'");
    else if (browser === 'Safari') conditions.push("user_agent LIKE '%Safari%' AND user_agent NOT LIKE '%Chrome%'");
    else if (browser === 'Edge') conditions.push("user_agent LIKE '%Edg%'");
    else if (browser === 'IE') conditions.push("(user_agent LIKE '%MSIE%' OR user_agent LIKE '%Trident%')");
    else if (browser === 'Other') conditions.push("user_agent NOT LIKE '%Chrome%' AND user_agent NOT LIKE '%Firefox%' AND user_agent NOT LIKE '%Safari%' AND user_agent NOT LIKE '%Edg%' AND user_agent NOT LIKE '%MSIE%' AND user_agent NOT LIKE '%Trident%'");
  }

  if (os) {
    if (os === 'Windows') conditions.push("user_agent LIKE '%Windows%'");
    else if (os === 'macOS') conditions.push("(user_agent LIKE '%Mac OS%' OR user_agent LIKE '%Macintosh%')");
    else if (os === 'Linux') conditions.push("user_agent LIKE '%Linux%' AND user_agent NOT LIKE '%Android%'");
    else if (os === 'Android') conditions.push("user_agent LIKE '%Android%'");
    else if (os === 'iOS') conditions.push("(user_agent LIKE '%iPhone%' OR user_agent LIKE '%iPad%')");
  }

  if (device) {
    if (device === 'Mobile') conditions.push("(user_agent LIKE '%Mobi%' OR user_agent LIKE '%Android%' OR user_agent LIKE '%iPhone%')");
    else if (device === 'Desktop') conditions.push("user_agent NOT LIKE '%Mobi%' AND user_agent NOT LIKE '%Android%' AND user_agent NOT LIKE '%iPhone%'");
    else if (device === 'Tablet') conditions.push("(user_agent LIKE '%iPad%' OR (user_agent LIKE '%Android%' AND user_agent LIKE '%Tablet%'))");
  }

  const where = conditions.join(' AND ');
  const total = await db.get(`SELECT COUNT(*) as count FROM clicks WHERE ${where}`, params);
  const clicks = await db.all(
    `SELECT * FROM clicks WHERE ${where} ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  res.json({ link, clicks, total: total.count, page, limit, hasMore: offset + clicks.length < total.count });
});

router.put('/:id', requireAuth, async (req, res) => {
  const link = await db.get('SELECT id FROM links WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId]);
  if (!link) return res.status(404).json({ error: 'Not found' });

  const { label, password, expires_at, utm_source, utm_medium, utm_campaign, group_id } = req.body;
  const passwordHash = password ? bcrypt.hashSync(password, 10) : undefined;

  const fields = [];
  const values = [];

  if (label !== undefined) { fields.push('label = ?'); values.push(label); }
  if (passwordHash !== undefined) { fields.push('password_hash = ?'); values.push(passwordHash); }
  if (expires_at !== undefined) { fields.push('expires_at = ?'); values.push(expires_at || null); }
  if (utm_source !== undefined) { fields.push('utm_source = ?'); values.push(utm_source); }
  if (utm_medium !== undefined) { fields.push('utm_medium = ?'); values.push(utm_medium); }
  if (utm_campaign !== undefined) { fields.push('utm_campaign = ?'); values.push(utm_campaign); }
  if (group_id !== undefined) { fields.push('group_id = ?'); values.push(group_id); }

  if (fields.length > 0) {
    values.push(link.id);
    await db.run(`UPDATE links SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  const updated = await db.get('SELECT * FROM links WHERE id = ?', [link.id]);
  res.json(updated);
});

router.delete('/:id', requireAuth, async (req, res) => {
  const link = await db.get('SELECT id FROM links WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId]);
  if (!link) return res.status(404).json({ error: 'Not found' });
  await db.run('DELETE FROM clicks WHERE link_id = ?', [link.id]);
  await db.run('DELETE FROM links WHERE id = ?', [link.id]);
  res.json({ ok: true });
});

router.get('/:id/export/json', requireAuth, async (req, res) => {
  const link = await db.get('SELECT * FROM links WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId]);
  if (!link) return res.status(404).json({ error: 'Not found' });
  const clicks = await db.all('SELECT * FROM clicks WHERE link_id = ? ORDER BY timestamp DESC', [link.id]);
  res.setHeader('Content-Disposition', `attachment; filename="link-${link.code}-clicks.json"`);
  res.json({ link, clicks });
});

router.get('/:id/export/csv', requireAuth, async (req, res) => {
  const link = await db.get('SELECT * FROM links WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId]);
  if (!link) return res.status(404).json({ error: 'Not found' });
  const clicks = await db.all('SELECT * FROM clicks WHERE link_id = ? ORDER BY timestamp DESC', [link.id]);
  const header = 'timestamp,ip,lat,lng,address,client_lat,client_lng,user_agent';
  const rows = clicks.map(c =>
    `"${c.timestamp || ''}","${c.ip || ''}","${c.lat || ''}","${c.lng || ''}","${(c.address || '').replace(/"/g, '""')}","${c.client_lat || ''}","${c.client_lng || ''}","${(c.user_agent || '').replace(/"/g, '""')}"`
  );
  res.setHeader('Content-Disposition', `attachment; filename="link-${link.code}-clicks.csv"`);
  res.setHeader('Content-Type', 'text/csv');
  res.send([header, ...rows].join('\n'));
});

module.exports = router;