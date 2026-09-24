import type { APIRequestContext } from '@playwright/test'
import { BACKEND } from './helpers/config'
import { expect, settle, test } from './helpers/fixtures'

async function adminLogin(api: APIRequestContext): Promise<string> {
  const response = await api.post(`${BACKEND}/admin/login`, { data: { username: 'admin', password: 'admin123' } })
  expect(response.ok(), 'admin 登录失败').toBeTruthy()
  return ((await response.json()).data.token) as string
}

async function apiPost(api: APIRequestContext, token: string, path: string, data?: unknown) {
  const response = await api.post(`${BACKEND}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: data ?? {},
  })
  expect(response.ok(), `POST ${path} 失败`).toBeTruthy()
  return (await response.json()).data
}

async function apiDelete(api: APIRequestContext, token: string, path: string) {
  const response = await api.post(`${BACKEND}${path}`, { headers: { Authorization: `Bearer ${token}` } })
  expect(response.ok(), `POST ${path} 失败`).toBeTruthy()
}

test.describe('元数据管理', () => {
  test('编码集与编码项闭环：新增、批量导入、父级清空、行内启停、编辑与删除', async ({ page, request, diag }) => {
    test.setTimeout(180_000)
    const token = await adminLogin(request)
    const stamp = Date.now()
    const setCode = `e2e_sex_${stamp}`
    const setName = `E2E 性别-${stamp}`

    try {
      await page.goto('/metadata')
      await settle(page)

      // 新增编码集
      await page.getByRole('button', { name: /新\s*增\s*编\s*码\s*集/ }).click()
      const setModal = page.locator('.ant-modal').filter({ hasText: /新增编码集/ })
      await expect(setModal).toBeVisible()
      await setModal.getByLabel('编码').fill(setCode)
      await setModal.getByLabel('名称').fill(setName)
      await setModal.getByRole('button', { name: /确\s*定/ }).click()
      await expect(setModal).toHaveCount(0)

      await page.getByPlaceholder('搜索编码或名称').fill(setCode)
      const setRow = page.locator('.ant-table-row').filter({ hasText: setName })
      await expect(setRow).toBeVisible()
      await setRow.click()

      // 新增一级编码项
      await page.getByRole('button', { name: /新\s*增\s*编\s*码\s*项/ }).click()
      const itemModal = page.locator('.ant-modal').filter({ hasText: /(?:新增|编辑)编码项/ })
      await expect(itemModal).toBeVisible()
      await itemModal.getByLabel('编码', { exact: true }).fill('male')
      await itemModal.getByLabel('名称', { exact: true }).fill('男')
      await itemModal.getByRole('button', { name: /确\s*定/ }).click()
      await expect(itemModal).toHaveCount(0)
      const maleRow = page.locator('.ant-table-row').filter({ has: page.getByText('male', { exact: true }) })
      await expect(maleRow).toBeVisible()

      // 挂子项，再编辑清空父级移回根级
      await maleRow.getByRole('button', { name: /新\s*增\s*子\s*项/ }).click()
      await expect(itemModal).toBeVisible()
      await itemModal.getByLabel('编码', { exact: true }).fill('male_extra')
      await itemModal.getByLabel('名称', { exact: true }).fill('衍生男')
      await itemModal.getByRole('button', { name: /确\s*定/ }).click()
      await expect(itemModal).toHaveCount(0)
      const childRow = page.locator('.ant-table-row').filter({ hasText: 'male_extra' })
      await expect(childRow).toBeVisible()

      await childRow.getByRole('button', { name: /^编\s*辑$/ }).click()
      await expect(itemModal).toBeVisible()
      await itemModal.locator('.ant-select-clear').click()
      await itemModal.getByRole('button', { name: /确\s*定/ }).click()
      await expect(itemModal).toHaveCount(0)
      // 清空父级后应出现在根级列表
      await expect(page.locator('.ant-table-row').filter({ hasText: 'male_extra' })).toBeVisible()

      // 批量导入：两行，其中一行带简称
      await page.getByRole('button', { name: /批\s*量\s*导\s*入/ }).click()
      const batchModal = page.locator('.ant-modal').filter({ hasText: /批量导入编码项/ })
      await expect(batchModal).toBeVisible()
      await batchModal.locator('textarea').fill('female,女\nunknown,未知,其他')
      await batchModal.getByRole('button', { name: /导\s*入/ }).click()
      await expect(batchModal).toHaveCount(0)
      await expect(page.locator('.ant-table-row').filter({ hasText: 'female' })).toBeVisible()
      await expect(page.locator('.ant-table-row').filter({ hasText: 'unknown' })).toBeVisible()
      await expect(page.getByText(/已导入 2 条编码项/)).toBeVisible()

      // 行内启停：female 开关关闭后不再显示为启用色
      const femaleRow = page.locator('.ant-table-row').filter({ hasText: 'female' })
      await femaleRow.locator('.ant-switch').click()
      await expect(femaleRow.locator('.ant-switch')).not.toHaveClass(/ant-switch-checked/)

      // 删除整个编码集（连带全部编码项）
      await setRow.getByRole('button', { name: /删\s*除/ }).click()
      const confirm = page.locator('.ant-modal').filter({ hasText: /删除编码集/ })
      await expect(confirm).toBeVisible()
      await confirm.getByRole('button', { name: /确\s*定/ }).click()
      await expect(confirm).toHaveCount(0)
      await expect(setRow).toHaveCount(0)

      // 409 拦截会以未处理拒绝的形式进入 pageErrors，属本用例的预期路径
      await expect(diag.pageErrors.filter(error => !error.includes('409'))).toEqual([])
    }
    finally {
      // 兜底清理：用例中途失败时移除临时编码集
      const search = await request.get(`${BACKEND}/metadata/sets/page`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { keyword: setCode, pageNum: 1, pageSize: 10 },
      })
      if (search.ok()) {
        const rows = ((await search.json()).data.list) as Array<{ id: number }>
        for (const row of rows)
          await apiDelete(request, token, `/metadata/sets/${row.id}/delete`)
      }
    }
  })

  test('被表单引用的编码集删除被拦截：提示表单名并保持数据', async ({ page, request, diag }) => {
    test.setTimeout(150_000)
    const token = await adminLogin(request)
    const stamp = Date.now()
    const setCode = `e2e_ref_${stamp}`
    const formName = `引用保护表单-${stamp}`
    const set = await apiPost(request, token, '/metadata/sets/add', { code: setCode, name: `引用集-${stamp}`, status: 1 })
    const form = await apiPost(request, token, '/form/create', { name: formName, description: '引用保护 E2E' })
    await apiPost(request, token, '/form/update', {
      id: form.id,
      lockVersion: 0,
      schema: JSON.stringify({ version: 1, children: [{ id: 'field', type: 'select', props: { setCode } }] }),
    })

    try {
      await page.goto(`/metadata`)
      await settle(page)
      await page.getByPlaceholder('搜索编码或名称').fill(setCode)
      await page.keyboard.press('Enter')
      const setRow = page.locator('.ant-table-row').filter({ hasText: setCode })
      await expect(setRow).toBeVisible()

      await setRow.getByRole('button', { name: /删\s*除/ }).click()
      const confirm = page.locator('.ant-modal').filter({ hasText: /删除编码集/ })
      await expect(confirm).toBeVisible()
      await confirm.getByRole('button', { name: /确\s*定/ }).click()
      await expect(page.locator('.ant-message')).toContainText(formName)
      await expect(page.locator('.ant-message')).toContainText('仍引用该编码集')
      await expect(setRow).toBeVisible()

      await expect(diag.pageErrors.filter(error => !error.includes('409'))).toEqual([])
    }
    finally {
      await apiPost(request, token, '/form/delete', { id: form.id })
      await apiDelete(request, token, `/metadata/sets/${set.id}/delete`)
    }
  })
})
