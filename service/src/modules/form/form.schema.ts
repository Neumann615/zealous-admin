import { z } from 'zod'

export const createFormSchema = z.object({
  name: z.string().min(1, '表单名称不能为空'),
  description: z.string().optional().default(''),
})

export const updateFormSchema = z.object({
  id: z.number().min(1, '缺少 id'),
  name: z.string().optional(),
  description: z.string().optional(),
  schema: z.string().optional(),
  status: z.number().optional(),
})

export const deleteFormSchema = z.object({
  id: z.number().min(1, '缺少 id'),
})

export const renderFormSchema = z.object({
  formId: z.number().min(1, '缺少 formId'),
  data: z.record(z.any()).optional(),
  dataId: z.number().min(1).optional(),
})

export const formPageQuerySchema = z.object({
  keyword: z.string().optional(),
  pageNum: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(10),
})
