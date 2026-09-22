import { describe, expect, it } from 'vitest'
import {
  getMockEnumValueBatch,
  getMockEnumValueDetail,
  getMockEnumValueOptions,
  MOCK_ENUM_VALUES,
  MOCK_METADATA_ENUM_CODES,
} from './enum-values'

describe('metadata mock values', () => {
  it('covers general, hierarchy, and parent-child models', () => {
    expect(MOCK_METADATA_ENUM_CODES).toHaveLength(5)
    expect(new Set(MOCK_ENUM_VALUES.map(item => item.enumValue.type)))
      .toEqual(new Set(['一般维表', '层次维表', '父子维表']))
  })

  it('filters disabled values for gender', async () => {
    const all = await getMockEnumValueOptions({ enumCode: 'GENDER' })
    const valid = await getMockEnumValueOptions({ enumCode: 'GENDER', onlyValid: true })

    expect(all).toHaveLength(4)
    expect(valid.map(item => item.value)).toEqual(['1', '2', '0'])
  })

  it('builds a de-duplicated province-city-district tree', async () => {
    const tree = await getMockEnumValueOptions({ enumCode: 'ADMIN_REGION', shape: 'tree', onlyValid: true })

    expect(tree.map(item => item.label)).toEqual(['浙江省', '江苏省', '广东省'])
    expect(tree[0].children?.map(item => item.label)).toEqual(['杭州市', '宁波市'])
    expect(tree[0].children?.[0].children?.map(item => item.label)).toEqual(['西湖区', '滨江区'])
  })

  it('builds organization parent-child tree', async () => {
    const tree = await getMockEnumValueOptions({ enumCode: 'ORGANIZATION', shape: 'tree', onlyValid: true })

    expect(tree).toHaveLength(1)
    expect(tree[0].label).toBe('集团总部')
    expect(tree[0].children?.map(item => item.label)).toEqual(['研发中心', '财务部'])
  })

  it('returns batch details without enumValue wrapping', async () => {
    const details = await getMockEnumValueBatch(['GENDER', 'CURRENCY'])

    expect(details.map(item => item.enumCode)).toEqual(['GENDER', 'CURRENCY'])
    expect(details[0].generalList).toHaveLength(4)
    expect(details[1].generalList?.[0].valueName).toBe('人民币')
  })

  it('returns detail metadata', async () => {
    const detail = await getMockEnumValueDetail('COUNTRY')

    expect(detail.enumValue.enumName).toBe('国家或地区')
    expect(detail.generalList?.[0].value).toBe('CN')
    expect(detail.generalList?.[0].valueName).toBe('中国')
  })
})
