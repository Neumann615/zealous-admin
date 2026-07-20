import type { CommonPage, PageParam } from '@/types/common'
import type { DictData, DictType } from '@/types/dict'
import http from '@/utils/http'

// ==================== 字典类型 ====================

/** 分页获取字典类型列表 */
export function getDictTypeListAPI(params: PageParam) {
  return http<CommonPage<DictType>>({
    url: '/dict/type/list',
    method: 'get',
    params,
  })
}

/** 获取所有字典类型 */
export function getDictTypeAllAPI() {
  return http<DictType[]>({
    url: '/dict/type/all',
    method: 'get',
  })
}

/** 根据ID获取字典类型 */
export function getDictTypeByIdAPI(id: number) {
  return http<DictType>({
    url: `/dict/type/${id}`,
    method: 'get',
  })
}

/** 新增字典类型 */
export function dictTypeCreateAPI(data: DictType) {
  return http({
    url: '/dict/type/create',
    method: 'post',
    data,
  })
}

/** 修改字典类型 */
export function dictTypeUpdateByIdAPI(id: number, data: DictType) {
  return http({
    url: `/dict/type/update/${id}`,
    method: 'post',
    data,
  })
}

/** 删除字典类型 */
export function dictTypeDeleteByIdAPI(id: number) {
  return http({
    url: `/dict/type/delete/${id}`,
    method: 'post',
  })
}

// ==================== 字典数据 ====================

/** 根据字典类型分页获取字典数据 */
export function getDictDataListAPI(params: PageParam & { dictType?: string }) {
  return http<CommonPage<DictData>>({
    url: '/dict/data/list',
    method: 'get',
    params,
  })
}

/** 根据字典类型获取所有字典数据 */
export function getDictDataByTypeAPI(dictType: string) {
  return http<DictData[]>({
    url: `/dict/data/type/${dictType}`,
    method: 'get',
  })
}

/** 根据ID获取字典数据 */
export function getDictDataByIdAPI(id: number) {
  return http<DictData>({
    url: `/dict/data/${id}`,
    method: 'get',
  })
}

/** 新增字典数据 */
export function dictDataCreateAPI(data: DictData) {
  return http({
    url: '/dict/data/create',
    method: 'post',
    data,
  })
}

/** 修改字典数据 */
export function dictDataUpdateByIdAPI(id: number, data: DictData) {
  return http({
    url: `/dict/data/update/${id}`,
    method: 'post',
    data,
  })
}

/** 删除字典数据 */
export function dictDataDeleteByIdAPI(id: number) {
  return http({
    url: `/dict/data/delete/${id}`,
    method: 'post',
  })
}
