import type { Request } from 'express'
import { randomUUID } from 'node:crypto'
import { writeLogSync } from './service'

export function recordPermissionDenied(req: Request, requiredPermissions: string[]): void {
  try {
    const fullPath = `${req.baseUrl}${req.path}`
    writeLogSync('zealous-admin', {
      logId: `auth-forbidden-${randomUUID()}`,
      serial: 0,
      happenTime: Date.now(),
      type: 'WARN',
      rangeType: 'API',
      params: fullPath,
      title: '权限拒绝',
      content: `缺少权限：${requiredPermissions.join(' 或 ')}`,
      nickname: req.username,
      uid: req.adminId === undefined ? undefined : String(req.adminId),
      page: undefined,
      url: fullPath,
      method: req.method,
      status: 403,
      duration: undefined,
      requestId: undefined,
      extra: {
        event: 'PERMISSION_DENIED',
        ip: req.ip ?? null,
        userAgent: req.headers['user-agent'] ?? null,
      },
    })
  }
  catch (error) {
    console.error('[monitor] 权限拒绝审计写入失败', error)
  }
}
