export interface LoginReq {
  username: string
  password: string
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
