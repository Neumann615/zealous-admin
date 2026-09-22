import type {
  EnumValueBatchDetail,
  EnumValueDetail,
  EnumValueGeneralItem,
  EnumValueHierarchyItem,
  EnumValueParentChildItem,
} from '../contracts/enum-value'

export interface MetadataFieldOption {
  label: string
  value: string | number
  disabled?: boolean
  parent?: string | number
  path?: string[]
  children?: MetadataFieldOption[]
  raw?: EnumValueGeneralItem | EnumValueHierarchyItem | EnumValueParentChildItem
}

function generalOptions(items: EnumValueGeneralItem[] = []): MetadataFieldOption[] {
  return items.map(item => ({
    label: item.valueName,
    value: item.value,
    disabled: item.enabled === 0,
    raw: item,
  }))
}

function hierarchyOptions(items: EnumValueHierarchyItem[] = [], shape: 'flat' | 'tree' | 'path' = 'flat'): MetadataFieldOption[] {
  return items.map((item) => {
    const levels = [
      { code: item.level1Code, name: item.level1Name },
      { code: item.level2Code, name: item.level2Name },
      ...(item.level3Code ? [{ code: item.level3Code, name: item.level3Name || item.level3Code }] : []),
    ]
    const leaf = levels.at(-1)!
    return {
      label: shape === 'path' ? levels.map(level => level.name).join(' / ') : leaf.name,
      value: leaf.code,
      disabled: item.enabled === 0,
      parent: levels.at(-2)?.code,
      path: levels.map(level => level.name),
      raw: item,
    }
  })
}

function parentChildOptions(items: EnumValueParentChildItem[] = []): MetadataFieldOption[] {
  return items.map(item => ({
    label: item.name,
    value: item.code,
    disabled: item.enabled === 0,
    parent: item.parentCode,
    path: item.parentName ? [item.parentName, item.name] : [item.name],
    raw: item,
  }))
}

function hierarchyTree(items: EnumValueHierarchyItem[] = []): MetadataFieldOption[] {
  const nodeByValue = new Map<string, MetadataFieldOption>()
  const roots: MetadataFieldOption[] = []

  for (const item of items) {
    const levels = [
      { code: item.level1Code, name: item.level1Name },
      { code: item.level2Code, name: item.level2Name },
      ...(item.level3Code ? [{ code: item.level3Code, name: item.level3Name || item.level3Code }] : []),
    ]
    let parent: MetadataFieldOption | undefined

    for (const [index, level] of levels.entries()) {
      const path = levels.slice(0, index + 1).map(level => level.name)
      let node = nodeByValue.get(level.code)
      if (!node) {
        node = {
          label: level.name,
          value: level.code,
          disabled: item.enabled === 0,
          parent: parent?.value,
          path,
          children: [],
          raw: item,
        }
        nodeByValue.set(level.code, node)
        if (parent)
          parent.children!.push(node)
        else
          roots.push(node)
      }
      parent = node
    }
  }

  return roots
}

function buildParentChildTree(options: MetadataFieldOption[]): MetadataFieldOption[] {
  const nodeByValue = new Map<string, MetadataFieldOption>()
  const roots: MetadataFieldOption[] = []

  for (const option of options)
    nodeByValue.set(String(option.value), { ...option, children: [] })

  for (const option of nodeByValue.values()) {
    const parent = option.parent === undefined ? undefined : nodeByValue.get(String(option.parent))
    if (parent)
      parent.children!.push(option)
    else
      roots.push(option)
  }
  return roots
}

export function normalizeEnumValueDetail(
  detail: EnumValueDetail | EnumValueBatchDetail,
  options: { shape?: 'flat' | 'tree' | 'path' } = {},
): MetadataFieldOption[] {
  const shape = options.shape || 'flat'
  if (detail.generalList?.length)
    return generalOptions(detail.generalList)
  if (detail.hierarchyList?.length)
    return shape === 'tree' ? hierarchyTree(detail.hierarchyList) : hierarchyOptions(detail.hierarchyList, shape)
  if (detail.parentChildList?.length) {
    return shape === 'tree'
      ? buildParentChildTree(parentChildOptions(detail.parentChildList))
      : parentChildOptions(detail.parentChildList)
  }
  return []
}

export function normalizeEnumValueBatch(
  details: EnumValueBatchDetail[],
  options: { shape?: 'flat' | 'tree' | 'path' } = {},
): Record<string, MetadataFieldOption[]> {
  return Object.fromEntries(details.map(detail => [detail.enumCode, normalizeEnumValueDetail(detail, options)]))
}
