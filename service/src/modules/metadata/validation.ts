import { z } from 'zod'

export const positiveIdSchema = z.coerce.number().int().positive()

export const statusSchema = z.union([z.literal(0), z.literal(1)])

/** 编码集代码：字母开头，会进入 URL 与表单契约 key */
export const setCodeSchema = z.string().trim().min(1).max(64).regex(/^[a-z]\w*$/i, '编码集代码仅允许字母、数字与下划线，且以字母开头')

/** 编码项代码：允许数字开头（如行政区划 110000） */
export const itemCodeSchema = z.string().trim().min(1).max(80).regex(/^[a-z0-9][\w-]*$/i, '编码项代码仅允许字母、数字、中划线与下划线')

export const metadataIdParamSchema = z.object({ id: positiveIdSchema })

export const metadataSetCreateSchema = z.object({
  code: setCodeSchema,
  name: z.string().trim().min(1).max(50),
  description: z.string().max(200).nullish(),
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
  setCode: setCodeSchema,
  parentId: positiveIdSchema.nullable().optional(),
  code: itemCodeSchema,
  name: z.string().trim().min(1).max(80),
  shortName: z.string().max(40).nullish(),
  description: z.string().max(200).nullish(),
  sortOrder: z.number().int().min(0).optional(),
  status: statusSchema.optional(),
})

export const metadataItemUpdateSchema = metadataItemCreateSchema.omit({ setCode: true }).partial()

export const metadataItemStatusSchema = z.object({ status: statusSchema })

export const metadataItemBatchSchema = z.object({
  setCode: setCodeSchema,
  items: z.array(metadataItemCreateSchema.omit({ setCode: true })).min(1),
})