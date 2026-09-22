import { z } from 'zod'

export const createDictTypeSchema = z.object({
  name: z.string().min(1, '字典名称不能为空'),
  dictType: z.string().min(1, '字典类型不能为空'),
  status: z.number().optional().default(1),
  remark: z.string().optional(),
})

export const updateDictTypeSchema = z.object({
  name: z.string().optional(),
  dictType: z.string().optional(),
  status: z.number().optional(),
  remark: z.string().optional(),
})

export const createDictDataSchema = z.object({
  dictType: z.string().min(1, '字典类型不能为空'),
  dictLabel: z.string().min(1, '字典标签不能为空'),
  dictValue: z.string().min(1, '字典值不能为空'),
  dictSort: z.number().optional().default(0),
  status: z.number().optional().default(1),
  remark: z.string().optional(),
  cssClass: z.string().optional(),
  listClass: z.string().optional(),
})

export const updateDictDataSchema = z.object({
  dictType: z.string().optional(),
  dictLabel: z.string().optional(),
  dictValue: z.string().optional(),
  dictSort: z.number().optional(),
  status: z.number().optional(),
  remark: z.string().optional(),
  cssClass: z.string().optional(),
  listClass: z.string().optional(),
})

export const dictPageQuerySchema = z.object({
  keyword: z.string().optional(),
  pageNum: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(5),
})

export const dictDataPageQuerySchema = z.object({
  dictType: z.string().optional(),
  pageNum: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(5),
})
