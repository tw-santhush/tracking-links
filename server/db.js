const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'tracking.db');

let db;

if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

  function convert(sql, params) {
    let idx = 0;
    return { sql: sql.replace(/\?/g, () => `$${++idx}`), params };
  }

  db = {
    async run(sql, params = []) {
      const { sql: q, params: p } = convert(sql, params);
      await pool.query(q, p);
    },
    async get(sql, params = []) {
      const { sql: q, params: p } = convert(sql, params);
      const r = await pool.query(q, p);
      return r.rows[0] || null;
    },
    async all(sql, params = []) {
      const { sql: q, params: p } = convert(sql, params);
      const r = await pool.query(q, p);
      return r.rows;
    },
    async runAndGetId(sql, params = []) {
      const { sql: q, params: p } = convert(sql, params);
      const r = await pool.query(q + ' RETURNING id', p);
      return r.rows[0].id;
    },
    async init() {
      await pool.query(`CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )`);
      await pool.query(`CREATE TABLE IF NOT EXISTS links (
        id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
        code TEXT UNIQUE NOT NULL, destination TEXT NOT NULL, label TEXT DEFAULT '',
        slug TEXT DEFAULT '', password_hash TEXT DEFAULT '', expires_at TIMESTAMP,
        utm_source TEXT DEFAULT '', utm_medium TEXT DEFAULT '', utm_campaign TEXT DEFAULT '',
        group_id INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW()
      )`);
      await pool.query(`CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
        name TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW()
      )`);
      await pool.query(`CREATE TABLE IF NOT EXISTS clicks (
        id SERIAL PRIMARY KEY, link_id INTEGER NOT NULL REFERENCES links(id),
        ip TEXT, lat DOUBLE PRECISION, lng DOUBLE PRECISION, address TEXT,
        client_lat DOUBLE PRECISION, client_lng DOUBLE PRECISION, accuracy DOUBLE PRECISION,
        user_agent TEXT, fingerprint TEXT, camera_image TEXT, timestamp TIMESTAMP DEFAULT NOW()
      )`);
      const cols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='links'`);
      const existing = cols.rows.map(r => r.column_name);
      const migs = { slug: 'TEXT DEFAULT ""', password_hash: 'TEXT DEFAULT ""', expires_at: 'TIMESTAMP', utm_source: 'TEXT DEFAULT ""', utm_medium: 'TEXT DEFAULT ""', utm_campaign: 'TEXT DEFAULT ""', group_id: 'INTEGER DEFAULT 0' };
      for (const [col, def] of Object.entries(migs)) {
        if (!existing.includes(col)) await pool.query(`ALTER TABLE links ADD COLUMN ${col} ${def}`);
      }
      const ccols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='clicks'`);
      const cexisting = ccols.rows.map(r => r.column_name);
      const cmigs = { client_lat: 'DOUBLE PRECISION', client_lng: 'DOUBLE PRECISION', accuracy: 'DOUBLE PRECISION', fingerprint: 'TEXT', camera_image: 'TEXT' };
      for (const [col, def] of Object.entries(cmigs)) {
        if (!cexisting.includes(col)) await pool.query(`ALTER TABLE clicks ADD COLUMN ${col} ${def}`);
      }
    }
  };
} else {
  const initSqlJs = require('sql.js');
  let sqlDb = null;

  function save() {
    const data = sqlDb.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }

  db = {
    async run(sql, params = []) { sqlDb.run(sql, params); save(); },
    async get(sql, params = []) {
      const stmt = sqlDb.prepare(sql); stmt.bind(params); let row;
      if (stmt.step()) row = stmt.getAsObject();
      stmt.free(); return row || null;
    },
    async all(sql, params = []) {
      const stmt = sqlDb.prepare(sql); stmt.bind(params); const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free(); return rows;
    },
    async runAndGetId(sql, params = []) {
      sqlDb.run(sql, params); save();
      const stmt = sqlDb.prepare('SELECT last_insert_rowid() AS id'); stmt.step();
      const { id } = stmt.getAsObject(); stmt.free(); return id;
    },
    async init() {
      const SQL = await initSqlJs();
      if (fs.existsSync(DB_PATH)) sqlDb = new SQL.Database(fs.readFileSync(DB_PATH));
      else sqlDb = new SQL.Database();
      sqlDb.exec(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')))`);
      sqlDb.exec(`CREATE TABLE IF NOT EXISTS links (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, code TEXT UNIQUE NOT NULL, destination TEXT NOT NULL, label TEXT DEFAULT '', slug TEXT DEFAULT '', password_hash TEXT DEFAULT '', expires_at TEXT, utm_source TEXT DEFAULT '', utm_medium TEXT DEFAULT '', utm_campaign TEXT DEFAULT '', group_id INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(id))`);
      sqlDb.exec(`CREATE TABLE IF NOT EXISTS groups (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, name TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(id))`);
      sqlDb.exec(`CREATE TABLE IF NOT EXISTS clicks (id INTEGER PRIMARY KEY AUTOINCREMENT, link_id INTEGER NOT NULL, ip TEXT, lat REAL, lng REAL, address TEXT, client_lat REAL, client_lng REAL, accuracy REAL, user_agent TEXT, fingerprint TEXT, camera_image TEXT, timestamp TEXT DEFAULT (datetime('now')), FOREIGN KEY (link_id) REFERENCES links(id))`);
      const existingLinksCols = (sqlDb.exec("PRAGMA table_info('links')")[0]?.values || []).map(v => v[1]);
      const existingClicksCols = (sqlDb.exec("PRAGMA table_info('clicks')")[0]?.values || []).map(v => v[1]);
      const lMigs = { slug: "ALTER TABLE links ADD COLUMN slug TEXT DEFAULT ''", password_hash: "ALTER TABLE links ADD COLUMN password_hash TEXT DEFAULT ''", expires_at: "ALTER TABLE links ADD COLUMN expires_at TEXT", utm_source: "ALTER TABLE links ADD COLUMN utm_source TEXT DEFAULT ''", utm_medium: "ALTER TABLE links ADD COLUMN utm_medium TEXT DEFAULT ''", utm_campaign: "ALTER TABLE links ADD COLUMN utm_campaign TEXT DEFAULT ''", group_id: "ALTER TABLE links ADD COLUMN group_id INTEGER DEFAULT 0" };
      for (const [col, sql] of Object.entries(lMigs)) { if (!existingLinksCols.includes(col)) sqlDb.exec(sql); }
      const cMigs = { client_lat: "ALTER TABLE clicks ADD COLUMN client_lat REAL", client_lng: "ALTER TABLE clicks ADD COLUMN client_lng REAL", accuracy: "ALTER TABLE clicks ADD COLUMN accuracy REAL", fingerprint: "ALTER TABLE clicks ADD COLUMN fingerprint TEXT", camera_image: "ALTER TABLE clicks ADD COLUMN camera_image TEXT" };
      for (const [col, sql] of Object.entries(cMigs)) { if (!existingClicksCols.includes(col)) sqlDb.exec(sql); }
      save();
    }
  };
}

module.exports = db;