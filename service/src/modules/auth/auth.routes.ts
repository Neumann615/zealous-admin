import { Router } from 'express'
import { PreconditionRequiredError } from '../../lib/errors'
import { success } from '../../lib/response'
import { authMiddleware } from '../../middleware/auth'
import { asyncHandler } from '../../middleware/error'
import { validate } from '../../middleware/validate'
import { loginSchema, loginStateQuerySchema, sliderCaptchaVerifySchema, updatePasswordSchema } from './auth.schema'
import { getUserInfo, login, refreshToken, updatePassword } from './auth.service'
import { consumeCaptchaToken, createSliderCaptcha, verifySliderCaptcha } from './captcha'
import { assertLoginAllowed, clearLoginFailures, isLoginCaptchaRequired, recordLoginFailure } from './login-guard'
import { revokeToken } from './session'

const router = Router()

router.get('/admin/login/state', validate(loginStateQuerySchema, 'query'), (req, res) => {
  res.json(success({
    captchaRequired: isLoginCaptchaRequired(req.query.username as string, req.ip ?? 'unknown'),
  }))
})

router.get('/admin/captcha', (_req, res) => {
  res.json(success(createSliderCaptcha()))
})

router.post('/admin/captcha/verify', validate(sliderCaptchaVerifySchema), (req, res) => {
  const { username, ...verifyInput } = req.body
  res.json(success({
    captchaToken: verifySliderCaptcha(verifyInput, { username, ip: req.ip ?? 'unknown' }),
  }))
})

router.post('/admin/login', validate(loginSchema), asyncHandler(async (req, res) => {
  const { username, password } = req.body
  const ip = req.ip ?? 'unknown'
  assertLoginAllowed(username, ip)

  if (isLoginCaptchaRequired(username, ip) && !consumeCaptchaToken(req.body.captchaToken, { username, ip })) {
    recordLoginFailure(username, ip)
    throw new PreconditionRequiredError('请先完成滑块验证码')
  }

  let result
  try {
    result = await login(username, password)
  }
  catch (error) {
    if ((error as Error).name === 'UnauthorizedError')
      recordLoginFailure(username, ip)
    throw error
  }

  clearLoginFailures(username, ip)
  res.json(success(result, '登录成功'))
}))

router.use('/admin', authMiddleware)

router.get('/admin/refreshToken', asyncHandler(async (req, res) => {
  const result = await refreshToken(req.adminId!)
  res.json(success(result))
}))

router.get('/admin/info', asyncHandler(async (req, res) => {
  const info = getUserInfo(req.username!)
  res.json(success(info))
}))

router.post('/admin/logout', (req, res) => {
  if (req.tokenJti)
    revokeToken(req.tokenJti, req.tokenExpMs ?? Date.now() + 2 * 60 * 60 * 1000)
  res.json(success(null, '登出成功'))
})

router.post('/admin/updatePassword', validate(updatePasswordSchema), asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body
  await updatePassword(req.username!, oldPassword, newPassword)
  res.json(success(null, '密码修改成功'))
}))

export default router
