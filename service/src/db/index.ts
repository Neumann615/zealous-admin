import { mkdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import bcrypt from 'bcryptjs'
import { now } from '../lib/date.js'

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
      component TEXT,
      active_icon TEXT
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
    const nowStr = now()
    const hashedPassword = bcrypt.hashSync('admin123', 10)

    // 1. 创建默认管理员
    db.prepare(
      'INSERT INTO za_admin (username, password, nick_name, status, create_time) VALUES (?, ?, ?, ?, ?)',
    ).run('admin', hashedPassword, '管理员', 1, nowStr)

    // 2. 创建默认角色
    db.prepare(
      'INSERT INTO za_role (name, description, admin_count, create_time, status, sort) VALUES (?, ?, ?, ?, ?, ?)',
    ).run('超级管理员', '拥有所有权限', 1, nowStr, 1, 0)

    // 3. 创建菜单树
    const insertMenu = db.prepare(
      'INSERT INTO za_menu (parent_id, title, level, sort, name, icon, hidden, create_time, path, active_icon) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )

    const allMenuIds: number[] = []

    // 递归插入菜单节点
    function insertMenuTree(parentId: number, level: number, items: any[]) {
      items.forEach((item, idx) => {
        const result = insertMenu.run(
          parentId,
          item.title,
          level,
          idx,
          item.name || '',
          item.icon || '',
          0,
          nowStr,
          item.path || null,
          item.activeIcon || null,
        )
        const id = Number(result.lastInsertRowid)
        allMenuIds.push(id)
        if (item.children?.length) {
          insertMenuTree(id, level + 1, item.children)
        }
      })
    }

    // 演示（在系统管理前面）
    insertMenuTree(0, 0, [
      {
        title: '演示',
        name: 'demo',
        icon: 'ai:AiOutlineExperiment',
        children: [
          { title: '风格实验室', name: 'style', path: '/style', icon: 'ai:AiOutlineBgColors' },
          {
            title: '多级导航',
            name: 'nav',
            icon: 'ai:AiOutlineAlignRight',
            children: [
              { title: '导航1', name: 'nav1', path: '/nav1' },
              {
                title: '导航2',
                name: 'nav2',
                children: [
                  { title: '导航2-1', name: 'nav2-1', path: '/nav2-1' },
                  {
                    title: '导航2-2',
                    name: 'nav2-2',
                    children: [
                      { title: '导航2-2-1', name: 'nav2-2-1', path: '/nav2-2-1' },
                      { title: '导航2-2-2', name: 'nav2-2-2', path: '/nav2-2-2' },
                    ],
                  },
                ],
              },
            ],
          },
          {
            title: '组件',
            name: 'components',
            icon: 'ai:AiOutlineBuild',
            children: [
              { title: '闪烁文字', name: 'sparkles-text', path: '/sparkles-text', icon: 'ai:AiOutlineHighlight' },
              { title: '滑块验证码', name: 'slider-captcha', path: '/slider-captcha', icon: 'ai:AiOutlineSafetyCertificate' },
              { title: '链接预览', name: 'link-preview', path: '/link-preview', icon: 'ai:AiOutlineLink' },
              { title: '流光文字', name: 'shiny-text', path: '/shiny-text', icon: 'ai:AiOutlineFontColors' },
              { title: '跑马灯', name: 'marquee', path: '/marquee', icon: 'ai:AiOutlineColumnWidth' },
              { title: '图标选择器', name: 'icon-picker', path: '/icon-picker', icon: 'ai:AiOutlineSmile' },
              { title: 'Markdown预览', name: 'markdown', path: '/markdown', icon: 'ai:AiOutlineFileMarkdown' },
              { title: '图案背景', name: 'pattern-bg', path: '/pattern-bg', icon: 'ai:AiOutlineBgColors' },
            ],
          },
          {
            title: '功能',
            name: 'func',
            icon: 'ai:AiOutlineFunction',
            children: [
              { title: '页面最大化', name: 'maximize-page', path: '/maximize-page', icon: 'ai:AiOutlineFullscreen' },
              { title: '庆祝效果', name: 'fireworks', path: '/fireworks', icon: 'ai:AiOutlineCoffee' },
            ],
          },
          { title: '页面保活', name: 'keepalive', path: '/keepalive', icon: 'ai:AiOutlineDesktop' },
        ],
      },
      {
        title: '通用',
        name: 'system',
        icon: 'ai:AiOutlineSetting',
        children: [
          { title: '用户管理', name: 'system-admin', path: '/admin', icon: 'ai:AiOutlineUser' },
          { title: '角色管理', name: 'system-role', path: '/role', icon: 'ai:AiOutlineTeam' },
          { title: '导航管理', name: 'system-menu', path: '/menu', icon: 'ai:AiOutlineMenu' },
          { title: '字典管理', name: 'system-dict', path: '/dict', icon: 'ai:AiOutlineBook' },
        ],
      },
    ])

    // 4. 分配所有菜单给超级管理员角色
    const insertRoleMenu = db.prepare(
      'INSERT INTO za_role_menu_relation (role_id, menu_id) VALUES (?, ?)',
    )
    for (const menuId of allMenuIds) {
      insertRoleMenu.run(1, menuId)
    }

    // 5. 分配超级管理员角色给 admin 用户
    db.prepare(
      'INSERT INTO za_admin_role_relation (admin_id, role_id) VALUES (?, ?)',
    ).run(1, 1)
  }
}

export function getDb() {
  return db
}
