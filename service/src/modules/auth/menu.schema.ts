import { z } from 'zod'

export const createMenuSchema = z.object({
  parentId: z.number().optional().default(0),
  title: z.string().min(1, '菜单标题不能为空'),
  level: z.number().optional().default(0),
  sort: z.number().optional().default(0),
  name: z.string().optional().default(''),
  icon: z.string().optional(),
  hidden: z.number().optional().default(0),
  component: z.string().optional(),
  activeIcon: z.string().optional(),
})

export const updateMenuSchema = z.object({
  parentId: z.number().optional(),
  title: z.string().optional(),
  level: z.number().optional(),
  sort: z.number().optional(),
  name: z.string().optional(),
  icon: z.string().optional(),
  hidden: z.number().optional(),
  component: z.string().optional(),
  activeIcon: z.string().optional(),
})
