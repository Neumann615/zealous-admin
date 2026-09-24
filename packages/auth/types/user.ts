export interface LoginReq {
  username: string
  password: string
  captchaToken?: string
}

export interface LoginRes {
  tokenHead: string
  token: string
}

export interface UserInfo {
  id: number
  username: string
  icon: string | null
  email: string | null
  nickName: string | null
  note: string | null
  createTime: string | null
  loginTime: string | null
  status: number
}

export interface UserInfoWithAuth extends UserInfo {
  menus: any[]
  roles: string[]
  /** 权限标识集合，超管为 ['*']；服务端已独立校验，前端仅用于隐藏无权操作的入口 */
  permissions: string[]
}

export interface AdminRecord {
  id?: number
  username: string
  password?: string
  icon?: string
  email?: string
  nickName?: string
  note?: string
  createTime?: string
  loginTime?: string
  status: number
}

export interface UpdatePasswordReq {
  oldPassword: string
  newPassword: string
}
