import type { OptionSet } from '../contracts/metadata'
import { describe, expect, it } from 'vitest'
import { normalizeOptionSet } from './option-set'

const detail: OptionSet = {
  set: { id: 1, code: 'ORGANIZATION', name: '组织机构', status: 1 },
  items: [
    {
      id: 1,
      setId: 1,
      parentId: null,
      code: 'HQ',
      name: '总部',
      sortOrder: 0,
      status: 1,
      children: [
        { id: 2, setId: 1, parentId: 1, code: 'RD', name: '研发', sortOrder: 0, status: 1 },
      ],
    },
    { id: 3, setId: 1, parentId: null, code: 'OFF', name: '停用', sortOrder: 1, status: 0 },
  ],
}

describe('normalizeOptionSet', () => {
  it('默认展开所有层级编码项', () => {
    expect(normalizeOptionSet(detail)).toEqual([
      { label: '总部', value: 'HQ' },
      { label: '研发', value: 'RD' },
      { label: '停用', value: 'OFF', disabled: true },
    ])
  })

  it('支持树结构和层级路径展示', () => {
    expect(normalizeOptionSet(detail, { shape: 'tree' })).toEqual([
      {
        label: '总部',
        value: 'HQ',
        children: [{ label: '研发', value: 'RD' }],
      },
      { label: '停用', value: 'OFF', disabled: true },
    ])
    expect(normalizeOptionSet(detail, { shape: 'path' })).toEqual([
      { label: '总部', value: 'HQ' },
      { label: '总部 / 研发', value: 'RD' },
      { label: '停用', value: 'OFF', disabled: true },
    ])
  })
})
