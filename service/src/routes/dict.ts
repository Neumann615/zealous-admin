import { Router } from 'express'
import { getDb } from '../db'
import { now } from '../lib/date'
import { failed, success } from '../lib/response'
import { authMiddleware } from '../middleware/auth'

const router = Router()
const db = getDb()

router.use(authMiddleware)

router.get('/dict/type/list', (req, res) => {
  try {
    const keyword = (req.query.keyword as string) || ''
    const pageSize = Number(req.query.pageSize) || 5
    const pageNum = Number(req.query.pageNum) || 1
    const offset = (pageNum - 1) * pageSize

    let total: number
    let types: any[]

    if (keyword) {
      const like = `%${keyword}%`
      total = (db.prepare(
        'SELECT COUNT(*) AS count FROM za_dict_type WHERE name LIKE ? OR dict_type LIKE ?',
      ).get(like, like) as any).count

      types = db.prepare(
        'SELECT * FROM za_dict_type WHERE name LIKE ? OR dict_type LIKE ? LIMIT ? OFFSET ?',
      ).all(like, like, pageSize, offset)
    }
    else {
      total = (db.prepare('SELECT COUNT(*) AS count FROM za_dict_type').get() as any).count
      types = db.prepare('SELECT * FROM za_dict_type LIMIT ? OFFSET ?').all(pageSize, offset)
    }

    res.json(success({ list: types, total, pageSize, pageNum }))
  }
  catch (e: any) {
    res.json(failed(e.message || '获取字典类型列表失败'))
  }
})

router.post('/dict/type/create', (req, res) => {
  try {
    const { name, dictType, status, remark } = req.body

    if (!name || !dictType) {
      res.json(failed('字典名称和字典类型不能为空'))
      return
    }

    const existing = db.prepare('SELECT id FROM za_dict_type WHERE dict_type = ?').get(dictType)
    if (existing) {
      res.json(failed('字典类型已存在'))
      return
    }

    const result = db.prepare(
      'INSERT INTO za_dict_type (name, dict_type, status, remark, create_time) VALUES (?, ?, ?, ?, ?)',
    ).run(name, dictType, status || 1, remark || null, now())

    const type = db.prepare('SELECT * FROM za_dict_type WHERE id = ?').get(result.lastInsertRowid)
    res.json(success(type))
  }
  catch (e: any) {
    res.json(failed(e.message || '创建字典类型失败'))
  }
})

router.get('/dict/type/:id', (req, res) => {
  try {
    const id = Number(req.params.id)
    const type = db.prepare('SELECT * FROM za_dict_type WHERE id = ?').get(id)

    if (!type) {
      res.json(failed('字典类型不存在'))
      return
    }
    res.json(success(type))
  }
  catch (e: any) {
    res.json(failed(e.message || '获取字典类型失败'))
  }
})

router.post('/dict/type/update/:id', (req, res) => {
  try {
    const id = Number(req.params.id)
    const { name, dictType, status, remark } = req.body

    const existing = db.prepare('SELECT id FROM za_dict_type WHERE id = ?').get(id)
    if (!existing) {
      res.json(failed('字典类型不存在'))
      return
    }

    if (dictType) {
      const conflict = db.prepare('SELECT id FROM za_dict_type WHERE dict_type = ? AND id != ?').get(dictType, id)
      if (conflict) {
        res.json(failed('字典类型已存在'))
        return
      }
    }

    const sets: string[] = []
    const values: any[] = []

    if (name !== undefined) { sets.push('name = ?'); values.push(name) }
    if (dictType !== undefined) { sets.push('dict_type = ?'); values.push(dictType) }
    if (status !== undefined) { sets.push('status = ?'); values.push(status) }
    if (remark !== undefined) { sets.push('remark = ?'); values.push(remark) }

    if (sets.length === 0) {
      res.json(failed('没有需要更新的字段'))
      return
    }

    values.push(id)
    db.prepare(`UPDATE za_dict_type SET ${sets.join(', ')} WHERE id = ?`).run(...values)

    const updated = db.prepare('SELECT * FROM za_dict_type WHERE id = ?').get(id)
    res.json(success(updated))
  }
  catch (e: any) {
    res.json(failed(e.message || '更新字典类型失败'))
  }
})

router.post('/dict/type/delete/:id', (req, res) => {
  try {
    const id = Number(req.params.id)
    const existing = db.prepare('SELECT * FROM za_dict_type WHERE id = ?').get(id) as any
    if (!existing) {
      res.json(failed('字典类型不存在'))
      return
    }

    const dataCount = (db.prepare('SELECT COUNT(*) AS count FROM za_dict_data WHERE dict_type = ?').get(existing.dict_type) as any).count
    if (dataCount > 0) {
      res.json(failed('存在字典数据，无法删除'))
      return
    }

    db.prepare('DELETE FROM za_dict_type WHERE id = ?').run(id)
    res.json(success(null, '删除成功'))
  }
  catch (e: any) {
    res.json(failed(e.message || '删除字典类型失败'))
  }
})

router.get('/dict/data/list', (req, res) => {
  try {
    const dictType = (req.query.dictType as string) || ''
    const pageSize = Number(req.query.pageSize) || 5
    const pageNum = Number(req.query.pageNum) || 1
    const offset = (pageNum - 1) * pageSize

    let total: number
    let datas: any[]

    if (dictType) {
      total = (db.prepare('SELECT COUNT(*) AS count FROM za_dict_data WHERE dict_type = ?').get(dictType) as any).count
      datas = db.prepare('SELECT * FROM za_dict_data WHERE dict_type = ? ORDER BY dict_sort LIMIT ? OFFSET ?').all(dictType, pageSize, offset)
    }
    else {
      total = (db.prepare('SELECT COUNT(*) AS count FROM za_dict_data').get() as any).count
      datas = db.prepare('SELECT * FROM za_dict_data ORDER BY dict_sort LIMIT ? OFFSET ?').all(pageSize, offset)
    }

    res.json(success({ list: datas, total, pageSize, pageNum }))
  }
  catch (e: any) {
    res.json(failed(e.message || '获取字典数据列表失败'))
  }
})

router.post('/dict/data/create', (req, res) => {
  try {
    const { dictType, dictLabel, dictValue, dictSort, status, remark, cssClass, listClass } = req.body

    if (!dictType || !dictLabel || !dictValue) {
      res.json(failed('字典类型、标签和值不能为空'))
      return
    }

    const result = db.prepare(
      'INSERT INTO za_dict_data (dict_type, dict_label, dict_value, dict_sort, status, remark, css_class, list_class, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(dictType, dictLabel, dictValue, dictSort || 0, status || 1, remark || null, cssClass || null, listClass || null, now())

    const data = db.prepare('SELECT * FROM za_dict_data WHERE id = ?').get(result.lastInsertRowid)
    res.json(success(data))
  }
  catch (e: any) {
    res.json(failed(e.message || '创建字典数据失败'))
  }
})

router.get('/dict/data/:id', (req, res) => {
  try {
    const id = Number(req.params.id)
    const data = db.prepare('SELECT * FROM za_dict_data WHERE id = ?').get(id)

    if (!data) {
      res.json(failed('字典数据不存在'))
      return
    }
    res.json(success(data))
  }
  catch (e: any) {
    res.json(failed(e.message || '获取字典数据失败'))
  }
})

router.post('/dict/data/update/:id', (req, res) => {
  try {
    const id = Number(req.params.id)
    const { dictType, dictLabel, dictValue, dictSort, status, remark, cssClass, listClass } = req.body

    const existing = db.prepare('SELECT id FROM za_dict_data WHERE id = ?').get(id)
    if (!existing) {
      res.json(failed('字典数据不存在'))
      return
    }

    const sets: string[] = []
    const values: any[] = []

    if (dictType !== undefined) { sets.push('dict_type = ?'); values.push(dictType) }
    if (dictLabel !== undefined) { sets.push('dict_label = ?'); values.push(dictLabel) }
    if (dictValue !== undefined) { sets.push('dict_value = ?'); values.push(dictValue) }
    if (dictSort !== undefined) { sets.push('dict_sort = ?'); values.push(dictSort) }
    if (status !== undefined) { sets.push('status = ?'); values.push(status) }
    if (remark !== undefined) { sets.push('remark = ?'); values.push(remark) }
    if (cssClass !== undefined) { sets.push('css_class = ?'); values.push(cssClass) }
    if (listClass !== undefined) { sets.push('list_class = ?'); values.push(listClass) }

    if (sets.length === 0) {
      res.json(failed('没有需要更新的字段'))
      return
    }

    values.push(id)
    db.prepare(`UPDATE za_dict_data SET ${sets.join(', ')} WHERE id = ?`).run(...values)

    const updated = db.prepare('SELECT * FROM za_dict_data WHERE id = ?').get(id)
    res.json(success(updated))
  }
  catch (e: any) {
    res.json(failed(e.message || '更新字典数据失败'))
  }
})

router.post('/dict/data/delete/:id', (req, res) => {
  try {
    const id = Number(req.params.id)
    const existing = db.prepare('SELECT id FROM za_dict_data WHERE id = ?').get(id)
    if (!existing) {
      res.json(failed('字典数据不存在'))
      return
    }

    db.prepare('DELETE FROM za_dict_data WHERE id = ?').run(id)
    res.json(success(null, '删除成功'))
  }
  catch (e: any) {
    res.json(failed(e.message || '删除字典数据失败'))
  }
})

router.get('/dict/type/all', (_req, res) => {
  try {
    const types = db.prepare('SELECT * FROM za_dict_type ORDER BY id').all()
    res.json(success(types))
  }
  catch (e: any) {
    res.json(failed(e.message || '获取所有字典类型失败'))
  }
})

router.get('/dict/data/type/:dictType', (req, res) => {
  try {
    const dictType = req.params.dictType
    const datas = db.prepare('SELECT * FROM za_dict_data WHERE dict_type = ? ORDER BY dict_sort').all(dictType)
    res.json(success(datas))
  }
  catch (e: any) {
    res.json(failed(e.message || '获取字典数据失败'))
  }
})

export default router
