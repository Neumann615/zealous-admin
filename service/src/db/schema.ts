export interface Admin {
  id: number
  username: string
  password: string
  icon: string | null
  email: string | null
  nickName: string | null
  note: string | null
  createTime: string | null
  loginTime: string | null
  status: number
}

export interface Role {
  id: number
  name: string
  description: string | null
  adminCount: number
  createTime: string | null
  status: number
  sort: number
}

export interface Menu {
  id: number
  parentId: number
  createTime: string | null
  title: string
  level: number
  sort: number
  name: string | null
  icon: string | null
  hidden: number
  path: string | null
  component: string | null
}

export interface DictType {
  id: number
  name: string
  dictType: string
  status: number
  createTime: string | null
  remark: string | null
}

export interface DictData {
  id: number
  dictType: string
  dictLabel: string
  dictValue: string
  dictSort: number
  status: number
  createTime: string | null
  remark: string | null
  cssClass: string | null
  listClass: string | null
}

export interface AdminRoleRelation {
  id: number
  adminId: number
  roleId: number
}

export interface RoleMenuRelation {
  id: number
  roleId: number
  menuId: number
}
