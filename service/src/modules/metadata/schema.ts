import type { DatabaseSync } from 'node:sqlite'
import { now } from '../../lib/date.js'

export interface MetadataSet {
  id: number
  code: string
  name: string
  description: string | null
  status: number
  createTime: string | null
  updateTime: string | null
}

export interface MetadataItem {
  id: number
  setId: number
  parentId: number | null
  code: string
  name: string
  shortName: string | null
  description: string | null
  sortOrder: number
  status: number
  createTime: string | null
  updateTime: string | null
  children?: MetadataItem[]
}

interface MetadataSetSeed {
  code: string
  name: string
  description: string
  items: MetadataItemSeed[]
}

interface MetadataItemSeed {
  code: string
  name: string
  shortName?: string
  parentCode?: string
}

const metadataSetSeeds: MetadataSetSeed[] = [
  {
    code: 'GENDER',
    name: '性别',
    description: '人员性别编码',
    items: [
      { code: 'M', name: '男' },
      { code: 'F', name: '女' },
      { code: 'U', name: '未知' },
      { code: 'A', name: '其他' },
    ],
  },
  {
    code: 'COUNTRY',
    name: '国家或地区',
    description: '常用国家与地区编码',
    items: [
      { code: 'CN', name: '中国', shortName: 'CHN' },
      { code: 'US', name: '美国', shortName: 'USA' },
      { code: 'GB', name: '英国', shortName: 'GBR' },
      { code: 'DE', name: '德国', shortName: 'DEU' },
      { code: 'JP', name: '日本', shortName: 'JPN' },
      { code: 'SG', name: '新加坡', shortName: 'SGP' },
    ],
  },
  {
    code: 'CURRENCY',
    name: '货币',
    description: '常用币种编码',
    items: [
      { code: 'CNY', name: '人民币', shortName: '元' },
      { code: 'USD', name: '美元', shortName: '美元' },
      { code: 'EUR', name: '欧元', shortName: '欧元' },
      { code: 'JPY', name: '日元', shortName: '日元' },
      { code: 'HKD', name: '港币', shortName: '港元' },
    ],
  },
  {
    code: 'ADMIN_REGION',
    name: '省市区',
    description: '行政区划演示数据',
    items: [
      { code: '110000', name: '北京市' },
      { code: '110100', name: '北京市', parentCode: '110000' },
      { code: '110101', name: '东城区', parentCode: '110100' },
      { code: '110102', name: '西城区', parentCode: '110100' },
      { code: '110105', name: '朝阳区', parentCode: '110100' },
      { code: '310000', name: '上海市' },
      { code: '310100', name: '上海市', parentCode: '310000' },
      { code: '310101', name: '黄浦区', parentCode: '310100' },
      { code: '310104', name: '徐汇区', parentCode: '310100' },
      { code: '310105', name: '长宁区', parentCode: '310100' },
      { code: '440000', name: '广东省' },
      { code: '440100', name: '广州市', parentCode: '440000' },
      { code: '440103', name: '荔湾区', parentCode: '440100' },
      { code: '440104', name: '越秀区', parentCode: '440100' },
      { code: '440106', name: '天河区', parentCode: '440100' },
      { code: '440300', name: '深圳市', parentCode: '440000' },
      { code: '440303', name: '罗湖区', parentCode: '440300' },
      { code: '440304', name: '福田区', parentCode: '440300' },
      { code: '440305', name: '南山区', parentCode: '440300' },
    ],
  },
  {
    code: 'ORGANIZATION',
    name: '组织机构',
    description: '父子层级组织演示数据',
    items: [
      { code: 'HQ', name: '集团总部' },
      { code: 'HQ-RD', name: '研发中心', parentCode: 'HQ' },
      { code: 'HQ-RD-FE', name: '前端组', parentCode: 'HQ-RD' },
      { code: 'HQ-RD-BE', name: '后端组', parentCode: 'HQ-RD' },
      { code: 'HQ-RD-QA', name: '测试组', parentCode: 'HQ-RD' },
      { code: 'HQ-FIN', name: '财务部', parentCode: 'HQ' },
      { code: 'HQ-FIN-AP', name: '应付组', parentCode: 'HQ-FIN' },
      { code: 'HQ-FIN-AR', name: '应收组', parentCode: 'HQ-FIN' },
      { code: 'BRANCH-SH', name: '上海分公司' },
      { code: 'BRANCH-SH-SAL', name: '销售部', parentCode: 'BRANCH-SH' },
      { code: 'BRANCH-SH-CS', name: '客户成功部', parentCode: 'BRANCH-SH' },
    ],
  },
]

export function prepareMetadataSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS za_metadata_set (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      status INTEGER NOT NULL DEFAULT 1,
      create_time TEXT,
      update_time TEXT
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS za_metadata_item (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      set_id INTEGER NOT NULL,
      parent_id INTEGER,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      short_name TEXT,
      description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      status INTEGER NOT NULL DEFAULT 1,
      create_time TEXT,
      update_time TEXT,
      UNIQUE(set_id, code),
      FOREIGN KEY (set_id) REFERENCES za_metadata_set(id),
      FOREIGN KEY (parent_id) REFERENCES za_metadata_item(id)
    )
  `)

  db.exec('CREATE INDEX IF NOT EXISTS idx_metadata_item_set_order ON za_metadata_item (set_id, sort_order, id)')

  const timestamp = now()
  const insertSet = db.prepare(`
    INSERT OR IGNORE INTO za_metadata_set
      (code, name, description, status, create_time, update_time)
    VALUES (?, ?, ?, 1, ?, ?)
  `)
  const insertItem = db.prepare(`
    INSERT OR IGNORE INTO za_metadata_item
      (set_id, parent_id, code, name, short_name, sort_order, status, create_time, update_time)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `)

  metadataSetSeeds.forEach((metadataSet) => {
    insertSet.run(metadataSet.code, metadataSet.name, metadataSet.description, timestamp, timestamp)
    const set = db.prepare('SELECT id FROM za_metadata_set WHERE code = ?').get(metadataSet.code) as { id: number }
    const itemIds = new Map<string, number>()
    const getExistingItemId = db.prepare('SELECT id FROM za_metadata_item WHERE set_id = ? AND code = ?')

    metadataSet.items.forEach((item, index) => {
      const parentId = item.parentCode ? itemIds.get(item.parentCode) ?? null : null
      const result = insertItem.run(
        set.id,
        parentId,
        item.code,
        item.name,
        item.shortName ?? null,
        index,
        timestamp,
        timestamp,
      )
      const itemId = result.changes === 0
        ? (getExistingItemId.get(set.id, item.code) as { id: number }).id
        : Number(result.lastInsertRowid)
      itemIds.set(item.code, itemId)
    })
  })
}
