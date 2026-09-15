import { Router } from 'express'
import { getDb } from '../db'
import { toCamelCase, toCamelCaseList } from '../lib/camel'
import { now } from '../lib/date'
import { failed, success } from '../lib/response'
import { authMiddleware } from '../middleware/auth'

const router = Router()
const db = getDb()

// 列表字段 + 已收集数据条数（相关子查询）
const LIST_COLUMNS = 'id, name, description, status, version, create_time, update_time'
const DATA_COUNT = '(SELECT COUNT(*) FROM za_form_data d WHERE d.form_id = za_form.id) AS data_count'

router.use(authMiddleware)

router.get('/form/list', (req, res) => {
  try {
    const keyword = (req.query.keyword as string) || ''
    const pageSize = Number(req.query.pageSize) || 10
    const pageNum = Number(req.query.pageNum) || 1
    const offset = (pageNum - 1) * pageSize

    let total: number
    let list: any[]
    if (keyword) {
      const like = `%${keyword}%`
      total = (db.prepare('SELECT COUNT(*) AS count FROM za_form WHERE name LIKE ?').get(like) as any).count
      list = toCamelCaseList(db.prepare(
        `SELECT ${LIST_COLUMNS}, ${DATA_COUNT} FROM za_form WHERE name LIKE ? ORDER BY update_time DESC LIMIT ? OFFSET ?`,
      ).all(like, pageSize, offset) as any[])
    }
    else {
      total = (db.prepare('SELECT COUNT(*) AS count FROM za_form').get() as any).count
      list = toCamelCaseList(db.prepare(
        `SELECT ${LIST_COLUMNS}, ${DATA_COUNT} FROM za_form ORDER BY update_time DESC LIMIT ? OFFSET ?`,
      ).all(pageSize, offset) as any[])
    }
    res.json(success({ list, total, pageSize, pageNum }))
  }
  catch (e: any) {
    res.json(failed(e.message || '获取表单列表失败'))
  }
})

router.get('/form/detail', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM za_form WHERE id = ?').get(Number(req.query.id)) as any
    if (!row) {
      res.json(failed('表单不存在'))
      return
    }
    res.json(success(toCamelCase(row)))
  }
  catch (e: any) {
    res.json(failed(e.message || '获取表单详情失败'))
  }
})

router.post('/form/create', (req, res) => {
  try {
    const { name, description } = req.body
    if (!name) {
      res.json(failed('表单名称不能为空'))
      return
    }
    const nowStr = now()
    const result = db.prepare(
      'INSERT INTO za_form (name, description, schema, status, version, create_time, update_time) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(name, description || '', '', 0, 1, nowStr, nowStr)
    res.json(success({ id: Number(result.lastInsertRowid) }, '创建成功'))
  }
  catch (e: any) {
    res.json(failed(e.message || '创建表单失败'))
  }
})

router.post('/form/update', (req, res) => {
  try {
    const { id, name, description, schema, status } = req.body
    if (!id) {
      res.json(failed('缺少 id'))
      return
    }
    const existing = db.prepare('SELECT id, version FROM za_form WHERE id = ?').get(id) as any
    if (!existing) {
      res.json(failed('表单不存在'))
      return
    }
    // schema 变化时版本号 +1
    const versionBump = schema !== undefined ? 1 : 0
    db.prepare(
      `UPDATE za_form SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        schema = COALESCE(?, schema),
        status = COALESCE(?, status),
        version = version + ?,
        update_time = ?
      WHERE id = ?`,
    ).run(name ?? null, description ?? null, schema ?? null, status ?? null, versionBump, now(), id)
    res.json(success(null, '更新成功'))
  }
  catch (e: any) {
    res.json(failed(e.message || '更新表单失败'))
  }
})

router.post('/form/delete', (req, res) => {
  try {
    const { id } = req.body
    if (!id) {
      res.json(failed('缺少 id'))
      return
    }
    // 级联清理该表单已收集的填写数据
    db.prepare('DELETE FROM za_form_data WHERE form_id = ?').run(id)
    db.prepare('DELETE FROM za_form WHERE id = ?').run(id)
    res.json(success(null, '删除成功'))
  }
  catch (e: any) {
    res.json(failed(e.message || '删除表单失败'))
  }
})

export default router
