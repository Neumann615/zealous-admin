import { getDb } from '../../db'
import { ROUTE_PERMISSIONS, UNPROTECTED_ROUTES } from '../../middleware/permission'

export interface ArchitectureOverview {
  frontendModules: number
  backendModules: number
  dataTables: number
  apiCount: number
  permissionCount: number
}

export interface ArchitectureModule {
  name: string
  layer: string
  responsibility: string
  keyFiles: string[]
  dependencies: string[]
}

export interface RequestFlowNode {
  stage: string
  owner: string
  responsibility: string
  guarantee: string
}

export interface DatabaseColumn {
  name: string
  type: string
  nullable: boolean
  defaultValue: string | null
  primaryKey: boolean
}

export interface DatabaseIndex {
  name: string
  columns: string[]
  unique: boolean
  origin: string
  partial: boolean
}

export interface DatabaseForeignKey {
  column: string
  referenceTable: string
  referenceColumn: string
  onDelete: string | null
  onUpdate: string | null
}

export interface DatabaseTable {
  name: string
  description: string
  columns: DatabaseColumn[]
  indexes: DatabaseIndex[]
  foreignKeys: DatabaseForeignKey[]
}

export interface DatabaseDomain {
  code: string
  name: string
  description: string
  designPoints: string[]
  tables: DatabaseTable[]
}

export interface ApiEndpoint {
  method: string
  path: string
  permissions: string[]
}

export interface ApiModule {
  name: string
  routePrefix: string
  endpointCount: number
  permissionCount: number
  endpoints: ApiEndpoint[]
}

export interface ArchitectureResponse {
  overview: ArchitectureOverview
  frontendModules: ArchitectureModule[]
  backendModules: ArchitectureModule[]
  requestFlow: RequestFlowNode[]
  databaseDomains: DatabaseDomain[]
  apiMatrix: ApiModule[]
}

interface SqliteTableRow {
  name: string
  sql: string
}

interface SqliteColumnRow {
  name: string
  type: string
  notnull: number
  dflt_value: string | null
  pk: number
}

interface SqliteIndexRow {
  name: string
  unique: number
  origin: string
  partial: number
}

interface SqliteIndexColumnRow {
  name: string | null
}

interface SqliteForeignKeyRow {
  table: string
  from: string
  to: string | null
  on_delete: string | null
  on_update: string | null
}

const TABLE_DESCRIPTIONS: Record<string, string> = {
  za_admin: '后台用户主档，保存账号、基础资料与启用状态',
  za_role: '角色定义，is_super 标记超管，授权的聚合单位',
  za_menu: '目录 / 页面 / 按钮三类节点，同时承载路由与权限标识',
  za_admin_role_relation: '用户与角色多对多关系',
  za_role_menu_relation: '角色与菜单授权关系，决定可见菜单和权限标识',
  za_token_revocation: '刷新令牌吊销记录，支撑登出与会话失效',
  za_login_throttle: '登录失败计数与锁定窗口，防暴力破解',
  za_form_category: '两级表单分类树，叶子分类可挂载表单',
  za_form: '表单稳定主档，保存业务键、分类与当前版本指针',
  za_form_version: '表单不可变版本行，草稿可编辑、发布后锁定',
  za_form_data: '表单填写数据，提交时绑定具体版本用于回显与导出',
  za_metadata_set: '选项集定义，供表单与业务下拉复用',
  za_metadata_item: '选项集条目，支持树形结构与状态控制',
  za_monitor_app: '监控应用与采集队列配置',
  za_monitor_log: '前端与接口日志主存，按应用、时间与页面建索引',
  za_monitor_alert_history: '告警命中与重试历史',
}

const DOMAIN_MANIFEST: Array<{
  code: string
  name: string
  description: string
  designPoints: string[]
  tables: string[]
}> = [
  {
    code: 'auth',
    name: '认证与权限',
    description: '用户、角色、菜单授权、会话吊销与登录防护。',
    designPoints: [
      '用户 → 角色 → 菜单（含按钮权限）三级授权',
      '权限标识挂在菜单行，接口映射由中间件统一判定',
      '会话吊销与登录限流独立建表，避免污染用户主档',
    ],
    tables: ['za_admin', 'za_role', 'za_menu', 'za_admin_role_relation', 'za_role_menu_relation', 'za_token_revocation', 'za_login_throttle'],
  },
  {
    code: 'form',
    name: '表单中心',
    description: '表单主档、两级分类、版本与填写数据。',
    designPoints: [
      'za_form 保存稳定主档，za_form_version 保存不可变发布版本',
      '草稿和当前生效版本分别按 form_id 唯一约束',
      'za_form_data 绑定 form_version_id，历史数据按提交版本回显',
    ],
    tables: ['za_form_category', 'za_form', 'za_form_version', 'za_form_data'],
  },
  {
    code: 'metadata',
    name: '元数据',
    description: '选项集与树形选项条目，服务表单与通用字典。',
    designPoints: [
      'set code 全局唯一，item 在 set 内按 code 唯一',
      'parent_id 支持树形选项，status 控制可用性',
      '排序使用 sort_order + id，保证分页稳定',
    ],
    tables: ['za_metadata_set', 'za_metadata_item'],
  },
  {
    code: 'monitor',
    name: '监控中心',
    description: '应用配置、日志主存与告警历史。',
    designPoints: [
      'app_id 作为跨表业务键，关联日志与告警',
      '日志按应用 / 时间 / 页面建立查询索引',
      'log_id + serial 保留批量上报顺序',
    ],
    tables: ['za_monitor_app', 'za_monitor_log', 'za_monitor_alert_history'],
  },
]

const FRONTEND_MODULES: ArchitectureModule[] = [
  {
    name: '路由与菜单',
    layer: '应用入口',
    responsibility: '根据登录用户菜单生成动态路由，解析 component 或文件路由。',
    keyFiles: ['src/registry/pages.tsx', 'packages/layout/src/router'],
    dependencies: ['认证信息', '菜单数据'],
  },
  {
    name: '页面视图',
    layer: '业务表现',
    responsibility: '承载系统、表单、元数据与监控页面，只负责状态编排与交互。',
    keyFiles: ['src/pages/index/**', 'packages/*/src/**'],
    dependencies: ['API 模块', '共享组件'],
  },
  {
    name: 'API 契约',
    layer: '前端服务',
    responsibility: '按业务域封装请求方法与响应类型，隔离 URL 与数据结构。',
    keyFiles: ['src/apis/**'],
    dependencies: ['HTTP 客户端', '后端接口'],
  },
  {
    name: '布局与状态',
    layer: '应用框架',
    responsibility: '提供多标签、主题、布局、消息与认证状态等横切能力。',
    keyFiles: ['packages/layout/src/**', 'packages/auth/src/**'],
    dependencies: ['页面视图'],
  },
  {
    name: '共享组件',
    layer: '组件层',
    responsibility: '沉淀通用组件、图标与样式，减少业务页面重复实现。',
    keyFiles: ['packages/components/src/**', 'packages/theme/src/**'],
    dependencies: ['设计 token'],
  },
]

const BACKEND_MODULES: ArchitectureModule[] = [
  {
    name: 'HTTP 入口',
    layer: '接口层',
    responsibility: 'Express 应用装配、跨域、JSON 解析与模块路由挂载。',
    keyFiles: ['service/src/app.ts'],
    dependencies: ['中间件', '业务路由'],
  },
  {
    name: '横切中间件',
    layer: '中间件层',
    responsibility: '请求 ID、认证、权限、参数校验与统一错误处理。',
    keyFiles: ['service/src/middleware/**'],
    dependencies: ['会话服务', '权限映射', '监控审计'],
  },
  {
    name: '业务路由',
    layer: '路由层',
    responsibility: '按模块声明 REST 路径，调用校验 schema 后进入服务层。',
    keyFiles: ['service/src/modules/**/**.routes.ts'],
    dependencies: ['服务层', 'schema 校验'],
  },
  {
    name: '业务服务',
    layer: '服务层',
    responsibility: '实现领域规则、事务边界、状态迁移与查询组装。',
    keyFiles: ['service/src/modules/**/**.service.ts'],
    dependencies: ['数据库', '领域错误'],
  },
  {
    name: '数据访问',
    layer: '数据层',
    responsibility: 'SQLite 连接、建表迁移、索引与领域表访问。',
    keyFiles: ['service/src/db/index.ts', 'service/src/modules/**/schema.ts'],
    dependencies: ['node:sqlite'],
  },
  {
    name: '集成能力',
    layer: '集成层',
    responsibility: 'MCP 工具接口与监控采集队列等系统能力。',
    keyFiles: ['service/src/modules/mcp/**', 'service/src/modules/monitor/**'],
    dependencies: ['业务服务', '日志数据'],
  },
]

const REQUEST_FLOW: RequestFlowNode[] = [
  {
    stage: '浏览器交互',
    owner: '前端页面',
    responsibility: '收集用户输入，发起页面级请求与状态渲染。',
    guarantee: '按钮和入口先按权限标识隐藏',
  },
  {
    stage: 'HTTP 封装',
    owner: 'axios 实例',
    responsibility: '附加 Authorization，处理响应 envelope 与统一报错。',
    guarantee: '401 / 403 / 500 行为一致',
  },
  {
    stage: '请求上下文',
    owner: 'requestId / cors / json',
    responsibility: '生成链路 ID，处理跨域与请求体解析。',
    guarantee: '响应携带 X-Request-Id',
  },
  {
    stage: '身份认证',
    owner: 'authMiddleware',
    responsibility: '校验令牌、恢复会话并实时聚合用户权限。',
    guarantee: '角色变更后无需等待令牌过期',
  },
  {
    stage: '权限判定',
    owner: 'permissionMiddleware',
    responsibility: '按方法与路径匹配权限标识，拒绝未授权接口。',
    guarantee: '接口权限与页面权限同源',
  },
  {
    stage: '参数校验',
    owner: 'validate + zod schema',
    responsibility: '校验 query / params / body，阻止非法输入进入服务层。',
    guarantee: '领域层收到强约束输入',
  },
  {
    stage: '领域服务',
    owner: 'service 层',
    responsibility: '执行业务规则、状态迁移、事务与数据组装。',
    guarantee: '业务不变量集中收敛',
  },
  {
    stage: '数据访问',
    owner: 'node:sqlite',
    responsibility: '读写 SQLite 表与索引，外键约束实时生效。',
    guarantee: 'WAL 提升读写并发',
  },
]

function getApiModuleName(path: string): { name: string, routePrefix: string } {
  const routePrefix = `/${path.split('/')[1] ?? ''}`
  const mapping: Record<string, string> = {
    '/admin': '系统管理 · 用户',
    '/role': '系统管理 · 角色',
    '/menu': '系统管理 · 菜单',
    '/system': '系统管理 · 架构',
    '/form': '表单中心',
    '/metadata': '元数据管理',
    '/monitor': '监控中心',
    '/mcp': 'MCP 集成',
  }
  return { name: mapping[routePrefix] ?? `其它接口（${routePrefix}）`, routePrefix }
}

function buildApiMatrix(): ApiModule[] {
  const modules = new Map<string, ApiModule>()
  for (const rule of ROUTE_PERMISSIONS) {
    const { name, routePrefix } = getApiModuleName(rule.path)
    const module = modules.get(routePrefix) ?? {
      name,
      routePrefix,
      endpointCount: 0,
      permissionCount: 0,
      endpoints: [],
    }
    module.endpoints.push({ method: rule.method, path: rule.path, permissions: [...rule.permission] })
    module.endpointCount += 1
    modules.set(routePrefix, module)
  }

  return [...modules.values()]
    .map(module => ({
      ...module,
      permissionCount: new Set(module.endpoints.flatMap(endpoint => endpoint.permissions)).size,
      endpoints: module.endpoints.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method)),
    }))
    .sort((a, b) => a.routePrefix.localeCompare(b.routePrefix))
}

function readTable(database: ReturnType<typeof getDb>, name: string): DatabaseTable {
  const columns = (database.prepare(`PRAGMA table_info(${name})`).all() as unknown as SqliteColumnRow[]).map(column => ({
    name: column.name,
    type: column.type || 'ANY',
    nullable: column.notnull === 0,
    defaultValue: column.dflt_value,
    primaryKey: column.pk > 0,
  }))

  const indexes = (database.prepare(`PRAGMA index_list(${name})`).all() as unknown as SqliteIndexRow[]).map(index => ({
    name: index.name,
    columns: (database.prepare(`PRAGMA index_info(${index.name})`).all() as unknown as SqliteIndexColumnRow[])
      .map(column => column.name)
      .filter((name): name is string => Boolean(name)),
    unique: index.unique === 1,
    origin: index.origin,
    partial: index.partial === 1,
  }))

  const foreignKeys = (database.prepare(`PRAGMA foreign_key_list(${name})`).all() as unknown as SqliteForeignKeyRow[]).map(key => ({
    column: key.from,
    referenceTable: key.table,
    referenceColumn: key.to ?? 'id',
    onDelete: key.on_delete,
    onUpdate: key.on_update,
  }))

  return {
    name,
    description: TABLE_DESCRIPTIONS[name] ?? '运行时识别的扩展表',
    columns,
    indexes,
    foreignKeys,
  }
}

function buildDatabaseDomains(): DatabaseDomain[] {
  const database = getDb()
  const tableRows = database.prepare(`
    SELECT name, sql
    FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all() as unknown as SqliteTableRow[]
  const tableMap = new Map(tableRows.map(row => [row.name, readTable(database, row.name)]))
  const assigned = new Set(DOMAIN_MANIFEST.flatMap(domain => domain.tables))
  const domains: DatabaseDomain[] = DOMAIN_MANIFEST.map(domain => ({
    code: domain.code,
    name: domain.name,
    description: domain.description,
    designPoints: domain.designPoints,
    tables: domain.tables
      .filter(name => tableMap.has(name))
      .map(name => tableMap.get(name) as DatabaseTable),
  }))

  const unassigned = tableRows.filter(row => !assigned.has(row.name)).map(row => row.name)
  if (unassigned.length > 0) {
    domains.push({
      code: 'extension',
      name: '扩展与运维',
      description: '运行时识别但未纳入主业务域说明的表，避免架构图遗漏真实结构。',
      designPoints: ['按 SQLite 元数据实时读取，新增表会自动出现在该域'],
      tables: unassigned.map(name => tableMap.get(name) as DatabaseTable),
    })
  }

  return domains
}

export function getArchitecture(): ArchitectureResponse {
  const databaseDomains = buildDatabaseDomains()
  const apiMatrix = buildApiMatrix()

  return {
    overview: {
      frontendModules: FRONTEND_MODULES.length,
      backendModules: BACKEND_MODULES.length,
      dataTables: databaseDomains.reduce((count, domain) => count + domain.tables.length, 0),
      apiCount: ROUTE_PERMISSIONS.length + UNPROTECTED_ROUTES.length,
      permissionCount: new Set(ROUTE_PERMISSIONS.flatMap(rule => rule.permission)).size,
    },
    frontendModules: FRONTEND_MODULES,
    backendModules: BACKEND_MODULES,
    requestFlow: REQUEST_FLOW,
    databaseDomains,
    apiMatrix,
  }
}
