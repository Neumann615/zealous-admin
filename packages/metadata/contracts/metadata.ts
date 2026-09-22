export interface MetadataSet {
  id: number
  code: string
  name: string
  description?: string
  status: 0 | 1
  createTime?: string
  updateTime?: string
}

export interface MetadataItem {
  id: number
  setId: number
  parentId?: number | null
  code: string
  name: string
  shortName?: string
  description?: string
  sortOrder: number
  status: 0 | 1
  createTime?: string
  updateTime?: string
  children?: MetadataItem[]
}

export interface MetadataSetPageRequest {
  keyword?: string
  status?: 0 | 1
  pageNum?: number
  pageSize?: number
}

export interface MetadataSetPageResponse {
  list: MetadataSet[]
  total: number
  pageNum: number
  pageSize: number
}

export interface MetadataSetSaveRequest {
  code?: string
  name?: string
  description?: string
  status?: 0 | 1
}

export interface MetadataItemSaveRequest {
  parentId?: number
  code?: string
  name?: string
  shortName?: string
  description?: string
  sortOrder?: number
  status?: 0 | 1
}

export interface MetadataItemCreateRequest extends MetadataItemSaveRequest {
  setCode: string
  code: string
  name: string
}

export interface OptionSet {
  set: MetadataSet
  items: MetadataItem[]
}
