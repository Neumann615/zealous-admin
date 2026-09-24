import { z } from 'zod'

export const createFormSchema = z.object({
  name: z.string().min(1, '表单名称不能为空'),
  description: z.string().optional().default(''),
  schema: z.string().optional(),
})

export const updateFormSchema = z.object({
  id: z.number().min(1, '缺少 id'),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  schema: z.string().optional(),
  lockVersion: z.number().int().min(0).optional(),
})

export const formIdSchema = z.object({
  id: z.coerce.number().min(1, '缺少 id'),
})

export const formDetailQuerySchema = formIdSchema.extend({
  versionId: z.coerce.number().min(1).optional(),
})

export const deleteFormSchema = formIdSchema

export const renderFormSchema = z.object({
  formId: z.number().min(1, '缺少 formId'),
  data: z.record(z.any()).optional(),
  dataId: z.number().min(1).optional(),
  versionId: z.number().min(1).optional(),
  allowDraft: z.boolean().optional().default(false),
})

export const formPageQuerySchema = z.object({
  keyword: z.string().optional(),
  status: z.coerce.number().int().refine(value => [0, 1, 2].includes(value), '表单状态不正确').optional(),
  pageNum: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(10),
})
