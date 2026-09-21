// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { createEmptySchema } from '../types/schema'
import { validateOptionsImport, validateRuleImport } from './importValidation'
import '../registry/components'

describe('import validation', () => {
  it('拦截非法渲染规则，而不是静默丢弃节点', () => {
    const issues = validateRuleImport([
      { id: 'a', type: 'not-exists', props: {} },
      { id: 'a', type: 'input', field: 'dup', props: {} },
      { id: 'c', type: 'input', field: 'dup', props: {} },
      { id: 'd', type: 'card', props: {}, children: {} },
    ])

    expect(issues.join('；')).toContain('未注册组件类型')
    expect(issues.join('；')).toContain('id「a」重复')
    expect(issues.join('；')).toContain('同一层级重复')
    expect(issues.join('；')).toContain('children 应为数组')
  })

  it('拦截表单配置中的未知键与非法数据源', () => {
    const issues = validateOptionsImport({
      unknown: true,
      form: { layout: 'vertical' },
      events: {},
      dataSources: { org: { type: 'api' } },
      permissions: { name: { visible: 'yes' } },
    }, createEmptySchema())

    expect(issues.join('；')).toContain('未知配置')
    expect(issues.join('；')).toContain('数据源「org」')
    expect(issues.join('；')).toContain('权限「name」')
  })
})
