import type { DataSourceDef } from '../types/schema'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerFormDataApis } from './dataApis'
import { DataSourceError, loadFieldOptions, resolveDataSourceDef } from './dataSourceLoader'

describe('dataSourceLoader', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('resolveDataSourceDef 的 def 优先于 ref，来源缺失时返回 undefined', () => {
    const shared: DataSourceDef = { type: 'static', options: [] }
    const def: DataSourceDef = { type: 'static', options: [{ label: '内联', value: 1 }] }

    expect(resolveDataSourceDef({ ref: 'shared', def }, { shared })).toBe(def)
    expect(resolveDataSourceDef({ ref: 'shared' }, { shared })).toBe(shared)
    expect(resolveDataSourceDef({ ref: 'missing' }, { shared })).toBeUndefined()
    expect(resolveDataSourceDef(undefined)).toBeUndefined()
  })

  it('static 来源直接返回定义选项', async () => {
    const options = [{ label: '静态项', value: 1 }]

    await expect(loadFieldOptions({ type: 'static', options }, {})).resolves.toBe(options)
  })

  it('metadata 来源走宿主接口，默认和自定义映射都会归一化选项', async () => {
    const metadata = vi.fn().mockResolvedValue([
      { label: '男', value: '1' },
      { label: '无效', code: 'bad' },
      '女',
    ])
    registerFormDataApis({ metadata })
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const definition = { type: 'metadata', setCode: 'GENDER' } as DataSourceDef
    await expect(loadFieldOptions(definition, {})).resolves.toEqual([
      { label: '男', value: '1' },
      { label: '女', value: '女' },
    ])
    expect(metadata).toHaveBeenCalledWith(definition, undefined)
    expect(warning).toHaveBeenCalled()

    metadata.mockResolvedValue([{ name: '研发部', code: 9, disabled: true }])
    await expect(loadFieldOptions(
      { type: 'metadata', setCode: 'ORGANIZATION', labelField: 'name', valueField: 'code' },
      {},
    )).resolves.toEqual([{ label: '研发部', value: 9, disabled: true }])
  })

  it('api 来源插值参数、支持 parse 信封路径并透传 signal', async () => {
    const controller = new AbortController()
    const api = vi.fn().mockResolvedValue({ data: { list: [{ label: '研发部', value: 9 }] } })
    registerFormDataApis({ 'test.dept': api })

    await expect(loadFieldOptions(
      { type: 'api', api: 'test.dept', params: { city: '{{city}}', fixed: 'x' }, parse: 'data.list' },
      { city: 'hz' },
      controller.signal,
    )).resolves.toEqual([{ label: '研发部', value: 9 }])
    expect(api).toHaveBeenCalledWith({ city: 'hz', fixed: 'x' }, controller.signal)
  })

  it('api 结果不是数组或接口未注册时抛出可展示错误', async () => {
    registerFormDataApis({ 'test.invalid': vi.fn().mockResolvedValue({}) })

    await expect(loadFieldOptions({ type: 'api', api: 'test.invalid' }, {}))
      .rejects
      .toThrow('数据接口返回的不是数组：test.invalid')

    await expect(loadFieldOptions({ type: 'api', api: 'test.missing' }, {}))
      .rejects
      .toThrow('未注册的数据接口：test.missing')

    await expect(loadFieldOptions({ type: 'api', api: 'test.missing' }, {}))
      .rejects
      .toBeInstanceOf(DataSourceError)
  })
})
