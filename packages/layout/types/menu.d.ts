/** 菜单 */
export interface Menu {
  /** 唯一ID */
  id?: number
  /** 父级ID */
  parentId: number
  /** 创建时间 */
  createTime?: string
  /** 菜单名称 */
  title: string
  /** 菜单级数 */
  level?: number
  /** 菜单排序 */
  sort: number
  /** 前端名称 */
  name: string
  /** 前端图标 */
  icon: string
  /** 前端隐藏 */
  hidden: number
  /** 路由路径 */
  path?: string
  /** 激活图标 */
  activeIcon?: string
}

/** 后台菜单节点封装 */
export type MenuNode = Menu & {
  /** 子级菜单 */
  children: Menu[]
}
