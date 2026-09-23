import { mkdirSync } from 'node:fs'
import process from 'node:process'
import { DatabaseSync } from 'node:sqlite'
import bcrypt from 'bcryptjs'
import { now } from '../lib/date.js'
import { prepareMetadataSchema } from '../modules/metadata/schema.js'
import { prepareMonitor } from '../modules/monitor/index.js'

const dbPath = process.env.DB_PATH || './data/sqlite.db'
mkdirSync('./data', { recursive: true })

const db = new DatabaseSync(dbPath)

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
      name TEXT NOT NULL,
      description TEXT,
      schema TEXT,
      status INTEGER DEFAULT 0,
      version INTEGER DEFAULT 1,
      permissions TEXT,
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
      create_time TEXT
    )
  `)

  db.exec('CREATE INDEX IF NOT EXISTS idx_form_data_form ON za_form_data (form_id, id)')

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
      'INSERT INTO za_role (name, description, admin_count, create_time, status, sort) VALUES (?, ?, ?, ?, ?, ?)',
    ).run('超级管理员', '拥有所有权限', 1, nowStr, 1, 0)

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

export function getDb() {
  return db
}
