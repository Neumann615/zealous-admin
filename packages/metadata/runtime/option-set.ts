import type { MetadataItem, OptionSet } from '../contracts/metadata'

export interface MetadataFieldOption {
  label: string
  value: string | number
  disabled?: boolean
  children?: MetadataFieldOption[]
}

export interface NormalizeOptionSetOptions {
  shape?: 'flat' | 'tree' | 'path'
}

function toOption(item: MetadataItem, label = item.name): MetadataFieldOption {
  return {
    label,
    value: item.code,
    ...(item.status === 0 ? { disabled: true } : {}),
  }
}

function normalizeTree(items: MetadataItem[] = []): MetadataFieldOption[] {
  return items.map((item) => {
    const option = toOption(item)
    if (item.children?.length)
      option.children = normalizeTree(item.children)
    return option
  })
}

function flatten(items: MetadataItem[] = []): MetadataItem[] {
  return items.flatMap(item => [item, ...flatten(item.children)])
}

function normalizePath(items: MetadataItem[] = []): MetadataFieldOption[] {
  const rows = flatten(items)
  const itemById = new Map(rows.map(item => [item.id, item]))

  return rows.map((item) => {
    const labels: string[] = []
    let current: MetadataItem | undefined = item
    while (current) {
      labels.unshift(current.name)
      current = current.parentId ? itemById.get(current.parentId) : undefined
    }
    return toOption(item, labels.join(' / '))
  })
}

export function normalizeOptionSet(
  detail: OptionSet,
  options: NormalizeOptionSetOptions = {},
): MetadataFieldOption[] {
  const shape = options.shape || 'flat'
  if (shape === 'tree')
    return normalizeTree(detail.items)
  if (shape === 'path')
    return normalizePath(detail.items)
  return flatten(detail.items).map(item => toOption(item))
}
