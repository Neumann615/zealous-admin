import type { MetadataPageResponse } from '../contracts/common'
import type {
  EnumValueBatchDetail,
  EnumValueDetail,
  EnumValueGeneralItem,
  EnumValueHierarchyItem,
  EnumValueParentChildItem,
} from '../contracts/enum-value'
import type { MetadataFieldOption } from '../runtime/enum-value'
import { normalizeEnumValueDetail } from '../runtime/enum-value'

export const MOCK_METADATA_SYSTEM_NAME = 'demo-system'

export const MOCK_METADATA_ENUM_CODES = [
  'GENDER',
  'COUNTRY',
  'CURRENCY',
  'ADMIN_REGION',
  'ORGANIZATION',
] as const

export type MockMetadataEnumCode = (typeof MOCK_METADATA_ENUM_CODES)[number]

function detail(
  id: number,
  enumCode: MockMetadataEnumCode,
  enumName: string,
  type: EnumValueDetail['enumValue']['type'],
  data: {
    generalList?: EnumValueGeneralItem[]
    hierarchyList?: EnumValueHierarchyItem[]
    parentChildList?: EnumValueParentChildItem[]
  },
): EnumValueDetail {
  return {
    enumValue: {
      id,
      enumName,
      enumCode,
      systemName: MOCK_METADATA_SYSTEM_NAME,
      systemNameDesc: '演示系统',
      type,
      status: 1,
      source: '本地演示数据',
    },
    ...data,
  }
}

export const MOCK_ENUM_VALUES: EnumValueDetail[] = [
  detail(1, 'GENDER', '性别', '一般维表', {
    generalList: [
      { id: 11, value: '1', valueName: '男', valueAbbr: 'M', enabled: 1, sortOrder: 1 },
      { id: 12, value: '2', valueName: '女', valueAbbr: 'F', enabled: 1, sortOrder: 2 },
      { id: 13, value: '0', valueName: '未知', valueAbbr: 'U', enabled: 1, sortOrder: 3 },
      { id: 14, value: '9', valueName: '已停用示例', enabled: 0, sortOrder: 9 },
    ],
  }),
  detail(2, 'COUNTRY', '国家或地区', '一般维表', {
    generalList: [
      { id: 21, value: 'CN', valueName: '中国', valueAbbr: 'CHN', enabled: 1, sortOrder: 1 },
      { id: 22, value: 'SG', valueName: '新加坡', valueAbbr: 'SGP', enabled: 1, sortOrder: 2 },
      { id: 23, value: 'US', valueName: '美国', valueAbbr: 'USA', enabled: 1, sortOrder: 3 },
      { id: 24, value: 'GB', valueName: '英国', valueAbbr: 'GBR', enabled: 1, sortOrder: 4 },
      { id: 25, value: 'DE', valueName: '德国', valueAbbr: 'DEU', enabled: 1, sortOrder: 5 },
      { id: 26, value: 'JP', valueName: '日本', valueAbbr: 'JPN', enabled: 1, sortOrder: 6 },
    ],
  }),
  detail(3, 'CURRENCY', '货币', '一般维表', {
    generalList: [
      { id: 31, value: 'CNY', valueName: '人民币', valueAbbr: '¥', enabled: 1, sortOrder: 1 },
      { id: 32, value: 'HKD', valueName: '港币', valueAbbr: 'HK$', enabled: 1, sortOrder: 2 },
      { id: 33, value: 'USD', valueName: '美元', valueAbbr: '$', enabled: 1, sortOrder: 3 },
      { id: 34, value: 'EUR', valueName: '欧元', valueAbbr: '€', enabled: 1, sortOrder: 4 },
      { id: 35, value: 'SGD', valueName: '新加坡元', valueAbbr: 'S$', enabled: 1, sortOrder: 5 },
      { id: 36, value: 'JPY', valueName: '日元', valueAbbr: 'JP¥', enabled: 1, sortOrder: 6 },
    ],
  }),
  detail(4, 'ADMIN_REGION', '省市区', '层次维表', {
    hierarchyList: [
      { id: 401, level1Code: 'CN-ZJ', level1Name: '浙江省', level2Code: 'CN-ZJ-HZ', level2Name: '杭州市', enabled: 1, sortOrder: 1 },
      { id: 402, level1Code: 'CN-ZJ', level1Name: '浙江省', level2Code: 'CN-ZJ-NB', level2Name: '宁波市', enabled: 1, sortOrder: 2 },
      { id: 403, level1Code: 'CN-ZJ', level1Name: '浙江省', level2Code: 'CN-ZJ-HZ', level2Name: '杭州市', level3Code: 'CN-ZJ-HZ-XH', level3Name: '西湖区', enabled: 1, sortOrder: 11 },
      { id: 404, level1Code: 'CN-ZJ', level1Name: '浙江省', level2Code: 'CN-ZJ-HZ', level2Name: '杭州市', level3Code: 'CN-ZJ-HZ-BJ', level3Name: '滨江区', enabled: 1, sortOrder: 12 },
      { id: 405, level1Code: 'CN-ZJ', level1Name: '浙江省', level2Code: 'CN-ZJ-NB', level2Name: '宁波市', level3Code: 'CN-ZJ-NB-HZ', level3Name: '海曙区', enabled: 1, sortOrder: 13 },
      { id: 406, level1Code: 'CN-JS', level1Name: '江苏省', level2Code: 'CN-JS-NJ', level2Name: '南京市', enabled: 1, sortOrder: 21 },
      { id: 407, level1Code: 'CN-JS', level1Name: '江苏省', level2Code: 'CN-JS-SZ', level2Name: '苏州市', enabled: 1, sortOrder: 22 },
      { id: 408, level1Code: 'CN-JS', level1Name: '江苏省', level2Code: 'CN-JS-NJ', level2Name: '南京市', level3Code: 'CN-JS-NJ-XW', level3Name: '玄武区', enabled: 1, sortOrder: 31 },
      { id: 409, level1Code: 'CN-JS', level1Name: '江苏省', level2Code: 'CN-JS-NJ', level2Name: '南京市', level3Code: 'CN-JS-NJ-JY', level3Name: '建邺区', enabled: 1, sortOrder: 32 },
      { id: 410, level1Code: 'CN-GD', level1Name: '广东省', level2Code: 'CN-GD-GZ', level2Name: '广州市', enabled: 1, sortOrder: 41 },
      { id: 411, level1Code: 'CN-GD', level1Name: '广东省', level2Code: 'CN-GD-SZ', level2Name: '深圳市', enabled: 1, sortOrder: 42 },
      { id: 412, level1Code: 'CN-GD', level1Name: '广东省', level2Code: 'CN-GD-GZ', level2Name: '广州市', level3Code: 'CN-GD-GZ-TH', level3Name: '天河区', enabled: 1, sortOrder: 51 },
      { id: 413, level1Code: 'CN-GD', level1Name: '广东省', level2Code: 'CN-GD-GZ', level2Name: '广州市', level3Code: 'CN-GD-GZ-YX', level3Name: '越秀区', enabled: 1, sortOrder: 52 },
      { id: 414, level1Code: 'CN-GD', level1Name: '广东省', level2Code: 'CN-GD-SZ', level2Name: '深圳市', level3Code: 'CN-GD-SZ-FT', level3Name: '福田区', enabled: 1, sortOrder: 53 },
      { id: 415, level1Code: 'CN-GD', level1Name: '广东省', level2Code: 'CN-GD-SZ', level2Name: '深圳市', level3Code: 'CN-GD-SZ-NS', level3Name: '南山区', enabled: 1, sortOrder: 54 },
      { id: 416, level1Code: 'CN-GD', level1Name: '广东省', level2Code: 'CN-GD-SZ', level2Name: '深圳市', level3Code: 'CN-GD-SZ-GXQ', level3Name: '已停用园区', enabled: 0, sortOrder: 99 },
    ],
  }),
  detail(5, 'ORGANIZATION', '组织机构', '父子维表', {
    parentChildList: [
      { id: 51, code: 'ORG', name: '集团总部', level: 1, isLeaf: 'N', enabled: 1, sortOrder: 1 },
      { id: 52, code: 'ORG-RD', name: '研发中心', parentCode: 'ORG', parentName: '集团总部', level: 2, isLeaf: 'N', enabled: 1, sortOrder: 2 },
      { id: 53, code: 'ORG-RD-FE', name: '前端组', parentCode: 'ORG-RD', parentName: '研发中心', level: 3, isLeaf: 'Y', enabled: 1, sortOrder: 3 },
      { id: 54, code: 'ORG-RD-BE', name: '后端组', parentCode: 'ORG-RD', parentName: '研发中心', level: 3, isLeaf: 'Y', enabled: 1, sortOrder: 4 },
      { id: 55, code: 'ORG-FIN', name: '财务部', parentCode: 'ORG', parentName: '集团总部', level: 2, isLeaf: 'Y', enabled: 1, sortOrder: 5 },
      { id: 56, code: 'ORG-LEGACY', name: '已停用部门', parentCode: 'ORG', parentName: '集团总部', level: 2, isLeaf: 'Y', enabled: 0, sortOrder: 9 },
    ],
  }),
]

const detailsByCode = new Map(MOCK_ENUM_VALUES.map(item => [item.enumValue.enumCode, item]))

function delay(ms = 60): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted)
    throw new DOMException('The operation was aborted.', 'AbortError')
}

function filterValid<T extends { enabled?: number }>(items: T[] = [], onlyValid: boolean): T[] {
  return onlyValid ? items.filter(item => item.enabled !== 0) : items
}

export async function getMockEnumValueDetail(
  enumCode: string,
  onlyValid = false,
  signal?: AbortSignal,
): Promise<EnumValueDetail> {
  await delay()
  throwIfAborted(signal)
  const source = detailsByCode.get(enumCode)
  if (!source)
    throw new Error(`未找到演示元数据：${enumCode}`)
  const result = structuredClone(source)
  result.generalList = filterValid(result.generalList, onlyValid)
  result.hierarchyList = filterValid(result.hierarchyList, onlyValid)
  result.parentChildList = filterValid(result.parentChildList, onlyValid)
  return result
}

export async function getMockEnumValueBatch(
  enumCodes: string[],
  onlyValid = false,
  signal?: AbortSignal,
): Promise<EnumValueBatchDetail[]> {
  await delay()
  throwIfAborted(signal)
  const results = await Promise.all(
    enumCodes.map(async enumCode => getMockEnumValueDetail(enumCode, onlyValid, signal)),
  )
  return results.map(({ enumValue, ...detail }) => ({
    enumCode: enumValue.enumCode,
    systemName: enumValue.systemName,
    type: enumValue.type,
    status: enumValue.status,
    ...detail,
  }))
}

export async function getMockEnumValueOptions(
  params: {
    enumCode: string
    onlyValid?: boolean
    shape?: 'flat' | 'tree' | 'path'
  },
  signal?: AbortSignal,
): Promise<MetadataFieldOption[]> {
  const source = await getMockEnumValueDetail(params.enumCode, params.onlyValid, signal)
  return normalizeEnumValueDetail(source, { shape: params.shape })
}

export async function getMockEnumValuePage(params: {
  pageNum?: number
  pageSize?: number
  enumName?: string
  enumCode?: string
}): Promise<MetadataPageResponse<EnumValueDetail['enumValue']>> {
  await delay()
  const records = MOCK_ENUM_VALUES.map(item => item.enumValue)
  const filtered = records.filter((item) => {
    return (!params.enumName || item.enumName.includes(params.enumName))
      && (!params.enumCode || item.enumCode.includes(params.enumCode))
  })
  const pageNum = params.pageNum || 1
  const pageSize = params.pageSize || 10
  const start = (pageNum - 1) * pageSize
  return {
    list: filtered.slice(start, start + pageSize),
    total: filtered.length,
    pageNum,
    pageSize,
  }
}
