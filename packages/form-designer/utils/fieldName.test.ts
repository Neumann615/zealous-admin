import type { FieldSchema, FormSchema } from '../types/schema'
import { describe, expect, it } from 'vitest'
import { registerComponent } from '../registry/registry'
import { collectFieldNamePaths, findDuplicateFieldNames, getFieldNameIssue, getFieldPathIssue, getFormulaFieldContext, nodeBindsField, validateFieldNameFormat, validateSchemaFieldNames } from './fieldName'

// 注册测试用组件，覆盖「普通字段 / 无值容器 / 值绑定容器（对象、数组）/ 辅助组件」四类；
// 名称加 t- 前缀避免与其它用例共享的注册表冲突
registerComponent({
  type: 't-input',
  title: '输入框',
  menu: 'main',
  icon: null,
  defaultSchema: () => ({ id: 'i', type: 't-input', field: 'f', props: {} }),
  render: () => null,
  configForm: [],
})
registerComponent({
  type: 't-card',
  title: '卡片',
  menu: 'layout',
  icon: null,
  isContainer: true,
  defaultSchema: () => ({ id: 'c', type: 't-card', props: {} }),
  render: () => null,
  configForm: [],
})
registerComponent({
  type: 't-sub',
  title: '子表单',
  menu: 'subform',
  icon: null,
  isContainer: true,
  nestObject: true,
  defaultSchema: () => ({ id: 's', type: 't-sub', field: 'g', props: {} }),
  render: () => null,
  configForm: [],
})
registerComponent({
  type: 't-list',
  title: '表格子表单',
  menu: 'subform',
  icon: null,
  isContainer: true,
  nestList: true,
  defaultSchema: () => ({ id: 'l', type: 't-list', field: 'rows', props: {} }),
  render: () => null,
  configForm: [],
})
registerComponent({
  type: 't-text',
  title: '文字',
  menu: 'aide',
  icon: null,
  noFormItem: true,
  defaultSchema: () => ({ id: 'x', type: 't-text', props: {} }),
  render: () => null,
  configForm: [],
})

/** 绑定字段的普通组件 */
function input(id: string, name: string): FieldSchema {
  return { id, type: 't-input', field: name, props: {} }
}

/** 容器节点；name 省略表示不绑定字段名 */
function container(id: string, type: string, children: FieldSchema[], name?: string): FieldSchema {
  return name === undefined
    ? { id, type, props: {}, children }
    : { id, type, field: name, props: {}, children }
}

function schemaOf(children: FieldSchema[]): FormSchema {
  return { version: 2, form: { layout: 'vertical' }, children }
}

describe('nodeBindsField', () => {
  it('普通字段组件需要字段名', () => {
    expect(nodeBindsField(input('a', 'x'))).toBe(true)
  })

  it('无值容器不需要字段名', () => {
    expect(nodeBindsField(container('c', 't-card', []))).toBe(false)
  })

  it('值绑定容器（嵌套对象 / 数组）需要字段名', () => {
    expect(nodeBindsField(container('s', 't-sub', [], 'g'))).toBe(true)
    expect(nodeBindsField(container('l', 't-list', [], 'rows'))).toBe(true)
  })

  it('辅助组件不需要字段名', () => {
    expect(nodeBindsField({ id: 'x', type: 't-text', props: {} })).toBe(false)
  })

  it('未注册类型返回 false', () => {
    expect(nodeBindsField({ id: 'u', type: 'not-registered', props: {} })).toBe(false)
  })
})

describe('validateFieldNameFormat', () => {
  it('合法字段名通过', () => {
    expect(validateFieldNameFormat('userName')).toBeNull()
    expect(validateFieldNameFormat('user_name$1')).toBeNull()
    expect(validateFieldNameFormat('姓名')).toBeNull()
  })

  it('空值与纯空白视为未填写', () => {
    expect(validateFieldNameFormat('')).toBe('字段名不能为空')
    expect(validateFieldNameFormat('   ')).toBe('字段名不能为空')
    expect(validateFieldNameFormat(undefined)).toBe('字段名不能为空')
  })

  it('拒绝含空白的字段名', () => {
    expect(validateFieldNameFormat('user name')).toBe('字段名不能包含空格')
  })

  it('拒绝含点号的字段名', () => {
    expect(validateFieldNameFormat('user.name')).toBe('字段名不能包含点号（嵌套请改用子表单）')
  })
})

describe('findDuplicateFieldNames', () => {
  it('同作用域无重名时返回空数组', () => {
    expect(findDuplicateFieldNames(schemaOf([input('a', 'x'), input('b', 'y')]).children)).toEqual([])
  })

  it('同作用域重名时返回冲突组', () => {
    const groups = findDuplicateFieldNames(schemaOf([input('a', 'x'), input('b', 'x')]).children)
    expect(groups).toHaveLength(1)
    expect(groups[0].name).toBe('x')
    expect(groups[0].nodes.map(n => n.id)).toEqual(['a', 'b'])
  })

  it('布局容器不产生新作用域：卡片内的字段与根字段重名算冲突', () => {
    const groups = findDuplicateFieldNames(
      schemaOf([input('a', 'x'), container('c', 't-card', [input('b', 'x')])]).children,
    )
    expect(groups).toHaveLength(1)
    expect(groups[0].nodes.map(n => n.id)).toEqual(['a', 'b'])
  })

  it('多层布局容器依次展开：row > col > 输入框仍与根字段同作用域', () => {
    const groups = findDuplicateFieldNames(
      schemaOf([
        input('a', 'x'),
        container('row', 't-card', [container('col', 't-card', [input('b', 'x')])]),
      ]).children,
    )
    expect(groups).toHaveLength(1)
    expect(groups[0].nodes.map(n => n.id)).toEqual(['a', 'b'])
  })

  it('值绑定容器开启新作用域：容器内与容器外同名不冲突', () => {
    const groups = findDuplicateFieldNames(
      schemaOf([input('a', 'x'), container('s', 't-sub', [input('b', 'x')], 'g')]).children,
    )
    expect(groups).toEqual([])
  })

  it('值绑定容器内部重名算冲突', () => {
    const groups = findDuplicateFieldNames(
      schemaOf([container('s', 't-sub', [input('a', 'x'), input('b', 'x')], 'g')]).children,
    )
    expect(groups).toHaveLength(1)
    expect(groups[0].nodes.map(n => n.id)).toEqual(['a', 'b'])
  })

  it('数组容器内部重名同样按作用域判定', () => {
    const groups = findDuplicateFieldNames(
      schemaOf([container('l', 't-list', [input('a', 'x'), input('b', 'x')], 'rows')]).children,
    )
    expect(groups).toHaveLength(1)
  })

  it('未填写字段名的节点不参与重名判定', () => {
    const groups = findDuplicateFieldNames(
      schemaOf([
        { id: 'a', type: 't-input', field: '', props: {} },
        { id: 'b', type: 't-input', field: '', props: {} },
      ]).children,
    )
    expect(groups).toEqual([])
  })

  it('不绑定字段的容器上残留的同名字段不算冲突', () => {
    const groups = findDuplicateFieldNames(
      schemaOf([input('a', 'x'), container('c', 't-card', [], 'x')]).children,
    )
    expect(groups).toEqual([])
  })
})

describe('getFieldNameIssue', () => {
  it('节点不存在时返回 null', () => {
    expect(getFieldNameIssue(schemaOf([input('a', 'x')]), 'zzz')).toBeNull()
  })

  it('合法字段名返回 null', () => {
    expect(getFieldNameIssue(schemaOf([input('a', 'x')]), 'a')).toBeNull()
  })

  it('绑定字段的节点未填字段名时报空', () => {
    expect(getFieldNameIssue(schemaOf([{ id: 'a', type: 't-input', props: {} }]), 'a')).toBe('字段名不能为空')
  })

  it('同作用域重名时报占用', () => {
    const schema = schemaOf([input('a', 'x'), input('b', 'x')])
    expect(getFieldNameIssue(schema, 'b')).toBe('字段名「x」已被同级字段占用')
  })

  it('隔着布局容器也能定位到重名', () => {
    const schema = schemaOf([input('a', 'x'), container('c', 't-card', [input('b', 'x')])])
    expect(getFieldNameIssue(schema, 'b')).toBe('字段名「x」已被同级字段占用')
  })

  it('无值容器没有字段名不算问题', () => {
    expect(getFieldNameIssue(schemaOf([container('c', 't-card', [])]), 'c')).toBeNull()
  })
})

describe('validateSchemaFieldNames', () => {
  it('合法 schema 返回空数组', () => {
    expect(validateSchemaFieldNames(schemaOf([
      input('a', 'x'),
      container('s', 't-sub', [input('b', 'x')], 'g'),
    ]))).toEqual([])
  })

  it('重名时给出包含字段名的描述', () => {
    const issues = validateSchemaFieldNames(schemaOf([input('a', 'x'), input('b', 'x')]))
    expect(issues).toHaveLength(1)
    expect(issues[0]).toContain('x')
  })

  it('深层未填字段名也会被发现', () => {
    const issues = validateSchemaFieldNames(schemaOf([
      container('s', 't-sub', [{ id: 'a', type: 't-input', props: {} }], 'g'),
    ]))
    expect(issues).toHaveLength(1)
    expect(issues[0]).toContain('字段名不能为空')
  })

  it('格式与重名问题一并收集', () => {
    const issues = validateSchemaFieldNames(schemaOf([
      input('a', 'user name'),
      input('b', 'x'),
      input('c', 'x'),
    ]))
    expect(issues).toHaveLength(2)
  })
})

describe('collectFieldNamePaths', () => {
  it('普通容器不下探出作用域，子表单加前缀，数组容器只给到容器自身', () => {
    const paths = collectFieldNamePaths([
      container('c', 't-card', [input('a', 'inside')]),
      input('b', 'top'),
      container('s', 't-sub', [input('d', 'name')], 'contact'),
      container('l', 't-list', [input('e', 'title')], 'items'),
    ])

    // items 的子字段是行内字段（完整名路径要带行下标，运行期才有），不列出来
    expect(paths).toEqual(['inside', 'top', 'contact', 'contact.name', 'items'])
  })

  it('辅助组件不产出路径；没字段名的值绑定容器不产生新作用域', () => {
    expect(collectFieldNamePaths([
      { id: 'x', type: 't-text', props: {} },
      container('s', 't-sub', [input('d', 'name')]),
    ])).toEqual(['name'])
  })
})

describe('getFieldPathIssue', () => {
  const children = [
    input('a', 'top'),
    container('s', 't-sub', [input('d', 'name')], 'contact'),
    container('l', 't-list', [input('e', 'title')], 'items'),
  ]

  it('能解析的路径返回 null（含数组行内字段与行本身）', () => {
    expect(getFieldPathIssue(children, 'top')).toBeNull()
    expect(getFieldPathIssue(children, 'contact')).toBeNull()
    expect(getFieldPathIssue(children, 'contact.name')).toBeNull()
    expect(getFieldPathIssue(children, 'items')).toBeNull()
    expect(getFieldPathIssue(children, 'items.0')).toBeNull()
    expect(getFieldPathIssue(children, 'items.0.title')).toBeNull()
  })

  it('数组行内字段缺行下标时给出带下标的写法', () => {
    expect(getFieldPathIssue(children, 'items.title'))
      .toBe('「items」是数组容器：行内字段要带行下标，如 items.0.title')
    expect(getFieldPathIssue(children, 'items.0.title.price'))
      .toBe('「items.0.title」不是容器，不能继续往下取值')
  })

  it('字段不存在或不能继续下探时给出问题描述', () => {
    expect(getFieldPathIssue(children, 'ghost')).toBe('未找到字段「ghost」')
    expect(getFieldPathIssue(children, 'top.price')).toBe('「top」不是容器，不能继续往下取值')
    expect(getFieldPathIssue(children, 'contact.ghost')).toBe('未找到字段「contact.ghost」')
    expect(getFieldPathIssue(children, '')).toBe('名路径不能为空')
  })
})

describe('getFormulaFieldContext', () => {
  it('识别普通公式与表格行内公式的相对引用集合', () => {
    const children = [
      { id: 'formula', type: 't-input', field: 'total', props: {} },
      container('s', 't-sub', [input('d', 'name')], 'contact'),
      container('l', 't-list', [
        input('e', 'qty'),
        container('g', 't-sub', [input('n', 'rate')], 'detail'),
        { id: 'amount', type: 't-input', field: 'amount', props: {} },
      ], 'items'),
    ]
    expect(getFormulaFieldContext(children, 'formula')).toEqual({ inList: false, rowFields: [], selfPath: null })
    expect(getFormulaFieldContext(children, 'amount')).toEqual({
      inList: true,
      rowFields: ['qty', 'detail', 'detail.rate', 'amount'],
      selfPath: 'amount',
    })
  })
})
