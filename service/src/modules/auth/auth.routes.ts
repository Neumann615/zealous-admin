import { Router } from 'express'
import { asyncHandler } from '../../middleware/error'
import { authMiddleware } from '../../middleware/auth'
import { validate } from '../../middleware/validate'
import { success } from '../../lib/response'
import { login, getUserInfo, refreshToken, updatePassword } from './auth.service'
import { loginSchema, updatePasswordSchema } from './auth.schema'

const router = Router()

router.post('/admin/login', validate(loginSchema), asyncHandler(async (req, res) => {
  const { username, password } = req.body
  const result = await login(username, password)
  res.json(success(result, '登录成功'))
}))

router.use('/admin', authMiddleware)

router.get('/admin/refreshToken', asyncHandler(async (req, res) => {
  const result = await refreshToken(req.username!)
  res.json(success(result))
}))

router.get('/admin/info', asyncHandler(async (req, res) => {
  const info = getUserInfo(req.username!)
  res.json(success(info))
}))

router.post('/admin/logout', (_req, res) => {
  res.json(success(null, '登出成功'))
})

router.post('/admin/updatePassword', validate(updatePasswordSchema), asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body
  await updatePassword(req.username!, oldPassword, newPassword)
  res.json(success(null, '密码修改成功'))
}))

export default router
