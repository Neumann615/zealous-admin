import { z } from 'zod'

export const formFileObjectSchema = z.object({
  objectId: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/, '文件不存在'),
})
