import { Buffer } from 'node:buffer'
import { beforeAll, describe, expect, it } from 'vitest'

process.env.DB_PATH = ':memory:'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'captcha-test-secret'

const { initDb } = await import('../../db')
const { BadRequestError } = await import('../../lib/errors')
const { consumeCaptchaToken, createSliderCaptcha, verifySliderCaptcha } = await import('./captcha')

beforeAll(() => {
  initDb()
})

function answerOf(challenge: { bgUrl: string }): number {
  const svg = Buffer.from(challenge.bgUrl.split(',')[1], 'base64').toString('utf8')
  const holeLeft = Number(/<path d="M (\d+)/.exec(svg)?.[1])
  expect(Number.isFinite(holeLeft)).toBe(true)
  return holeLeft - 8
}

describe('服务端滑块验证码', () => {
  it('位置、时长与轨迹校验通过后发放一次性 token', () => {
    const challenge = createSliderCaptcha()
    const context = { username: `captcha_${Date.now()}`, ip: '127.0.0.1' }
    const token = verifySliderCaptcha({
      captchaId: challenge.captchaId,
      x: answerOf(challenge),
      y: 0,
      duration: 320,
      trail: [[0, 0], [20, 1], [answerOf(challenge), 0]],
    }, context)

    expect(consumeCaptchaToken(token, { ...context, username: 'another-user' })).toBe(false)
    expect(consumeCaptchaToken(token, context)).toBe(true)
    expect(consumeCaptchaToken(token, context)).toBe(false)
  })

  it('同一挑战只能验证一次，失败后必须重新获取', () => {
    const challenge = createSliderCaptcha()
    const input = {
      captchaId: challenge.captchaId,
      y: 0,
      duration: 320,
      trail: [[0, 0], [1, 0]] as Array<[number, number]>,
    }

    expect(() => verifySliderCaptcha({ ...input, x: -1 }))
      .toThrow(BadRequestError)
    expect(() => verifySliderCaptcha({ ...input, x: answerOf(challenge) }))
      .toThrow(BadRequestError)
  })
})
