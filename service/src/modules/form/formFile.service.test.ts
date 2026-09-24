import { describe, expect, it, beforeAll } from 'vitest'

process.env.DB_PATH = ':memory:'

const { initDb, getDb } = await import('../../db')
const { BadRequestError, NotFoundError } = await import('../../lib/errors')
const { getFormFile, saveFormFile } = await import('./formFile.service')

beforeAll(() => {
  initDb()
})

describe('form file storage', () => {
  it('保存并按随机 objectId 取回文件', () => {
    const record = saveFormFile({
      content: Buffer.from('hello form file'),
      fileName: '测试/文件:report.txt',
      fileType: 'text/plain',
      uploadedBy: 'admin',
    })

    expect(record.objectId).toMatch(/^[a-f0-9]{32}$/)
    expect(record.fileName).toBe('测试_文件_report.txt')
    expect(getFormFile(record.objectId).content.toString()).toBe('hello form file')
  })

  it('拒绝空文件、超限文件和非法 objectId', () => {
    expect(() => saveFormFile({ content: Buffer.alloc(0), fileName: 'empty.txt' })).toThrow(BadRequestError)
    expect(() => saveFormFile({ content: Buffer.alloc(10 * 1024 * 1024 + 1), fileName: 'large.txt' })).toThrow(BadRequestError)
    expect(() => getFormFile('../unsafe')).toThrow(NotFoundError)
  })

  it('落库记录包含上传人与时间', () => {
    const record = saveFormFile({ content: Buffer.from('audit'), fileName: 'audit.txt', uploadedBy: 'admin' })
    const row = getDb().prepare('SELECT uploaded_by, create_time FROM za_form_file WHERE object_id = ?').get(record.objectId) as any
    expect(row.uploaded_by).toBe('admin')
    expect(row.create_time).toBeTruthy()
  })
})
