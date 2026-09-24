import type { APIRequestContext } from '@playwright/test'
import { BACKEND } from './helpers/config'
import { expect, settle, test } from './helpers/fixtures'

async function adminLogin(api: APIRequestContext): Promise<string> {
  const response = await api.post(`${BACKEND}/admin/login`, { data: { username: 'admin', password: 'admin123' } })
  expect(response.ok(), 'admin 登录失败').toBeTruthy()
  return ((await response.json()).data.token) as string
}

async function createMenu(api: APIRequestContext, token: string, data: Record<string, unknown>): Promise<number> {
  const response = await api.post(`${BACKEND}/menu/create`, { headers: { Authorization: `Bearer ${token}` }, data })
  expect(response.ok(), `创建菜单失败：${JSON.stringify(data)}`).toBeTruthy()
  return ((await response.json()).data.id) as number
}

async function deleteMenu(api: APIRequestContext, token: string, id: number): Promise<void> {
  const response = await api.post(`${BACKEND}/menu/delete/${id}`, { headers: { Authorization: `Bearer ${token}` } })
  expect(response.ok(), `删除菜单 ${id} 失败`).toBeTruthy()
}

test.describe('系统管理 · 数据库驱动路由', () => {
  test('用户管理：菜单配置的路由可渲染列表与弹窗', async ({ page, diag }) => {
    await page.goto('/system/admin')
    await settle(page)

    await expect(page.locator('.ant-table-row').first()).toBeVisible()
    await page.getByRole('button', { name: '添加' }).click()
    const modal = page.locator('.ant-modal').filter({ hasText: '添加用户' })
    await expect(modal).toBeVisible()
    await modal.getByRole('button', { name: /取\s*消/ }).click()
    await expect(modal).toHaveCount(0)
    await expect(diag.pageErrors).toEqual([])
  })

  test('角色管理：分配菜单弹窗展示菜单树', async ({ page, diag }) => {
    await page.goto('/system/role')
    await settle(page)

    await page.locator('.ant-table-row').first().getByRole('button', { name: '分配菜单' }).click()
    const modal = page.locator('.ant-modal').filter({ hasText: '分配菜单' })
    await expect(modal).toBeVisible()
    await expect(modal.locator('.ant-tree').first()).toBeVisible()
    await modal.getByRole('button', { name: /取\s*消/ }).click()
    await expect(modal).toHaveCount(0)
    await expect(diag.pageErrors).toEqual([])
  })

  test('菜单管理：菜单树表格可渲染，添加弹窗可开合', async ({ page, diag }) => {
    await page.goto('/system/menu')
    await settle(page)

    await expect(page.locator('.ant-table-row').first()).toBeVisible()
    await page.getByRole('button', { name: '添加导航' }).click()
    const modal = page.locator('.ant-modal').filter({ hasText: '添加菜单' })
    await expect(modal).toBeVisible()
    await expect(modal.getByText('上级菜单', { exact: true })).toBeVisible()
    await modal.getByRole('button', { name: /取\s*消/ }).click()
    await expect(modal).toHaveCount(0)
    await expect(diag.pageErrors).toEqual([])
  })

  test('菜单管理：类型标签与权限标识入库可见，按钮节点挂在页面菜单下', async ({ page, diag }) => {
    await page.goto('/system/menu')
    await settle(page)

    const userRow = page.locator('.ant-table-row').filter({ hasText: '用户管理' })
    await expect(userRow.locator('.ant-tag')).toHaveText('菜单')
    await expect(userRow).toContainText('system:user:list')
    // 组件列显示注册表 key，说明这条菜单的路由是配置驱动的
    await expect(userRow).toContainText('auth/admin')

    await userRow.locator('.ant-table-row-expand-icon').click()
    const buttonRow = page.locator('.ant-table-row').filter({ hasText: 'system:user:add' })
    await expect(buttonRow).toBeVisible()
    await expect(buttonRow.locator('.ant-tag')).toHaveText('按钮')
    await expect(diag.pageErrors).toEqual([])
  })

  test('菜单管理：添加弹窗可切节点类型，页面组件下拉来自注册表', async ({ page, diag }) => {
    await page.goto('/system/menu')
    await settle(page)

    await page.getByRole('button', { name: '添加导航' }).click()
    const modal = page.locator('.ant-modal').filter({ hasText: '添加菜单' })
    await expect(modal).toBeVisible()
    await expect(modal.getByText('节点类型')).toBeVisible()
    await expect(modal.getByText('权限标识', { exact: true })).toBeVisible()
    await expect(modal.getByText('前端名称')).toBeVisible()

    // 页面组件下拉来自主应用注入的注册表，避免手写 key 打错导致 404
    await modal.locator('.ant-form-item').filter({ hasText: '页面组件' }).locator('.ant-select').click()
    const componentOption = page.locator('.ant-select-dropdown:visible .ant-select-item-option', { hasText: 'auth/admin' }).first()
    await expect(componentOption).toBeVisible()
    // 点选项收起下拉：Escape 有可能连带关掉 Modal
    await componentOption.click()
    await expect(page.locator('.ant-select-dropdown:visible')).toHaveCount(0)

    // 切成按钮节点：路由相关字段收起，只留权限标识
    await modal.locator('.ant-radio-wrapper', { hasText: '按钮' }).click()
    await expect(modal.getByText('前端名称')).toHaveCount(0)
    await expect(modal.getByText('页面组件')).toHaveCount(0)
    await expect(modal.getByText('权限标识', { exact: true })).toBeVisible()

    await modal.getByRole('button', { name: /取\s*消/ }).click()
    await expect(modal).toHaveCount(0)
    await expect(diag.pageErrors).toEqual([])
  })

  test('隐藏菜单也生成路由：详情页不进导航但可跳转', async ({ page, diag }) => {
    await page.goto('/demo/breadcrumb/flat')
    await settle(page)

    await page.getByRole('button', { name: /跳转详情/ }).click()
    await settle(page)

    await expect(page).toHaveURL(/\/demo\/breadcrumb\/detail/)
    await expect(page.getByRole('heading', { name: '平级详情页' })).toBeVisible()
    await expect(page.getByText('当前页面不存在')).toHaveCount(0)
    await expect(diag.pageErrors).toEqual([])
  })

  test('菜单管理：权限标识来自字典下拉，同级行可拖拽排序', async ({ page, request, diag }) => {
    test.setTimeout(150_000)
    const token = await adminLogin(request)
    const stamp = Date.now()
    const parentTitle = `拖拽演示-${stamp}`
    const titleA = `甲节点-${stamp}`
    const titleB = `乙节点-${stamp}`
    const parentId = await createMenu(request, token, { title: parentTitle, name: `drag-demo-${stamp}`, type: 0, sort: 999 })
    const childA = await createMenu(request, token, { parentId, title: titleA, name: 'a', type: 1, sort: 0 })
    const childB = await createMenu(request, token, { parentId, title: titleB, name: 'b', type: 1, sort: 1 })

    try {
      await page.goto('/system/menu')
      await settle(page)

      // 权限标识下拉的选项来自服务端路由权限表，杜绝手写打错
      await page.getByRole('button', { name: '添加导航' }).click()
      const modal = page.locator('.ant-modal').filter({ hasText: '添加菜单' })
      await expect(modal).toBeVisible()
      await modal.locator('.ant-form-item').filter({ hasText: '权限标识' }).locator('.ant-select').click()
      await page.keyboard.type('system:user:add')
      await expect(page.locator('.ant-select-dropdown:visible .ant-select-item-option', { hasText: 'system:user:add' }).first()).toBeVisible()
      await page.keyboard.press('Escape')
      await modal.getByRole('button', { name: /取\s*消/ }).click()
      await expect(modal).toHaveCount(0)

      // 展开临时目录，验证同级子节点可拖拽换位
      const parentRow = page.locator('.ant-table-row').filter({ hasText: parentTitle })
      await expect(parentRow).toBeVisible()
      await parentRow.locator('.ant-table-row-expand-icon').click()

      const rowA = page.locator('.ant-table-row').filter({ hasText: titleA })
      const rowB = page.locator('.ant-table-row').filter({ hasText: titleB })
      await expect(rowA).toBeVisible()
      await expect(rowB).toBeVisible()

      const aBefore = await rowA.boundingBox()
      const bBefore = await rowB.boundingBox()
      expect(aBefore!.y).toBeLessThan(bBefore!.y)

      await page.mouse.move(aBefore!.x + 120, aBefore!.y + aBefore!.height / 2)
      await page.mouse.down()
      // 先小幅位移激活 dnd-kit 的 PointerSensor，再落到目标行
      await page.mouse.move(aBefore!.x + 140, aBefore!.y + aBefore!.height / 2 + 8, { steps: 5 })
      await page.waitForTimeout(300)
      await page.mouse.move(bBefore!.x + 120, bBefore!.y + bBefore!.height / 2, { steps: 10 })
      await page.waitForTimeout(300)
      await page.mouse.up()
      await expect(async () => {
        const aAfter = await rowA.boundingBox()
        const bAfter = await rowB.boundingBox()
        expect(bAfter!.y).toBeLessThan(aAfter!.y)
      }).toPass()

      await expect(diag.pageErrors).toEqual([])
    }
    finally {
      await deleteMenu(request, token, childB)
      await deleteMenu(request, token, childA)
      await deleteMenu(request, token, parentId)
    }
  })
})
