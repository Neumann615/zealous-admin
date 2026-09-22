import { describe, expect, it } from 'vitest'
import { createFormulaRowScope, evalFormula, getFormulaIssue } from './formula'

describe('计算字段公式', () => {
  it('支持四则运算、优先级和一元负号', () => {
    const values = { price: '19.9', count: 3, discount: 0.8 }
    expect(evalFormula('{price} * {count}', values)).toBeCloseTo(59.7)
    expect(evalFormula('({price} - 10) * {count} + 2', values)).toBeCloseTo(31.7)
    expect(evalFormula('-{discount} * 10 + {count}', values)).toBe(-5)
  })

  it('支持嵌套路径、数学函数和常量', () => {
    const values = {
      contact: { score: 86 },
      items: [{ price: 12 }, { price: 18 }],
    }
    expect(evalFormula('ROUND({contact.score} * 1.1, 0)', values)).toBe(95)
    expect(evalFormula('MAX({items.0.price}, {items.1.price})', values)).toBe(18)
    expect(evalFormula('MIN(PI, E)', values)).toBeCloseTo(Math.E)
  })

  it('行内引用优先读当前行，未命中时回落表单全局值', () => {
    const values = { taxRate: 0.1, price: 999, items: [{ price: 20 }] }
    const scope = createFormulaRowScope(values.items[0], values)
    expect(evalFormula('{price} * (1 + {taxRate})', scope)).toBeCloseTo(22)
  })

  it('运行时引用缺失或非法时抛出可读错误', () => {
    expect(() => evalFormula('{name} + 1', { score: 1 })).toThrow('引用 {name} 不是有效数字')
    expect(() => evalFormula('{score} / 0', { score: 1 })).toThrow('除数不能为 0')
    expect(() => evalFormula('UNKNOWN({score})', { score: 1 })).toThrow('不支持的函数「UNKNOWN」')
  })

  it('保存前能发现括号、引用和长度问题', () => {
    expect(getFormulaIssue('{price} * {count}')).toBeNull()
    expect(getFormulaIssue('')).toBe('公式不能为空')
    expect(getFormulaIssue('({price}')).toBe('缺少右括号 )')
    expect(getFormulaIssue('{price')).toBe('引用缺少右花括号 }')
    expect(getFormulaIssue('a'.repeat(1001))).toBe('公式长度不能超过 1000 个字符')
  })
})
