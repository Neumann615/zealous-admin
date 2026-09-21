import type { FieldPermission, FieldSchema } from '../types/schema'
import { getComponent } from '../registry/registry'
import { nodeBindsField } from './fieldName'

function collectKeys(nodes: FieldSchema[], prefix: string[], out: string[] = []): string[] {
  for (const node of nodes) {
    const path = node.field ? [...prefix, node.field] : prefix
    if (path.length && nodeBindsField(node))
      out.push(path.join('.'))

    if (!node.children?.length)
      continue

    const def = getComponent(node.type)
    const childPrefix = def?.nestList && path.length ? [...path, '*'] : path
    collectKeys(node.children, childPrefix, out)
  }
  return out
}

export function getFieldPermissionKey(children: FieldSchema[], nodeId: string): string | null {
  function find(nodes: FieldSchema[], prefix: string[]): string | null {
    for (const node of nodes) {
      const path = node.field ? [...prefix, node.field] : prefix
      if (node.id === nodeId)
        return path.length && nodeBindsField(node) ? path.join('.') : null

      if (node.children?.length) {
        const def = getComponent(node.type)
        const childPrefix = def?.nestList && path.length ? [...path, '*'] : path
        const key = find(node.children, childPrefix)
        if (key)
          return key
      }
    }
    return null
  }

  return find(children, [])
}

export function listFieldPermissionKeys(children: FieldSchema[]): string[] {
  return collectKeys(children, [])
}

export function renameFieldPermissions(
  permissions: Record<string, FieldPermission> | undefined,
  oldKey: string,
  newKey: string,
): Record<string, FieldPermission> | undefined {
  if (!permissions || !oldKey || oldKey === newKey)
    return permissions

  return Object.fromEntries(Object.entries(permissions).map(([key, value]) => {
    const nextKey = key === oldKey
      ? newKey
      : key.startsWith(`${oldKey}.`) ? newKey + key.slice(oldKey.length) : key
    return [nextKey, value]
  }))
}

export function pruneFieldPermissions(
  permissions: Record<string, FieldPermission> | undefined,
  children: FieldSchema[],
): Record<string, FieldPermission> | undefined {
  if (!permissions)
    return undefined

  const keys = new Set(listFieldPermissionKeys(children))
  const next = Object.fromEntries(Object.entries(permissions).filter(([key]) => keys.has(key)))
  return Object.keys(next).length ? next : undefined
}
