import { getByPathName } from '../utils/path'

export type FormulaValue = number | string | boolean | undefined | null

interface FormulaToken {
  type: 'number' | 'reference' | 'identifier' | 'operator' | 'comma' | 'left' | 'right'
  value: string
}

const FORMULA_FUNCTIONS = new Set([
  'ABS',
  'CEIL',
  'FLOOR',
  'MAX',
  'MIN',
  'POW',
  'ROUND',
  'SQRT',
])

const FORMULA_CONSTANTS = new Map([
  ['E', Math.E],
  ['PI', Math.PI],
])

/** 提取显式字段引用；语法非法时返回空数组，由 getFormulaIssue 负责报告问题 */
export function getFormulaReferences(expression: string): string[] {
  try {
    return [...new Set(tokenize(expression).filter(token => token.type === 'reference').map(token => token.value))]
  }
  catch {
    return []
  }
}

function isDigit(char: string): boolean {
  return char >= '0' && char <= '9'
}

function isIdentifierStart(char: string): boolean {
  return /[a-z_]/i.test(char)
}

function isIdentifierChar(char: string): boolean {
  return isIdentifierStart(char) || isDigit(char)
}

function tokenize(expression: string): FormulaToken[] {
  const tokens: FormulaToken[] = []
  let index = 0

  while (index < expression.length) {
    const char = expression[index]
    if (/\s/.test(char)) {
      index += 1
      continue
    }

    if (isDigit(char) || (char === '.' && isDigit(expression[index + 1]))) {
      const start = index
      while (index < expression.length && (isDigit(expression[index]) || expression[index] === '.'))
        index += 1
      tokens.push({ type: 'number', value: expression.slice(start, index) })
      continue
    }

    if (char === '{') {
      const end = expression.indexOf('}', index + 1)
      if (end < 0)
        throw new Error('引用缺少右花括号 }')
      const path = expression.slice(index + 1, end).trim()
      if (!path)
        throw new Error('引用字段不能为空')
      tokens.push({ type: 'reference', value: path })
      index = end + 1
      continue
    }

    if (isIdentifierStart(char)) {
      const start = index
      while (index < expression.length && isIdentifierChar(expression[index]))
        index += 1
      tokens.push({ type: 'identifier', value: expression.slice(start, index) })
      continue
    }

    if ('+-*/%'.includes(char)) {
      tokens.push({ type: 'operator', value: char })
      index += 1
      continue
    }
    if (char === '(') {
      tokens.push({ type: 'left', value: char })
      index += 1
      continue
    }
    if (char === ')') {
      tokens.push({ type: 'right', value: char })
      index += 1
      continue
    }
    if (char === ',') {
      tokens.push({ type: 'comma', value: char })
      index += 1
      continue
    }
    throw new Error(`不支持的字符「${char}」`)
  }

  if (!tokens.length)
    throw new Error('公式不能为空')
  return tokens
}

function toNumber(value: unknown, label: string): number {
  const number = typeof value === 'string' && value.trim() === '' ? Number.NaN : Number(value)
  if (!Number.isFinite(number))
    throw new Error(`引用 {${label}} 不是有效数字`)
  return number
}

class FormulaParser {
  private index = 0

  constructor(
    private readonly tokens: FormulaToken[],
    private readonly values: Record<string, any>,
    private readonly validating = false,
  ) {}

  parse(): number {
    const value = this.parseAdditive()
    if (this.index < this.tokens.length)
      throw new Error(`不支持的表达式片段「${this.tokens[this.index].value}」`)
    return value
  }

  private parseAdditive(): number {
    let value = this.parseMultiplicative()
    while (this.peek()?.type === 'operator' && (this.peek()!.value === '+' || this.peek()!.value === '-')) {
      const operator = this.next()!.value
      const right = this.parseMultiplicative()
      value = operator === '+' ? value + right : value - right
    }
    return value
  }

  private parseMultiplicative(): number {
    let value = this.parseUnary()
    while (this.peek()?.type === 'operator' && ['*', '/', '%'].includes(this.peek()!.value)) {
      const operator = this.next()!.value
      const right = this.parseUnary()
      if ((operator === '/' || operator === '%') && right === 0)
        throw new Error('除数不能为 0')
      value = operator === '*' ? value * right : operator === '/' ? value / right : value % right
    }
    return value
  }

  private parseUnary(): number {
    const token = this.peek()
    if (token?.type === 'operator' && (token.value === '+' || token.value === '-')) {
      this.next()
      const value = this.parseUnary()
      return token.value === '-' ? -value : value
    }
    return this.parsePrimary()
  }

  private parsePrimary(): number {
    const token = this.next()
    if (!token)
      throw new Error('表达式不完整')

    if (token.type === 'number')
      return Number(token.value)

    if (token.type === 'reference')
      return this.validating ? 1 : toNumber(getByPathName(this.values, token.value), token.value)

    if (token.type === 'identifier') {
      const name = token.value.toUpperCase()
      if (FORMULA_CONSTANTS.has(name))
        return FORMULA_CONSTANTS.get(name)!
      if (!FORMULA_FUNCTIONS.has(name))
        throw new Error(`不支持的函数「${token.value}」`)
      this.expect('left')
      const args: number[] = []
      if (this.peek()?.type !== 'right') {
        args.push(this.parseAdditive())
        while (this.peek()?.type === 'comma') {
          this.next()
          args.push(this.parseAdditive())
        }
      }
      this.expect('right')
      return applyFormulaFunction(name, args)
    }

    if (token.type === 'left') {
      const value = this.parseAdditive()
      this.expect('right')
      return value
    }

    throw new Error(`不支持的表达式片段「${token.value}」`)
  }

  private peek(): FormulaToken | undefined {
    return this.tokens[this.index]
  }

  private next(): FormulaToken | undefined {
    return this.tokens[this.index++]
  }

  private expect(type: FormulaToken['type']): void {
    const token = this.next()
    if (!token || token.type !== type)
      throw new Error(type === 'right' ? '缺少右括号 )' : '表达式不完整')
  }
}

function applyFormulaFunction(name: string, args: number[]): number {
  const invalid = `${name} 参数数量不正确`
  if ((name === 'ABS' || name === 'CEIL' || name === 'FLOOR' || name === 'SQRT') && args.length !== 1)
    throw new Error(invalid)
  if ((name === 'MIN' || name === 'MAX') && args.length < 1)
    throw new Error(invalid)
  if (name === 'POW' && args.length !== 2)
    throw new Error(invalid)
  if (name === 'ROUND' && (args.length < 1 || args.length > 2))
    throw new Error(invalid)

  switch (name) {
    case 'ABS': return Math.abs(args[0])
    case 'CEIL': return Math.ceil(args[0])
    case 'FLOOR': return Math.floor(args[0])
    case 'SQRT': return args[0] < 0 ? Number.NaN : Math.sqrt(args[0])
    case 'MIN': return Math.min(...args)
    case 'MAX': return Math.max(...args)
    case 'POW': return args[0] ** args[1]
    case 'ROUND': {
      const digits = args.length === 2 ? Math.trunc(args[1]) : 0
      if (digits < 0 || digits > 10)
        throw new Error('ROUND 小数位需在 0-10 之间')
      return Number(args[0].toFixed(digits))
    }
    default: throw new Error(invalid)
  }
}

/** 校验公式语法；合法返回 null，非法返回面向用户的问题描述 */
export function getFormulaIssue(expression: string | undefined): string | null {
  if (!expression?.trim())
    return '公式不能为空'
  if (expression.length > 1000)
    return '公式长度不能超过 1000 个字符'
  try {
    tokenize(expression)
    new FormulaParser(tokenize(expression), {}, true).parse()
    return null
  }
  catch (error) {
    return error instanceof Error ? error.message : '公式语法错误'
  }
}

/** 按表单值计算公式；返回值始终是有限数字 */
export function evalFormula(expression: string, values: Record<string, any>): number {
  const result = new FormulaParser(tokenize(expression), values).parse()
  if (!Number.isFinite(result))
    throw new Error('公式结果不是有效数字')
  return result
}
