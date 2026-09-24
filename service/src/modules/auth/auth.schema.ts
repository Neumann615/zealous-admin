import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空'),
  captchaToken: z.string().uuid().optional(),
})

export const loginStateQuerySchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
})

export const sliderCaptchaVerifySchema = z.object({
  captchaId: z.string().uuid(),
  username: z.string().min(1, '用户名不能为空'),
  x: z.number().finite(),
  y: z.number().finite(),
  duration: z.number().int().nonnegative(),
  trail: z.array(z.tuple([z.number(), z.number()])),
})

export const updatePasswordSchema = z.object({
  oldPassword: z.string().min(1, '旧密码不能为空'),
  newPassword: z.string().min(1, '新密码不能为空'),
}).refine(data => data.oldPassword !== data.newPassword, {
  message: '新密码不能与旧密码相同',
})
