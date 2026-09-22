import { z } from 'zod'

export const registerSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空'),
  icon: z.string().optional(),
  email: z.string().optional(),
  nickName: z.string().optional(),
  note: z.string().optional(),
})

export const updateUserSchema = z.object({
  username: z.string().optional(),
  password: z.string().optional(),
  icon: z.string().optional(),
  email: z.string().optional(),
  nickName: z.string().optional(),
  note: z.string().optional(),
  status: z.number().optional(),
})

export const pageQuerySchema = z.object({
  keyword: z.string().optional(),
  pageNum: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(5),
})

export const assignRolesSchema = z.object({
  adminId: z.coerce.number().min(1, 'adminId 不能为空'),
  roleIds: z.string().optional().default(''),
})
