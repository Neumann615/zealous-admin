import type { FormGlobalConfig } from '../types/schema'
import { describe, expect, it } from 'vitest'
import { buildFormProps, isHorizontalLayout, resolveLabelWidth } from './formProps'

describe('buildFormProps', () => {
  it('白名单键原样透传给 antd Form', () => {
    const form: FormGlobalConfig = { layout: 'vertical', labelAlign: 'left', size: 'small', colon: false, disabled: true }
    const props = buildFormProps(form)
    expect(props).toHaveProperty('layout', 'vertical')
    expect(props).toHaveProperty('labelAlign', 'left')
    expect(props).toHaveProperty('size', 'small')
    expect(props).toHaveProperty('colon', false)
    expect(props).toHaveProperty('disabled', true)
  })

  it('未设值的白名单键不产出，避免覆盖 antd 默认', () => {
    const props = buildFormProps({})
    expect(props).not.toHaveProperty('layout')
    expect(props).not.toHaveProperty('labelAlign')
    expect(props).not.toHaveProperty('size')
    expect(props).not.toHaveProperty('colon')
    expect(props).not.toHaveProperty('disabled')
  })

  it('设计器自有键不会透传给 antd Form', () => {
    const props = buildFormProps({
      layout: 'vertical',
      labelWidth: 120,
      hideRequiredAsterisk: true,
      submitBtn: false,
      resetBtn: false,
    })
    expect(props).not.toHaveProperty('labelWidth')
    expect(props).not.toHaveProperty('hideRequiredAsterisk')
    expect(props).not.toHaveProperty('submitBtn')
    expect(props).not.toHaveProperty('resetBtn')
  })

  it('labelWidth 在水平布局下转成 labelCol，垂直/行内布局下不生效', () => {
    expect(buildFormProps({ layout: 'horizontal', labelWidth: 120 }).labelCol).toEqual({ style: { width: '120px' } })
    // layout 未设值时 antd 按 horizontal 处理
    expect(buildFormProps({ labelWidth: 120 }).labelCol).toEqual({ style: { width: '120px' } })
    expect(buildFormProps({ layout: 'vertical', labelWidth: 120 }).labelCol).toBeUndefined()
    expect(buildFormProps({ layout: 'inline', labelWidth: 120 }).labelCol).toBeUndefined()
    expect(buildFormProps({ layout: 'horizontal' }).labelCol).toBeUndefined()
  })

  it('hideRequiredAsterisk 转成 requiredMark={false}，未开启时为 undefined', () => {
    expect(buildFormProps({ hideRequiredAsterisk: true }).requiredMark).toBe(false)
    expect(buildFormProps({}).requiredMark).toBeUndefined()
  })
})

describe('isHorizontalLayout / resolveLabelWidth', () => {
  it('layout 归一化：未设值按 horizontal', () => {
    expect(isHorizontalLayout({})).toBe(true)
    expect(isHorizontalLayout({ layout: 'horizontal' })).toBe(true)
    expect(isHorizontalLayout({ layout: 'vertical' })).toBe(false)
    expect(isHorizontalLayout({ layout: 'inline' })).toBe(false)
  })

  it('标签宽度只在水平布局下生效', () => {
    expect(resolveLabelWidth({ labelWidth: 120 })).toBe(120)
    expect(resolveLabelWidth({ layout: 'horizontal', labelWidth: 120 })).toBe(120)
    expect(resolveLabelWidth({ layout: 'vertical', labelWidth: 120 })).toBeUndefined()
    expect(resolveLabelWidth({ layout: 'horizontal' })).toBeUndefined()
  })
})
