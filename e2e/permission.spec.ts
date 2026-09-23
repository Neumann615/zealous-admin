import type { APIRequestContext, Page } from '@playwright/test'
import { BACKEND, FRONTEND } from './helpers/config'
import { expect, settle, test, waitBootLoaderGone } from './helpers/fixtures'

/** 种子账号：test / 演示测试员（role id = 2），非超管，用来验证权限收敛 */
const LIMITED_USER = { username: 'test', password: 'test123' }
const LIMITED_ROLE_ID = 2

interface MenuRow {
  id: number
  path: string | null
  type: number
  permission: string | null
}

async function login(api: APIRequestContext, username: string, password: string): Promise<string> {
  const response = await api.post(`${BACKEND}/admin/login`, { data: { username, password } })
  expect(response.ok(), `${username} 登录失败`).toBeTruthy()
  const body = await response.json()
  return body.data.token as string
}

async function assignMenus(api: APIRequestContext, token: string, menuIds: number[]): Promise<void> {
  const response = await api.post(
    `${BACKEND}/role/menu/update`,
    { headers: { Authorization: `Bearer ${token}` }, params: { roleId: LIMITED_ROLE_ID, menuIds: menuIds.join(',') } },
  )
  expect(response.ok(), '分配菜单失败').toBeTruthy()
}

test.describe('权限模块 · 服务端强制 + 按钮级隐藏', () => {
  test('受限角色只能查询：写接口 403、未授权模块 403、操作按钮不渲染', async ({ browser, page, request }) => {
    test.setTimeout(240_000)

    const adminToken = await login(request, 'admin', 'admin123')
    const adminHeaders = { Authorization: `Bearer ${adminToken}` }

    const menuResponse = await request.get(`${BACKEND}/menu/all`, { headers: adminHeaders })
    const menus = (await menuResponse.json()).data as MenuRow[]
    const systemDir = menus.find(menu => menu.path === '/system')
    const userMenu = menus.find(menu => menu.path === '/system/admin')
    expect(systemDir, '缺少 /system 目录菜单').toBeTruthy()
    expect(userMenu?.permission, '用户管理菜单应带 system:user:list').toBe('system:user:list')

    // 记录并在用例结束后还原，避免污染其它用例
    const originalResponse = await request.get(`${BACKEND}/role/menu/${LIMITED_ROLE_ID}`, { headers: adminHeaders })
    const originalIds = ((await originalResponse.json()).data as MenuRow[]).map(menu => menu.id)
    expect(originalIds.length).toBeGreaterThan(0)

    // 先用超管确认选择器确实能命中，否则后面的「按钮不存在」是空断言
    await page.goto('/system/admin')
    await settle(page)
    await expect(page.getByRole('button', { name: /添\s*加/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /编\s*辑/ }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /删\s*除/ }).first()).toBeVisible()

    try {
      // 只给「通用」目录 + 用户管理菜单，按钮节点一个不给
      await assignMenus(request, adminToken, [systemDir!.id, userMenu!.id])

      const token = await login(request, LIMITED_USER.username, LIMITED_USER.password)
      const headers = { Authorization: `Bearer ${token}` }

      const info = (await (await request.get(`${BACKEND}/admin/info`, { headers })).json()).data
      expect(info.permissions).toEqual(['system:user:list'])
      expect(info.menus.some((menu: MenuRow) => menu.type === 2), '按钮节点不应下发到菜单里').toBe(false)
      // 后端按 sort 排序，这里只关心集合
      expect([...info.menus.map((menu: MenuRow) => menu.path)].sort()).toEqual(['/system', '/system/admin'])

      // 有权：查询用户列表
      const list = await request.get(`${BACKEND}/admin/list`, { headers, params: { pageNum: 1, pageSize: 10 } })
      expect(list.status()).toBe(200)

      // 无权：删除用户 / 越权访问监控模块
      const denied = await request.post(`${BACKEND}/admin/delete/999999`, { headers })
      expect(denied.status()).toBe(403)
      expect((await denied.json()).code).toBe(403)
      expect((await request.get(`${BACKEND}/monitor/logs`, { headers, params: { pageNum: 1, pageSize: 10 } })).status()).toBe(403)
      expect((await request.get(`${BACKEND}/menu/tree`, { headers })).status()).toBe(403)

      // 会话接口不受权限表影响，否则受限用户登录后会被踢出
      expect((await request.get(`${BACKEND}/admin/refreshToken`, { headers })).status()).toBe(200)

      const context = await browser.newContext({
        baseURL: FRONTEND,
        viewport: { width: 1600, height: 1000 },
        locale: 'zh-CN',
        timezoneId: 'Asia/Shanghai',
      })
      const limited: Page = await context.newPage()
      try {
        await limited.goto('/login')
        await limited.getByLabel('用户名').fill(LIMITED_USER.username)
        await limited.getByLabel('密码').fill(LIMITED_USER.password)
        await limited.getByRole('button', { name: /登\s*录/ }).click()
        await limited.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 60_000 })
        await waitBootLoaderGone(limited)

        await limited.goto('/system/admin')
        await waitBootLoaderGone(limited)
        await settle(limited)

        // 未授权模块不进导航，已授权的菜单正常渲染
        await expect(limited.getByText('监控中心')).toHaveCount(0)
        await expect(limited.getByText('用户管理').first()).toBeVisible()

        await expect(limited.locator('.ant-table-row').first()).toBeVisible()
        // antd 会给两个汉字的按钮插空格（「查 询」），选择器统一用空格容错的正则
        await expect(limited.getByRole('button', { name: /添\s*加/ })).toHaveCount(0)
        await expect(limited.getByRole('button', { name: /编\s*辑/ })).toHaveCount(0)
        await expect(limited.getByRole('button', { name: /删\s*除/ })).toHaveCount(0)
        await expect(limited.getByRole('button', { name: /分\s*配\s*角\s*色/ })).toHaveCount(0)
        // 查询入口保留：只读用户仍能刷新列表；状态开关降级为只读
        await expect(limited.getByRole('button', { name: /查\s*询/ })).toBeVisible()
        await expect(limited.locator('.ant-switch').first()).toBeDisabled()

        // 手动敲未授权路由 → 路由表里没有这条，落 404 而不是白屏
        await limited.goto('/monitor/workbench')
        await waitBootLoaderGone(limited)
        await expect(limited.getByText('当前页面不存在')).toBeVisible()
      }
      finally {
        await context.close()
      }
    }
    finally {
      await assignMenus(request, adminToken, originalIds)
    }
  })
})
