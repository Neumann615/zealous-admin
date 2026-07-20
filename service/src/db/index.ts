import { mkdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import bcrypt from 'bcryptjs'

const dbPath = process.env.DB_PATH || './data/sqlite.db'
mkdirSync('./data', { recursive: true })

const db = new DatabaseSync(dbPath)

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS za_admin (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      icon TEXT,
      email TEXT,
      nick_name TEXT,
      note TEXT,
      create_time TEXT,
      login_time TEXT,
      status INTEGER DEFAULT 1
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS za_role (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      admin_count INTEGER DEFAULT 0,
      create_time TEXT,
      status INTEGER DEFAULT 1,
      sort INTEGER DEFAULT 0
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS za_menu (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER DEFAULT 0,
      create_time TEXT,
      title TEXT NOT NULL,
      level INTEGER DEFAULT 0,
      sort INTEGER DEFAULT 0,
      name TEXT,
      icon TEXT,
      hidden INTEGER DEFAULT 0,
      path TEXT,
      component TEXT
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS za_dict_type (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      dict_type TEXT NOT NULL UNIQUE,
      status INTEGER DEFAULT 1,
      create_time TEXT,
      remark TEXT
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS za_dict_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dict_type TEXT NOT NULL,
      dict_label TEXT NOT NULL,
      dict_value TEXT NOT NULL,
      dict_sort INTEGER DEFAULT 0,
      status INTEGER DEFAULT 1,
      create_time TEXT,
      remark TEXT,
      css_class TEXT,
      list_class TEXT
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS za_admin_role_relation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      role_id INTEGER NOT NULL
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS za_role_menu_relation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_id INTEGER NOT NULL,
      menu_id INTEGER NOT NULL
    )
  `)

  const row = db.prepare('SELECT id FROM za_admin WHERE username = ?').get('admin')
  if (!row) {
    const hashedPassword = bcrypt.hashSync('admin123', 10)
    db.prepare(
      'INSERT INTO za_admin (username, password, nick_name, status, create_time) VALUES (?, ?, ?, ?, ?)',
    ).run('admin', hashedPassword, '管理员', 1, new Date().toISOString())
  }
}

export function getDb() {
  return db
}
