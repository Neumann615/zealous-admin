import { z } from 'zod'

export const submitFormDataSchema = z.object({
  formId: z.number().min(1, '缺少 formId'),
  data: z.record(z.any()).refine(val => !Array.isArray(val), '提交数据格式不正确'),
})

export const updateStatusSchema = z.object({
  id: z.number().min(1, '缺少 id'),
  status: z.number().optional().default(1),
})

export const deleteFormDataSchema = z.object({
  id: z.number().min(1, '缺少 id'),
})

export const formDataDetailQuerySchema = z.object({
  id: z.coerce.number().min(1, '缺少 id'),
})

export const formDataPageQuerySchema = z.object({
  formId: z.coerce.number().min(1, '缺少 formId'),
  versionId: z.coerce.number().min(1).optional(),
  submitter: z.string().optional(),
  status: z.union([z.string(), z.coerce.number()]).optional(),
  pageNum: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(10),
})
