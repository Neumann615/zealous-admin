import { mkdirSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { DatabaseSync } from 'node:sqlite'
import bcrypt from 'bcryptjs'
import { now } from '../lib/date.js'
import { prepareMetadataSchema } from '../modules/metadata/schema.js'
import { prepareMonitor } from '../modules/monitor/index.js'

const dbPath = process.env.DB_PATH || './data/sqlite.db'
if (dbPath !== ':memory:')
  mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true })

const db = new DatabaseSync(dbPath)

function safeParseJson(value: string | null): unknown {
  if (!value)
    return undefined
  try {
    return JSON.parse(value)
  }
  catch {
    return undefined
  }
}

// WAL 提升读写并发（监控队列与业务写并行）；busy_timeout 兜住 SQLITE_BUSY；foreign_keys 让 schema 里声明的 FK 真正生效
db.exec('PRAGMA journal_mode = WAL')
db.exec('PRAGMA busy_timeout = 5000')
db.exec('PRAGMA foreign_keys = ON')

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
      sort INTEGER DEFAULT 0,
      is_super INTEGER DEFAULT 0
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
      type INTEGER DEFAULT 1,
      permission TEXT,
      active_icon TEXT
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

  db.exec(`
    CREATE TABLE IF NOT EXISTS za_form (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      form_key TEXT,
      name TEXT NOT NULL,
      description TEXT,
      schema TEXT,
      status INTEGER DEFAULT 0,
      version INTEGER DEFAULT 1,
      permissions TEXT,
      category_id INTEGER,
      current_version_id INTEGER,
      deleted_at TEXT,
      create_time TEXT,
      update_time TEXT
    )
  `)

  // 表单分类最多两级；叶子分类可挂载表单，删除前校验子分类与表单引用
  db.exec(`
    CREATE TABLE IF NOT EXISTS za_form_category (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER REFERENCES za_form_category(id),
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      status INTEGER NOT NULL DEFAULT 1,
      create_time TEXT,
      update_time TEXT
    )
  `)

  // 表单填写数据：整份 values 以 JSON 存储，仅抽出查询/追溯所需的冗余列
  db.exec(`
    CREATE TABLE IF NOT EXISTS za_form_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      form_id INTEGER NOT NULL,
      form_version INTEGER DEFAULT 1,
      submitter TEXT,
      status INTEGER DEFAULT 1,
      data TEXT NOT NULL,
      form_version_id INTEGER REFERENCES za_form_version(id),
      create_time TEXT
    )
  `)

  // 表单版本：published 版本不可变；draft 可继续编辑，历史数据按提交时版本回显
  db.exec(`
    CREATE TABLE IF NOT EXISTS za_form_version (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      form_id INTEGER NOT NULL,
      schema_version INTEGER NOT NULL,
      schema TEXT NOT NULL,
      field_contract TEXT NOT NULL,
      status INTEGER NOT NULL DEFAULT 0,
      is_current INTEGER NOT NULL DEFAULT 0,
      lock_version INTEGER NOT NULL DEFAULT 0,
      create_time TEXT,
      update_time TEXT,
      FOREIGN KEY (form_id) REFERENCES za_form(id)
    )
  `)

  db.exec('CREATE INDEX IF NOT EXISTS idx_form_data_form ON za_form_data (form_id, id)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_form_version_form ON za_form_version (form_id, schema_version)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_form_category_parent ON za_form_category (parent_id, sort_order)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_form_category_id ON za_form (category_id)')
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_form_version_draft ON za_form_version (form_id) WHERE status = 0')
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_form_version_current ON za_form_version (form_id) WHERE is_current = 1')

  // 老库升级：补稳定业务键、当前版本指针与软删除标记
  const legacyFormCols = db.prepare('PRAGMA table_info(za_form)').all() as { name: string }[]
  const legacyFormColumnNames = new Set(legacyFormCols.map(column => column.name))
  if (!legacyFormColumnNames.has('form_key'))
    db.exec('ALTER TABLE za_form ADD COLUMN form_key TEXT')
  if (!legacyFormColumnNames.has('current_version_id'))
    db.exec('ALTER TABLE za_form ADD COLUMN current_version_id INTEGER')
  if (!legacyFormColumnNames.has('deleted_at'))
    db.exec('ALTER TABLE za_form ADD COLUMN deleted_at TEXT')
  if (!legacyFormColumnNames.has('category_id'))
    db.exec('ALTER TABLE za_form ADD COLUMN category_id INTEGER')
  db.exec(`UPDATE za_form SET form_key = 'form_' || id WHERE form_key IS NULL OR form_key = ''`)
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_form_key ON za_form (form_key) WHERE deleted_at IS NULL')

  // 老数据迁移：现有单行 schema 生成首个版本行；历史提交先关联到该版本并保留原 version 号追溯
  const legacyForms = db.prepare(`
    SELECT id, schema, permissions, status, version
    FROM za_form
    WHERE deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM za_form_version WHERE form_id = za_form.id)
  `).all() as Array<{ id: number, schema: string | null, permissions: string | null, status: number, version: number }>
  const insertLegacyVersion = db.prepare(`
    INSERT INTO za_form_version (
      form_id, schema_version, schema, field_contract, status, is_current, lock_version, create_time, update_time
    )
    VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
  `)
  const linkLegacyForm = db.prepare('UPDATE za_form SET current_version_id = ? WHERE id = ?')
  const formDataCols = db.prepare('PRAGMA table_info(za_form_data)').all() as { name: string }[]
  if (!formDataCols.some(column => column.name === 'form_version_id'))
    db.exec('ALTER TABLE za_form_data ADD COLUMN form_version_id INTEGER REFERENCES za_form_version(id)')
  const linkLegacyData = db.prepare('UPDATE za_form_data SET form_version_id = ? WHERE form_id = ? AND form_version_id IS NULL')
  for (const form of legacyForms) {
    const schemaVersion = Math.max(1, Number(form.version) || 1)
    const contract = {
      version: 1,
      legacy: true,
      permissions: safeParseJson(form.permissions),
      fields: [],
      diagnostics: ['Legacy schema migrated without historical field contract'],
    }
    const result = insertLegacyVersion.run(
      form.id,
      schemaVersion,
      form.schema || '',
      JSON.stringify(contract),
      form.status === 1 ? 1 : 0,
      form.status === 1 ? 1 : 0,
      now(),
      now(),
    )
    const versionId = Number(result.lastInsertRowid)
    linkLegacyForm.run(versionId, form.id)
    linkLegacyData.run(versionId, form.id)
  }

  const row = db.prepare('SELECT id FROM za_admin WHERE username = ?').get('admin')
  if (!row) {
    const nowStr = now()
    const adminHash = bcrypt.hashSync('admin123', 10)
    const testHash = bcrypt.hashSync('test123', 10)

    // 1. 创建默认管理员 + 测试用户
    db.prepare(
      'INSERT INTO za_admin (username, password, nick_name, email, status, create_time) VALUES (?, ?, ?, ?, ?, ?)',
    ).run('admin', adminHash, '管理员', 'admin@qq.com', 1, nowStr)

    db.prepare(
      'INSERT INTO za_admin (username, password, nick_name, email, status, create_time) VALUES (?, ?, ?, ?, ?, ?)',
    ).run('test', testHash, '测试员', 'test@qq.com', 1, nowStr)

    // 2. 创建默认角色
    db.prepare(
      'INSERT INTO za_role (name, description, admin_count, create_time, status, sort, is_super) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run('超级管理员', '拥有所有权限', 1, nowStr, 1, 0, 1)

    db.prepare(
      'INSERT INTO za_role (name, description, admin_count, create_time, status, sort) VALUES (?, ?, ?, ?, ?, ?)',
    ).run('演示测试员', '仅提供演示功能', 1, nowStr, 1, 0)

    // 3. 创建菜单树
    const insertMenu = db.prepare(
      'INSERT INTO za_menu (parent_id, title, level, sort, name, icon, hidden, create_time, path, active_icon) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )

    const allMenuIds: number[] = []

    // 递归插入菜单节点，自动计算 path
    function insertMenuTree(parentId: number, level: number, parentPath: string, items: any[]) {
      items.forEach((item, idx) => {
        const menuPath = item.name ? `${parentPath}/${item.name}` : parentPath
        const result = insertMenu.run(
          parentId,
          item.title,
          level,
          idx,
          item.name || '',
          item.icon || '',
          0,
          nowStr,
          menuPath,
          item.activeIcon || null,
        )
        const id = Number(result.lastInsertRowid)
        allMenuIds.push(id)
        if (item.children?.length) {
          insertMenuTree(id, level + 1, menuPath, item.children)
        }
      })
    }

    // 演示
    insertMenuTree(0, 0, '', [
      {
        title: '演示',
        name: 'demo',
        icon: 'ai:AiOutlineExperiment',
        children: [
          { title: '风格实验室', name: 'style', icon: 'ai:AiOutlineBgColors' },
          {
            title: '多级导航',
            name: 'nav',
            icon: 'ai:AiOutlineAlignRight',
            children: [
              { title: '导航1', name: 'nav1' },
              {
                title: '导航2',
                name: 'nav2',
                children: [
                  { title: '导航2-1', name: 'nav2-1' },
                  {
                    title: '导航2-2',
                    name: 'nav2-2',
                    children: [
                      { title: '导航2-2-1', name: 'nav2-2-1' },
                      { title: '导航2-2-2', name: 'nav2-2-2' },
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
              { title: '闪烁文字', name: 'sparkles-text', icon: 'ai:AiOutlineHighlight' },
              { title: '滑块验证码', name: 'slider-captcha', icon: 'ai:AiOutlineSafetyCertificate' },
              { title: '链接预览', name: 'link-preview', icon: 'ai:AiOutlineLink' },
              { title: '流光文字', name: 'shiny-text', icon: 'ai:AiOutlineFontColors' },
              { title: '跑马灯', name: 'marquee', icon: 'ai:AiOutlineColumnWidth' },
              { title: '图标选择器', name: 'icon-picker', icon: 'ai:AiOutlineSmile' },
              { title: 'Markdown预览', name: 'markdown', icon: 'ai:AiOutlineFileMarkdown' },
              { title: '富文本编辑器', name: 'rich-text-editor', icon: 'ai:AiOutlineEdit' },
              { title: '图案背景', name: 'pattern-bg', icon: 'ai:AiOutlineBgColors' },
            ],
          },
          {
            title: '功能',
            name: 'func',
            icon: 'ai:AiOutlineFunction',
            children: [
              { title: '页面最大化', name: 'maximize-page', icon: 'ai:AiOutlineFullscreen' },
              { title: '登陆过期', name: 'logout', icon: 'ai:AiOutlineLogout' },
              { title: '庆祝效果', name: 'fireworks', icon: 'ai:AiOutlineCoffee' },
            ],
          },
          { title: '页面保活', name: 'keepalive', icon: 'ai:AiOutlineDesktop' },
          {
            title: '导航图标激活',
            name: 'menu-active',
            icon: 'ai:AiOutlineSend',
            children: [
              { title: '子级图标激活', name: 'menu-active-children', icon: 'ai:AiOutlineFrown', activeIcon: 'ai:AiOutlineSmile' },
              {
                title: '父级图标激活',
                name: 'menu-active-parent',
                icon: 'ai:AiFillFrown',
                activeIcon: 'ai:AiFillSmile',
                children: [
                  { title: '测试页面', name: 'menu-active-parent-test' },
                ],
              },
            ],
          },
          {
            title: '大屏',
            name: 'dashboard',
            icon: 'ai:AiOutlineDesktop',
            children: [
              { title: '大屏演示1', name: 'dashboard1', icon: 'ai:AiOutlineLineChart' },
              { title: '大屏演示2', name: 'dashboard2', icon: 'ai:AiOutlineDotChart' },
              { title: '大屏演示3', name: 'dashboard3', icon: 'ai:AiOutlineAreaChart' },
            ],
          },
        ],
      },
      {
        title: '通用',
        name: 'system',
        icon: 'ai:AiOutlineAppstore',
        children: [
          { title: '用户管理', name: 'admin', icon: 'ai:AiOutlineUser' },
          { title: '角色管理', name: 'role', icon: 'ai:AiOutlineTeam' },
          { title: '导航管理', name: 'menu', icon: 'ai:AiOutlineMenu' },
        ],
      },
      {
        title: 'UI',
        name: 'ui',
        icon: 'ai:AiOutlineAntDesign',
      },
    ])

    // 4. 分配所有菜单给两个角色
    const insertRoleMenu = db.prepare(
      'INSERT INTO za_role_menu_relation (role_id, menu_id) VALUES (?, ?)',
    )
    for (const menuId of allMenuIds) {
      insertRoleMenu.run(1, menuId)
      insertRoleMenu.run(2, menuId)
    }

    // 5. 分配角色给用户
    const insertAdminRole = db.prepare(
      'INSERT INTO za_admin_role_relation (admin_id, role_id) VALUES (?, ?)',
    )
    insertAdminRole.run(1, 1) // admin → 超级管理员
    insertAdminRole.run(2, 2) // test → 演示测试员
  }

  // 幂等迁移：表单设计菜单（老库补充，空库 seed 后也会执行，靠 path 判重）
  const existFormMenu = db.prepare('SELECT id FROM za_menu WHERE path = ?').get('/form/list')
  if (!existFormMenu) {
    const nowStr = now()
    const parent = db.prepare(
      'INSERT INTO za_menu (parent_id, title, level, sort, name, icon, hidden, create_time, path, active_icon) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(0, '表单设计', 0, 90, 'form', 'ai:AiOutlineForm', 0, nowStr, '/form', null)
    const pid = Number(parent.lastInsertRowid)
    const child = db.prepare(
      'INSERT INTO za_menu (parent_id, title, level, sort, name, icon, hidden, create_time, path, active_icon) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(pid, '表单管理', 1, 0, 'list', 'ai:AiOutlineUnorderedList', 0, nowStr, '/form/list', null)
    const cid = Number(child.lastInsertRowid)
    const preview = db.prepare(
      'INSERT INTO za_menu (parent_id, title, level, sort, name, icon, hidden, create_time, path, active_icon) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(pid, '表单预览', 1, 1, 'preview', 'ai:AiOutlineEye', 0, nowStr, '/form/preview', null)
    const previewId = Number(preview.lastInsertRowid)
    const roles = db.prepare('SELECT id FROM za_role').all() as any[]
    const rel = db.prepare('INSERT INTO za_role_menu_relation (role_id, menu_id) VALUES (?, ?)')
    for (const r of roles) {
      rel.run(r.id, pid)
      rel.run(r.id, cid)
      rel.run(r.id, previewId)
    }
  }

  // 已有数据库迁移：单独检查 /form/preview 是否存在（老库升级用）
  const existPreview = db.prepare('SELECT id FROM za_menu WHERE path = ?').get('/form/preview')
  if (!existPreview) {
    const parent = db.prepare('SELECT id FROM za_menu WHERE path = ?').get('/form')
    if (parent) {
      const nowStr = now()
      const preview = db.prepare(
        'INSERT INTO za_menu (parent_id, title, level, sort, name, icon, hidden, create_time, path, active_icon) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ).run(parent.id, '表单预览', 1, 1, 'preview', 'ai:AiOutlineEye', 0, nowStr, '/form/preview', null)
      const roles = db.prepare('SELECT id FROM za_role').all() as any[]
      const rel = db.prepare('INSERT INTO za_role_menu_relation (role_id, menu_id) VALUES (?, ?)')
      for (const r of roles) {
        rel.run(r.id, Number(preview.lastInsertRowid))
      }
    }
  }

  // 已有数据库迁移：za_form 表补 permissions 列（老库升级用）
  const formCols = db.prepare('PRAGMA table_info(za_form)').all() as { name: string }[]
  if (!formCols.some(c => c.name === 'permissions')) {
    db.exec('ALTER TABLE za_form ADD COLUMN permissions TEXT')
  }

  // 已有数据库迁移：za_admin 补令牌整体吊销水位线（改密/禁用后存量令牌立即失效）
  const adminCols = db.prepare('PRAGMA table_info(za_admin)').all() as { name: string }[]
  if (!adminCols.some(c => c.name === 'token_revoked_before')) {
    db.exec('ALTER TABLE za_admin ADD COLUMN token_revoked_before INTEGER DEFAULT 0')
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS za_token_revocation (
      jti TEXT PRIMARY KEY,
      expires_at INTEGER NOT NULL
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS za_login_throttle (
      throttle_key TEXT PRIMARY KEY,
      fail_count INTEGER NOT NULL DEFAULT 0,
      last_failure_at INTEGER NOT NULL DEFAULT 0,
      locked_until INTEGER NOT NULL DEFAULT 0
    )
  `)

  // 已有数据库迁移：菜单补类型与权限标识、角色补超管标记（权限模型由菜单驱动）
  const menuCols = db.prepare('PRAGMA table_info(za_menu)').all() as { name: string }[]
  if (!menuCols.some(c => c.name === 'type')) {
    db.exec('ALTER TABLE za_menu ADD COLUMN type INTEGER DEFAULT 1')
    // 一次性归类：有子节点的是目录，其余是菜单；按钮节点由 seedMenuPermissions 补
    db.exec('UPDATE za_menu SET type = 0 WHERE id IN (SELECT DISTINCT parent_id FROM za_menu WHERE parent_id <> 0)')
  }
  if (!menuCols.some(c => c.name === 'permission'))
    db.exec('ALTER TABLE za_menu ADD COLUMN permission TEXT')

  const roleCols = db.prepare('PRAGMA table_info(za_role)').all() as { name: string }[]
  if (!roleCols.some(c => c.name === 'is_super')) {
    db.exec('ALTER TABLE za_role ADD COLUMN is_super INTEGER DEFAULT 0')
    db.exec(`UPDATE za_role SET is_super = 1 WHERE name = '超级管理员'`)
  }

  // 已有数据库迁移：菜单绑定页面组件 key（路由表由菜单配置驱动）
  const menuComponentSeeds: Array<[string, string]> = [
    ['/system/admin', 'auth/admin'],
    ['/system/role', 'auth/role'],
    ['/system/menu', 'auth/menu'],
    ['/metadata', 'metadata/manager'],
    ['/monitor/workbench', 'monitor/workbench'],
    ['/monitor/log', 'monitor/log'],
    ['/monitor/app', 'monitor/app'],
    ['/monitor/analysis/perf', 'monitor/perf'],
    ['/monitor/analysis/api', 'monitor/api'],
    ['/monitor/analysis/behavior', 'monitor/behavior'],
    ['/monitor/analysis/js-error', 'monitor/js-error'],
    ['/monitor/analysis/biz-error', 'monitor/biz-error'],
    ['/monitor/analysis/alert-history', 'monitor/alert-history'],
  ]
  const bindMenuComponent = db.prepare(`UPDATE za_menu SET component = ? WHERE path = ? AND (component IS NULL OR component = '')`)
  for (const [menuPath, component] of menuComponentSeeds)
    bindMenuComponent.run(component, menuPath)

  // 字典管理菜单悬空（无对应页面），字典能力已由元数据模块承接
  const dictMenu = db.prepare('SELECT id FROM za_menu WHERE path = ?').get('/system/dict') as { id: number } | undefined
  if (dictMenu) {
    db.prepare('DELETE FROM za_role_menu_relation WHERE menu_id = ?').run(dictMenu.id)
    db.prepare('DELETE FROM za_menu WHERE id = ?').run(dictMenu.id)
  }

  // 已有数据库迁移：详情页不进导航，但路由表由菜单配置驱动，需要补隐藏菜单行并继承父级授权
  const hiddenMenuSeeds: Array<[string, string, string, string]> = [
    // [自身 path, 父菜单 path, 标题, 路由名]
    ['/demo/breadcrumb/detail', '/demo/breadcrumb', '面包屑详情', 'breadcrumbDetail'],
    ['/demo/breadcrumb/nested/detail', '/demo/breadcrumb/nested', '层级面包屑详情', 'nestedBreadcrumbDetail'],
    ['/demo/route-params/detail', '/demo/route-params', '路由参数详情', 'routeParamsDetail'],
    ['/form/design', '/form', '表单设计器', 'design'],
    ['/form/render', '/form', '表单渲染', 'render'],
    ['/form/data', '/form', '表单数据', 'data'],
  ]
  const findMenuByPath = db.prepare('SELECT id, level FROM za_menu WHERE path = ?')
  const insertHiddenMenu = db.prepare(
    'INSERT INTO za_menu (parent_id, title, level, sort, name, icon, hidden, create_time, path, active_icon) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  )
  const parentRoleRows = db.prepare('SELECT role_id FROM za_role_menu_relation WHERE menu_id = ?')
  const insertRoleMenu = db.prepare('INSERT INTO za_role_menu_relation (role_id, menu_id) VALUES (?, ?)')
  for (const [hiddenPath, parentPath, title, name] of hiddenMenuSeeds) {
    if (findMenuByPath.get(hiddenPath))
      continue
    const parent = findMenuByPath.get(parentPath) as { id: number, level: number } | undefined
    if (!parent)
      continue
    const inserted = insertHiddenMenu.run(parent.id, title, parent.level + 1, 99, name, null, 1, now(), hiddenPath, null)
    for (const rel of parentRoleRows.all(parent.id) as { role_id: number }[])
      insertRoleMenu.run(rel.role_id, Number(inserted.lastInsertRowid))
  }

  const metadataMenu = db.prepare('SELECT id, parent_id FROM za_menu WHERE path = ?').get('/metadata') as any
  const formMenu = db.prepare('SELECT id, sort FROM za_menu WHERE path = ? AND parent_id = 0').get('/form') as any
  const metadataSort = formMenu ? formMenu.sort - 1 : 80

  if (metadataMenu && metadataMenu.parent_id !== 0) {
    db.prepare('UPDATE za_menu SET parent_id = 0, level = 0, sort = ? WHERE id = ?').run(metadataSort, metadataMenu.id)
  }

  if (!metadataMenu) {
    const nowStr = now()
    const menu = db.prepare(
      'INSERT INTO za_menu (parent_id, title, level, sort, name, icon, hidden, create_time, path, active_icon) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(0, '元数据管理', 0, metadataSort, 'metadata', 'ai:AiOutlineDatabase', 0, nowStr, '/metadata', null)
    const menuId = Number(menu.lastInsertRowid)
    const roles = db.prepare('SELECT id FROM za_role').all() as any[]
    const relation = db.prepare('INSERT INTO za_role_menu_relation (role_id, menu_id) VALUES (?, ?)')
    for (const role of roles)
      relation.run(role.id, menuId)
  }

  prepareMetadataSchema(db)
  prepareMonitor(db)

  seedMonitorMenu(db)
  seedMenuPermissions(db)
}

/** 监控中心菜单：幂等种子（老库升级也会补），路径与 src/pages/index/monitor/** 文件路由一一对应 */
function seedMonitorMenu(db: DatabaseSync): void {
  const exists = db.prepare('SELECT id FROM za_menu WHERE path = ?').get('/monitor')
  if (exists)
    return

  const timestamp = now()
  const insertMenu = db.prepare(
    'INSERT INTO za_menu (parent_id, title, level, sort, name, icon, hidden, create_time, path, active_icon) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  )
  const created: number[] = []

  const add = (parentId: number, title: string, level: number, sort: number, name: string, icon: string, path: string): number => {
    const result = insertMenu.run(parentId, title, level, sort, name, icon, 0, timestamp, path, null)
    const id = Number(result.lastInsertRowid)
    created.push(id)
    return id
  }

  const rootId = add(0, '监控中心', 0, 70, 'monitor', 'ai:AiOutlineFundProjectionScreen', '/monitor')
  add(rootId, '工作台', 1, 0, 'workbench', 'ai:AiOutlineDashboard', '/monitor/workbench')
  add(rootId, '实时日志', 1, 1, 'log', 'ai:AiOutlineFileSearch', '/monitor/log')
  add(rootId, '应用管理', 1, 2, 'app', 'ai:AiOutlineAppstore', '/monitor/app')

  const analysisId = add(rootId, '数据分析', 1, 3, 'analysis', 'ai:AiOutlineLineChart', '/monitor/analysis')
  add(analysisId, '性能统计', 2, 0, 'perf', 'ai:AiOutlineDashboard', '/monitor/analysis/perf')
  add(analysisId, '接口分析', 2, 1, 'api', 'ai:AiOutlineApi', '/monitor/analysis/api')
  add(analysisId, '行为分析', 2, 2, 'behavior', 'ai:AiOutlineUsergroupAdd', '/monitor/analysis/behavior')
  add(analysisId, 'JS错误分析', 2, 3, 'js-error', 'ai:AiOutlineBug', '/monitor/analysis/js-error')
  add(analysisId, '业务错误分析', 2, 4, 'biz-error', 'ai:AiOutlineWarning', '/monitor/analysis/biz-error')
  add(analysisId, '预警记录', 2, 5, 'alert-history', 'ai:AiOutlineAlert', '/monitor/analysis/alert-history')

  const roles = db.prepare('SELECT id FROM za_role').all() as Array<{ id: number }>
  const relation = db.prepare('INSERT INTO za_role_menu_relation (role_id, menu_id) VALUES (?, ?)')
  for (const role of roles) {
    for (const menuId of created)
      relation.run(role.id, menuId)
  }
}

/**
 * 菜单权限种子：菜单行（type = 1）挂「查询」权限，按钮行（type = 2）挂「操作」权限。
 * 幂等：菜单权限只在 permission 为空时回填，按钮行按 (父菜单, permission) 判重。
 * 新增按钮继承父菜单已有的授权，避免老库升级后非超管角色突然失去操作入口。
 */
function seedMenuPermissions(db: DatabaseSync): void {
  const menuPermissions: Array<[string, string]> = [
    ['/system/admin', 'system:user:list'],
    ['/system/role', 'system:role:list'],
    ['/system/menu', 'system:menu:list'],
    ['/metadata', 'metadata:set:list'],
    ['/form/list', 'form:form:list'],
    ['/form/data', 'form:data:list'],
    ['/monitor/log', 'monitor:log:list'],
    ['/monitor/app', 'monitor:app:list'],
    ['/monitor/workbench', 'monitor:stats:list'],
    ['/monitor/analysis/perf', 'monitor:stats:list'],
    ['/monitor/analysis/api', 'monitor:stats:list'],
    ['/monitor/analysis/behavior', 'monitor:stats:list'],
    ['/monitor/analysis/js-error', 'monitor:stats:list'],
    ['/monitor/analysis/biz-error', 'monitor:stats:list'],
    ['/monitor/analysis/alert-history', 'monitor:alert:list'],
  ]
  const bindPermission = db.prepare(`UPDATE za_menu SET permission = ? WHERE path = ? AND (permission IS NULL OR permission = '')`)
  for (const [menuPath, permission] of menuPermissions)
    bindPermission.run(permission, menuPath)

  const buttons: Array<[string, string, string]> = [
    // [父菜单 path, 权限标识, 按钮名]
    ['/system/admin', 'system:user:add', '新增'],
    ['/system/admin', 'system:user:edit', '修改'],
    ['/system/admin', 'system:user:delete', '删除'],
    ['/system/admin', 'system:user:assignRole', '分配角色'],
    ['/system/role', 'system:role:add', '新增'],
    ['/system/role', 'system:role:edit', '修改'],
    ['/system/role', 'system:role:delete', '删除'],
    ['/system/role', 'system:role:assignMenu', '分配菜单'],
    ['/system/menu', 'system:menu:add', '新增'],
    ['/system/menu', 'system:menu:edit', '修改'],
    ['/system/menu', 'system:menu:delete', '删除'],
    ['/metadata', 'metadata:set:add', '新增选项集'],
    ['/metadata', 'metadata:set:edit', '修改选项集'],
    ['/metadata', 'metadata:set:delete', '删除选项集'],
    ['/metadata', 'metadata:item:add', '新增选项'],
    ['/metadata', 'metadata:item:edit', '修改选项'],
    ['/metadata', 'metadata:item:delete', '删除选项'],
    ['/form/list', 'form:form:add', '新增表单'],
    ['/form/list', 'form:form:edit', '修改表单'],
    ['/form/list', 'form:form:delete', '删除表单'],
    ['/form/data', 'form:data:submit', '提交数据'],
    ['/form/data', 'form:data:edit', '修改数据'],
    ['/form/data', 'form:data:delete', '删除数据'],
    ['/monitor/app', 'monitor:app:add', '创建应用'],
    ['/monitor/app', 'monitor:app:edit', '编辑应用'],
    ['/monitor/log', 'monitor:maintenance:prune', '清理日志'],
    ['/monitor/analysis/alert-history', 'monitor:alert:retry', '重发通知'],
  ]

  const findMenu = db.prepare('SELECT id, level FROM za_menu WHERE path = ?')
  const findButton = db.prepare('SELECT id FROM za_menu WHERE parent_id = ? AND permission = ?')
  const insertButton = db.prepare(
    'INSERT INTO za_menu (parent_id, title, level, sort, name, icon, hidden, path, component, type, permission, create_time, active_icon) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  )
  const parentRoleRows = db.prepare('SELECT role_id FROM za_role_menu_relation WHERE menu_id = ?')
  const insertRoleMenu = db.prepare('INSERT INTO za_role_menu_relation (role_id, menu_id) VALUES (?, ?)')

  buttons.forEach(([parentPath, permission, title], index) => {
    const parent = findMenu.get(parentPath) as { id: number, level: number } | undefined
    if (!parent || findButton.get(parent.id, permission))
      return
    const result = insertButton.run(parent.id, title, parent.level + 1, index, '', null, 1, null, null, 2, permission, now(), null)
    for (const rel of parentRoleRows.all(parent.id) as Array<{ role_id: number }>)
      insertRoleMenu.run(rel.role_id, Number(result.lastInsertRowid))
  })
}

export function getDb() {
  return db
}
