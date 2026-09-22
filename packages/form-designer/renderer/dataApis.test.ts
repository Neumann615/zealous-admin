import { describe, expect, it } from 'vitest'
import { getFormDataApi, getFormDataApiCatalog, registerFormDataApis, setFormDataApiCatalog } from './dataApis'

describe('数据接口注册表', () => {
  it('注册后可按名取到，未注册返回 undefined', () => {
    const fn = async () => []
    registerFormDataApis({ 'dataApis.test.orgTree': fn })

    expect(getFormDataApi('dataApis.test.orgTree')).toBe(fn)
    expect(getFormDataApi('dataApis.test.unknown')).toBeUndefined()
  })

  it('同名后注册覆盖先注册', () => {
    const first = async () => ['first']
    const second = async () => ['second']
    registerFormDataApis({ 'dataApis.test.override': first })
    registerFormDataApis({ 'dataApis.test.override': second })

    expect(getFormDataApi('dataApis.test.override')).toBe(second)
  })

  it('接口名清单未设置时为空数组，设置后按值返回（改不动内部态）', () => {
    expect(getFormDataApiCatalog()).toEqual([])

    const names = ['metadata', 'orgTree']
    setFormDataApiCatalog(names)
    names.push('afterSet')

    expect(getFormDataApiCatalog()).toEqual(['metadata', 'orgTree'])
    getFormDataApiCatalog().push('mutated')
    expect(getFormDataApiCatalog()).toEqual(['metadata', 'orgTree'])
  })

  it('注册接口不会污染接口名清单（清单由宿主显式提供）', () => {
    setFormDataApiCatalog(['metadata'])
    registerFormDataApis({ 'dataApis.test.silent': async () => [] })

    expect(getFormDataApiCatalog()).toEqual(['metadata'])
  })
})
