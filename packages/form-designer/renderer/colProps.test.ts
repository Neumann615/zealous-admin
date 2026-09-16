import { describe, expect, it } from 'vitest'
import { fieldColProps, shellStyleFromCol } from './colProps'

describe('fieldColProps', () => {
  it('无 col 时返回 null（不包裹 Col）', () => {
    expect(fieldColProps(undefined)).toBeNull()
  })

  it('只给 span 时透传 span', () => {
    expect(fieldColProps({ span: 12 })).toEqual({ span: 12 })
  })

  it('响应式断点一并透传', () => {
    expect(fieldColProps({ span: 12, xs: 24, md: 8 })).toEqual({ span: 12, xs: 24, md: 8 })
  })

  it('空对象视为未配置', () => {
    expect(fieldColProps({})).toBeNull()
  })
})

describe('shellStyleFromCol', () => {
  it('span 换算成外壳的 flex 尺寸', () => {
    expect(shellStyleFromCol({ span: 6 })).toEqual({ flex: '0 0 25%', maxWidth: '25%' })
  })

  it('未配置时占满一行', () => {
    expect(shellStyleFromCol(undefined)).toEqual({ flex: '0 0 100%', maxWidth: '100%' })
  })
})
