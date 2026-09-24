import { BACKEND } from './helpers/config'
import { expect, settle, test } from './helpers/fixtures'

const transparentImage = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
const username = 'test'

test.describe('登录安全', () => {
  test('连续失败触发服务端滑块验证码，缺失凭据被 428 且登录页会携带一次性凭据', async ({ page, request }) => {
    test.setTimeout(120_000)

    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        const response = await request.post(`${BACKEND}/admin/login`, {
          data: { username, password: 'wrong-password' },
        })
        expect(response.status()).toBe(401)
      }

      const stateResponse = await request.get(`${BACKEND}/admin/login/state`, {
        params: { username },
      })
      expect(await stateResponse.json()).toMatchObject({ data: { captchaRequired: true } })

      const blockedResponse = await request.post(`${BACKEND}/admin/login`, {
        data: { username, password: 'wrong-password' },
      })
      expect(blockedResponse.status()).toBe(428)
      expect(await blockedResponse.json()).toMatchObject({ code: 428, message: '请先完成滑块验证码' })

      let loginPayload: Record<string, unknown> | undefined
      await page.route('**/admin/captcha**', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            json: { code: 200, message: '操作成功', data: { captchaId: 'e2e-captcha-id', bgUrl: transparentImage, puzzleUrl: transparentImage } },
          })
          return
        }

        await route.fulfill({
          json: { code: 200, message: '操作成功', data: { captchaToken: 'e2e-captcha-token' } },
        })
      })
      await page.route('**/admin/login', async (route) => {
        loginPayload = route.request().postDataJSON()
        await route.fulfill({
          status: 500,
          json: { code: 500, message: '模拟登录失败', data: null },
        })
      })

      await page.goto('/login')
      await settle(page)
      await page.getByLabel('用户名').fill(username)
      await page.getByLabel('密码').fill('wrong-password')
      await page.getByRole('button', { name: /登\s*录/ }).click()

      const sliderButton = page.locator('.rc-slider-captcha-control-button')
      await expect(sliderButton).toBeVisible()
      const box = await sliderButton.boundingBox()
      expect(box).toBeTruthy()

      await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
      await page.mouse.down()
      await page.mouse.move(box!.x + 180, box!.y + box!.height / 2, { steps: 8 })
      await page.waitForTimeout(200)
      await page.mouse.up()
      await expect(page.locator('.rc-slider-captcha-button-success')).toBeVisible()

      await page.getByRole('button', { name: /登\s*录/ }).click()
      await expect.poll(() => loginPayload).toBeTruthy()
      expect(loginPayload).toMatchObject({ username, captchaToken: 'e2e-captcha-token' })
    }
    finally {
      const { DatabaseSync } = await import('node:sqlite')
      const db = new DatabaseSync('service/data/sqlite.db')
      db.prepare('DELETE FROM za_login_throttle').run()
      db.close()
    }
  })
})
