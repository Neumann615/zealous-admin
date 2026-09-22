import { describe, expect, it } from 'vitest'
import { normalizeEnumValueBatch, normalizeEnumValueDetail } from './enum-value'

describe('metadata enum normalizers', () => {
  it('normalizes general values', () => {
    expect(normalizeEnumValueDetail({
      enumValue: { id: 1, enumName: '性别', enumCode: 'sex', systemName: 'test', type: '一般维表', status: 1 },
      generalList: [
        { value: '1', valueName: '男', enabled: 1 },
        { value: '2', valueName: '女', enabled: 0 },
      ],
    })).toEqual([
      { label: '男', value: '1', disabled: false, raw: { value: '1', valueName: '男', enabled: 1 } },
      { label: '女', value: '2', disabled: true, raw: { value: '2', valueName: '女', enabled: 0 } },
    ])
  })

  it('normalizes hierarchy values as a path', () => {
    const options = normalizeEnumValueDetail({
      enumValue: { id: 2, enumName: '组织', enumCode: 'org', systemName: 'test', type: '层次维表', status: 1 },
      hierarchyList: [{
        level1Code: 'a',
        level1Name: '研发',
        level2Code: 'a1',
        level2Name: '前端',
        enabled: 1,
      }],
    }, { shape: 'path' })

    expect(options[0].label).toBe('研发 / 前端')
    expect(options[0].value).toBe('a1')
    expect(options[0].parent).toBe('a')
  })

  it('normalizes parent-child values and batches by enum code', () => {
    const options = normalizeEnumValueBatch([{
      enumCode: 'area',
      systemName: 'test',
      type: '父子维表',
      status: 1,
      parentChildList: [{
        code: 'zj',
        name: '浙江',
        parentCode: 'cn',
        parentName: '中国',
        enabled: 1,
      }],
    }])

    expect(options.area).toEqual([{
      label: '浙江',
      value: 'zj',
      disabled: false,
      parent: 'cn',
      path: ['中国', '浙江'],
      raw: { code: 'zj', name: '浙江', parentCode: 'cn', parentName: '中国', enabled: 1 },
    }])
  })
})
