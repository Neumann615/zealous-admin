export interface CommonResult<T = unknown> {
  code: number
  message: string
  data: T
}

export interface PageParam {
  pageNum: number
  pageSize: number
  keyword?: string
  [key: string]: unknown
}

export interface CommonPage<T> {
  pageNum: number
  pageSize: number
  total: number
  list: T[]
}
