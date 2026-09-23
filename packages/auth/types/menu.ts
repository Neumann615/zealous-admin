export interface MenuRecord {
  id?: number
  parentId: number
  createTime?: string
  title: string
  level?: number
  sort: number
  name: string
  icon: string
  hidden: number
  path?: string
  activeIcon?: string
  /** 页面组件 key：指向前端页面注册表；为空时按 path 回落到 src/pages 约定文件 */
  component?: string | null
  /** 节点类型：0 目录 / 1 菜单 / 2 按钮；按钮只贡献权限标识，不参与导航与路由 */
  type?: number
  /** 权限标识，如 system:user:add */
  permission?: string | null
}

export interface MenuNode extends MenuRecord {
  children?: MenuNode[]
}

export interface FrontendMenu {
  id: string
  label: string
  icon: string
  key: string
  selectIcon: string
  children?: FrontendMenu[]
}
