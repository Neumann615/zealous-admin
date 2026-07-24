/** 字典类型 */
export interface DictType {
  /** ID */
  id?: number
  /** 字典名称 */
  name: string
  /** 字典类型编码 */
  dictType: string
  /** 启用状态：0->禁用；1->启用 */
  status: number
  /** 创建时间 */
  createTime?: string
  /** 备注 */
  remark?: string
}

/** 字典数据 */
export interface DictData {
  /** ID */
  id?: number
  /** 字典类型编码 */
  dictType: string
  /** 字典标签 */
  dictLabel: string
  /** 字典值 */
  dictValue: string
  /** 排序 */
  dictSort: number
  /** 启用状态：0->禁用；1->启用 */
  status: number
  /** 创建时间 */
  createTime?: string
  /** 备注 */
  remark?: string
  /** CSS 样式类名 */
  cssClass?: string
  /** 列表样式类名 */
  listClass?: string
}
