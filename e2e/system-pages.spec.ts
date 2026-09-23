import { expect, settle, test } from './helpers/fixtures'

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
})