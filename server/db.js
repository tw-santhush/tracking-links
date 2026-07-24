const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'tracking.db');

let db = null;

function save() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

const api = {
  run(sql, params = []) {
    db.run(sql, params);
    save();
  },

  get(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    let row;
    if (stmt.step()) {
      row = stmt.getAsObject();
    }
    stmt.free();
    return row;
  },

  all(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  },

  runAndGetId(sql, params = []) {
    db.run(sql, params);
    save();
    const stmt = db.prepare('SELECT last_insert_rowid() AS id');
    stmt.step();
    const { id } = stmt.getAsObject();
    stmt.free();
    return id;
  },

  async init() {
    const SQL = await initSqlJs();
    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }

    db.exec(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )`);
    db.exec(`CREATE TABLE IF NOT EXISTS links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      code TEXT UNIQUE NOT NULL,
      destination TEXT NOT NULL,
      label TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`);
    db.exec(`CREATE TABLE IF NOT EXISTS clicks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      link_id INTEGER NOT NULL,
      ip TEXT,
      lat REAL,
      lng REAL,
      address TEXT,
      user_agent TEXT,
      timestamp TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (link_id) REFERENCES links(id)
    )`);
    save();
  }
};

module.exports = api;