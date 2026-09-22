import { z } from 'zod'

export const createRoleSchema = z.object({
  name: z.string().min(1, '角色名称不能为空'),
  description: z.string().optional(),
  sort: z.number().optional().default(0),
})

export const updateRoleSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  sort: z.number().optional(),
  status: z.number().optional(),
})

export const rolePageQuerySchema = z.object({
  keyword: z.string().optional(),
  pageNum: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(5),
})

export const assignMenusSchema = z.object({
  roleId: z.coerce.number().min(1, 'roleId 不能为空'),
  menuIds: z.string().optional().default(''),
})
