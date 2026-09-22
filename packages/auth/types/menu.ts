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
