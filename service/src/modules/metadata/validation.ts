import { z } from 'zod'

export const positiveIdSchema = z.coerce.number().int().positive()

export const statusSchema = z.union([z.literal(0), z.literal(1)])

export const metadataSetCreateSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string().optional(),
  status: statusSchema.optional(),
})

export const metadataSetUpdateSchema = metadataSetCreateSchema.partial()

export const metadataSetStatusSchema = z.object({ status: statusSchema })

export const metadataSetPageSchema = z.object({
  keyword: z.string().optional(),
  status: z.coerce.number().pipe(statusSchema).optional(),
  pageNum: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
})

export const metadataItemCreateSchema = z.object({
  setCode: z.string().trim().min(1),
  parentId: positiveIdSchema.optional(),
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  shortName: z.string().optional(),
  description: z.string().optional(),
  sortOrder: z.number().int().min(0).optional(),
  status: statusSchema.optional(),
})

export const metadataItemUpdateSchema = metadataItemCreateSchema.omit({ setCode: true }).partial()

export const metadataItemStatusSchema = z.object({ status: statusSchema })

export const metadataItemBatchSchema = z.object({
  setCode: z.string().trim().min(1),
  items: z.array(metadataItemCreateSchema.omit({ setCode: true })).min(1),
})
