export interface UmsAdmin {
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

export interface UmsRole {
  id: number
  name: string
  description: string | null
  adminCount: number
  createTime: string | null
  status: number
  sort: number
}

export interface UmsMenu {
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

export interface UmsDictType {
  id: number
  name: string
  dictType: string
  status: number
  createTime: string | null
  remark: string | null
}

export interface UmsDictData {
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

export interface UmsAdminRoleRelation {
  id: number
  adminId: number
  roleId: number
}

export interface UmsRoleMenuRelation {
  id: number
  roleId: number
  menuId: number
}
