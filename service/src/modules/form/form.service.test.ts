import { beforeAll, describe, expect, it } from 'vitest'

process.env.DB_PATH = ':memory:'

const { initDb, getDb } = await import('../../db')
const { BadRequestError, ConflictError } = await import('../../lib/errors')
const formService = await import('./form.service')
const formDataService = await import('./formData.service')

beforeAll(() => {
  initDb()
})

function schema(field: string, label = field) {
  return JSON.stringify({
    version: 2,
    form: { layout: 'vertical' },
    futureExtension: { anyValue: true },
    children: [{
      id: `${field}_id`,
      type: 'input',
      field,
      label,
      props: { placeholder: label, customExtension: { value: 1 } },
      formItem: { required: true },
    }],
  })
}

describe('form definition lifecycle', () => {
  it('创建草稿、宽松保存自定义配置并发布提交', () => {
    const created = formService.createForm({ name: '生命周期表单', description: 'test' })
    expect(created.formKey).toMatch(/^form_[a-z0-9]{16}$/)

    formService.updateForm({ id: created.id, schema: schema('name'), lockVersion: 0 })
    formService.publishForm(created.id)

    const submission = formDataService.submitFormData(created.id, {
      name: '张三',
      unknownExtension: { preserved: true },
    }, 'admin')
    expect(submission.id).toBeGreaterThan(0)

    const row = getDb().prepare('SELECT form_version, form_version_id FROM za_form_data WHERE id = ?').get(submission.id) as any
    expect(row.form_version).toBe(1)
    expect(row.form_version_id).toBe(created.versionId)

    const detail: any = formService.getFormDetail(created.id)
    expect(detail.schema).toContain('customExtension')
    expect(detail.fieldCount).toBe(1)
  })

  it('缺失必填、非法嵌套结构和空表单不能发布或提交', () => {
    const created = formService.createForm({ name: '校验表单' })
    expect(() => formService.publishForm(created.id)).toThrow(BadRequestError)

    formService.updateForm({ id: created.id, schema: schema('age'), lockVersion: 0 })
    formService.publishForm(created.id)
    expect(() => formDataService.submitFormData(created.id, {}, 'admin')).toThrow(BadRequestError)

    const duplicate = formService.createForm({ name: '重复路径' })
    expect(() => formService.updateForm({
      id: duplicate.id,
      lockVersion: 0,
      schema: JSON.stringify({
        version: 2,
        children: [
          { id: 'a', type: 'input', field: 'name', props: {} },
          { id: 'b', type: 'input', field: 'name', props: {} },
        ],
      }),
    })).toThrow(BadRequestError)
  })

  it('Schema 保存使用乐观锁，表单元信息仍可直接编辑', () => {
    const created = formService.createForm({ name: '并发表单' })
    formService.updateForm({ id: created.id, schema: schema('title'), lockVersion: 0 })
    expect(() => formService.updateForm({ id: created.id, schema: schema('newTitle'), lockVersion: 0 }))
      .toThrow(ConflictError)

    formService.updateForm({ id: created.id, name: '并发表单改名', description: '元信息不需要锁' })
    const detail: any = formService.getFormDetail(created.id)
    expect(detail.name).toBe('并发表单改名')
    expect(detail.lockVersion).toBe(1)
  })

  it('发布版本派生草稿后，数据可按版本筛选并按提交版本回显', () => {
    const created = formService.createForm({ name: '版本表单' })
    formService.updateForm({ id: created.id, schema: schema('v1Field', 'V1 字段'), lockVersion: 0 })
    formService.publishForm(created.id)
    const submitted = formDataService.submitFormData(created.id, { v1Field: 'v1 value' }, 'admin')

    const draft = formService.createDraft(created.id)
    formService.updateForm({ id: created.id, schema: schema('v2Field', 'V2 字段'), lockVersion: draft.lockVersion })
    formService.publishForm(created.id)
    formDataService.submitFormData(created.id, { v2Field: 'v2 value' }, 'admin')

    const versions = formService.getFormVersions(created.id)
    expect(versions.map(item => item.schemaVersion)).toEqual([2, 1])

    const versionOneId = (versions.find(item => item.schemaVersion === 1) as { id: number }).id
    const versionTwoId = (versions.find(item => item.schemaVersion === 2) as { id: number }).id
    expect(versionOneId).toBeTruthy()
    expect(versionTwoId).toBeTruthy()

    const pageOne: any = formDataService.getFormDataList({
      formId: created.id,
      versionId: versionOneId,
      pageNum: 1,
      pageSize: 10,
    })
    expect(pageOne.total).toBe(1)
    expect(pageOne.list[0].formVersionId).toBe(versionOneId)
    expect(JSON.parse(pageOne.list[0].data as string).v1Field).toBe('v1 value')

    const pageTwo: any = formDataService.getFormDataList({
      formId: created.id,
      versionId: versionTwoId,
      pageNum: 1,
      pageSize: 10,
    })
    expect(pageTwo.total).toBe(1)
    expect(pageTwo.list[0].formVersionId).toBe(versionTwoId)

    const renderedOne = formService.renderForm(created.id, undefined, submitted.id)
    expect(renderedOne.renderContract.formVersion).toBe(1)
    expect(renderedOne.renderContract.versionId).toBe(versionOneId)
    expect(renderedOne.renderContract.schema).toContain('v1Field')
    expect(renderedOne.renderContract.data.v1Field).toBe('v1 value')
  })

  it('退役阻止新提交但可恢复；发布表单禁止硬删除', () => {
    const created = formService.createForm({ name: '退役表单' })
    formService.updateForm({ id: created.id, schema: schema('retireField'), lockVersion: 0 })
    formService.publishForm(created.id)
    const submitted = formDataService.submitFormData(created.id, { retireField: 'keep' }, 'admin')

    formService.retireForm(created.id)
    expect((formService.getFormDetail(created.id) as any).version).toBe(1)
    expect(() => formDataService.submitFormData(created.id, { retireField: 'new' }, 'admin')).toThrow(ConflictError)
    expect(() => formService.deleteForm(created.id)).toThrow(ConflictError)

    const rendered = formService.renderForm(created.id, undefined, submitted.id)
    expect(rendered.renderContract.data.retireField).toBe('keep')

    formService.reviveForm(created.id)
    const next = formDataService.submitFormData(created.id, { retireField: 'revived' }, 'admin')
    expect(next.id).toBeGreaterThan(submitted.id)
  })

  it('纯草稿软删除，不级联删除填写数据', () => {
    const created = formService.createForm({ name: '草稿删除表单' })
    formService.updateForm({ id: created.id, schema: schema('draftField'), lockVersion: 0 })
    const result = formService.deleteForm(created.id)
    expect(result.discardedDraft).toBe(false)

    const row = getDb().prepare('SELECT deleted_at FROM za_form WHERE id = ?').get(created.id) as any
    expect(row.deleted_at).toBeTruthy()
    const version = getDb().prepare('SELECT status FROM za_form_version WHERE id = ?').get(created.versionId) as any
    expect(version.status).toBe(3)
    expect(formService.getFormList({ pageNum: 1, pageSize: 10 }).list).not.toContainEqual(expect.objectContaining({ id: created.id }))
  })
})
