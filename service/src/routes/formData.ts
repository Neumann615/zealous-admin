import { Router } from 'express'
import { getDb } from '../db'
import { toCamelCase, toCamelCaseList } from '../lib/camel'
import { now } from '../lib/date'
import { failed, success } from '../lib/response'
import { authMiddleware } from '../middleware/auth'

const router = Router()
const db = getDb()

router.use(authMiddleware)

// 提交表单填写数据：整份 values 以 JSON 落库，附带提交时的表单版本与提交人
router.post('/form/data/submit', (req, res) => {
  try {
    const { formId, data } = req.body
    if (!formId) {
      res.json(failed('缺少 formId'))
      return
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      res.json(failed('提交数据格式不正确'))
      return
    }
    const form = db.prepare('SELECT id, version FROM za_form WHERE id = ?').get(Number(formId)) as any
    if (!form) {
      res.json(failed('表单不存在'))
      return
    }
    const result = db.prepare(
      'INSERT INTO za_form_data (form_id, form_version, submitter, status, data, create_time) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(form.id, form.version ?? 1, req.username || '', 1, JSON.stringify(data), now())
    res.json(success({ id: Number(result.lastInsertRowid) }, '提交成功'))
  }
  catch (e: any) {
    res.json(failed(e.message || '提交表单数据失败'))
  }
})

// 分页查询某个表单的填写数据
router.get('/form/data/list', (req, res) => {
  try {
    const formId = Number(req.query.formId)
    if (!formId) {
      res.json(failed('缺少 formId'))
      return
    }
    const pageSize = Number(req.query.pageSize) || 10
    const pageNum = Number(req.query.pageNum) || 1
    const offset = (pageNum - 1) * pageSize

    const where = ['form_id = ?']
    const args: any[] = [formId]
    const submitter = (req.query.submitter as string) || ''
    if (submitter) {
      where.push('submitter LIKE ?')
      args.push(`%${submitter}%`)
    }
    if (req.query.status !== undefined && req.query.status !== '') {
      where.push('status = ?')
      args.push(Number(req.query.status))
    }
    const whereSql = where.join(' AND ')

    const total = (db.prepare(`SELECT COUNT(*) AS count FROM za_form_data WHERE ${whereSql}`).get(...args) as any).count
    const list = toCamelCaseList(db.prepare(
      `SELECT id, form_id, form_version, submitter, status, data, create_time
       FROM za_form_data WHERE ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
    ).all(...args, pageSize, offset) as any[])
    res.json(success({ list, total, pageSize, pageNum }))
  }
  catch (e: any) {
    res.json(failed(e.message || '获取表单数据失败'))
  }
})

router.get('/form/data/detail', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM za_form_data WHERE id = ?').get(Number(req.query.id)) as any
    if (!row) {
      res.json(failed('数据不存在'))
      return
    }
    res.json(success(toCamelCase(row)))
  }
  catch (e: any) {
    res.json(failed(e.message || '获取表单数据详情失败'))
  }
})

// 作废 / 恢复（status: 1 有效，0 已作废）
router.post('/form/data/updateStatus', (req, res) => {
  try {
    const { id, status } = req.body
    if (!id) {
      res.json(failed('缺少 id'))
      return
    }
    const next = Number(status) === 0 ? 0 : 1
    const result = db.prepare('UPDATE za_form_data SET status = ? WHERE id = ?').run(next, id)
    if (!result.changes) {
      res.json(failed('数据不存在'))
      return
    }
    res.json(success(null, next === 1 ? '已恢复' : '已作废'))
  }
  catch (e: any) {
    res.json(failed(e.message || '更新表单数据状态失败'))
  }
})

router.post('/form/data/delete', (req, res) => {
  try {
    const { id } = req.body
    if (!id) {
      res.json(failed('缺少 id'))
      return
    }
    db.prepare('DELETE FROM za_form_data WHERE id = ?').run(id)
    res.json(success(null, '删除成功'))
  }
  catch (e: any) {
    res.json(failed(e.message || '删除表单数据失败'))
  }
})

export default router
