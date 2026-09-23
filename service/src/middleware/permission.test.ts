import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { findRoutePermissions, UNPROTECTED_ROUTES } from './permission'

const MODULES_DIR = path.resolve(import.meta.dirname, '../modules')

/** 各路由文件在 app.ts 中的挂载前缀，未列出的都挂在根路径 */
const MOUNT_PREFIXES: Record<string, string> = {
  'metadata/routes.ts': '/metadata',
  'monitor/routes.ts': '/monitor',
}

const ROUTE_FILE_PATTERN = /(?:^|\.)routes\.ts$/
const ROUTE_DECLARATION_PATTERN = /\brouter\.(get|post|put|delete|patch)\(\s*['"`]([^'"`]+)/g

function collectRouteFiles(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory())
      found.push(...collectRouteFiles(full))
    else if (ROUTE_FILE_PATTERN.test(entry))
      found.push(full)
  }
  return found
}

function discoverRoutes(): Array<{ method: string, path: string, file: string }> {
  const routes: Array<{ method: string, path: string, file: string }> = []
  for (const file of collectRouteFiles(MODULES_DIR)) {
    const relative = path.relative(MODULES_DIR, file).replaceAll('\\', '/')
    const prefix = MOUNT_PREFIXES[relative] ?? ''
    for (const match of readFileSync(file, 'utf8').matchAll(ROUTE_DECLARATION_PATTERN))
      routes.push({ method: match[1].toUpperCase(), path: `${prefix}${match[2]}`, file: relative })
  }
  return routes
}

describe('接口权限表覆盖', () => {
  const routes = discoverRoutes()
  const unprotected = new Set(UNPROTECTED_ROUTES.map(route => `${route.method} ${route.path}`))

  it('能扫描到全部路由声明（正则失效时这条会先失败）', () => {
    expect(routes.length).toBeGreaterThan(50)
  })

  it('每个接口要么登记了权限标识，要么在白名单里写明理由', () => {
    const uncovered = routes.filter(route =>
      findRoutePermissions(route.method, route.path) === undefined
      && !unprotected.has(`${route.method} ${route.path}`),
    )
    expect(uncovered.map(route => `${route.method} ${route.path} (${route.file})`)).toEqual([])
  })

  it('白名单里的接口确实存在，避免留下失效豁免', () => {
    const declared = new Set(routes.map(route => `${route.method} ${route.path}`))
    expect([...unprotected].filter(key => !declared.has(key))).toEqual([])
  })
})

describe('接口权限匹配', () => {
  it('具体路径优先于 :param 通配', () => {
    expect(findRoutePermissions('GET', '/admin/list')).toEqual(['system:user:list'])
    expect(findRoutePermissions('GET', '/admin/123')).toEqual(['system:user:list'])
    expect(findRoutePermissions('GET', '/menu/tree')).not.toEqual(findRoutePermissions('GET', '/menu/9'))
  })

  it('按完整路径匹配（含挂载前缀）', () => {
    expect(findRoutePermissions('GET', '/monitor/logs')).toEqual(['monitor:log:list'])
    expect(findRoutePermissions('POST', '/metadata/sets/12/delete')).toEqual(['metadata:set:delete'])
  })

  it('未登记的路径返回 undefined', () => {
    expect(findRoutePermissions('GET', '/admin/info')).toBeUndefined()
    expect(findRoutePermissions('GET', '/not-exists')).toBeUndefined()
  })
})
