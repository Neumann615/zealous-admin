export interface RoleRecord {
  id?: number
  name: string
  description?: string
  adminCount?: number
  createTime?: string
  status: number
  sort?: number
}

export interface CreateRoleReq {
  name: string
  description?: string
  sort?: number
}

export interface UpdateRoleReq {
  name?: string
  description?: string
  sort?: number
  status?: number
}
