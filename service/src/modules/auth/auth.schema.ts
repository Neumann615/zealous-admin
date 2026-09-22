import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空'),
})

export const updatePasswordSchema = z.object({
  oldPassword: z.string().min(1, '旧密码不能为空'),
  newPassword: z.string().min(1, '新密码不能为空'),
}).refine(data => data.oldPassword !== data.newPassword, {
  message: '新密码不能与旧密码相同',
})
