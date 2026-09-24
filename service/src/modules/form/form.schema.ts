import { z } from 'zod'

export const createFormSchema = z.object({
  name: z.string().min(1, '表单名称不能为空'),
  description: z.string().optional().default(''),
  categoryId: z.number().min(1).nullable().optional(),
  schema: z.string().optional(),
})

export const updateFormSchema = z.object({
  id: z.number().min(1, '缺少 id'),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  categoryId: z.number().min(1).nullable().optional(),
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
  categoryId: z.coerce.number().min(1).optional(),
  pageNum: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(10),
})

export const createFormCategorySchema = z.object({
  parentId: z.number().min(1).nullable().optional(),
  name: z.string().min(1, '分类名称不能为空').max(64, '分类名称不能超过 64 个字符'),
  sortOrder: z.number().int().min(0).optional().default(0),
})

export const updateFormCategorySchema = z.object({
  parentId: z.number().min(1).nullable().optional(),
  name: z.string().min(1, '分类名称不能为空').max(64, '分类名称不能超过 64 个字符').optional(),
  sortOrder: z.number().int().min(0).optional(),
})

export const formCategoryStatusSchema = z.object({
  id: z.number().min(1, '缺少 id'),
  status: z.number().int().refine(value => [0, 1].includes(value), '分类状态不正确'),
})
