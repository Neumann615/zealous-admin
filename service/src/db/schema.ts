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

export interface FormData {
  id: number
  formId: number
  formVersion: number
  submitter: string | null
  status: number
  data: string
  createTime: string | null
}
