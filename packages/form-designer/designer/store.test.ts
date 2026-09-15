import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerComponent } from '../registry/registry'
import { createEmptySchema } from '../types/schema'
import { useDesignerStore } from './store'

// 注册测试用组件
registerComponent({
  type: 'input',
  title: '输入框',
  menu: 'main',
  icon: null,
  defaultSchema: () => ({ id: 'x', type: 'input', field: 'fx', label: '输入框', props: {} }),
  render: () => null,
  configForm: [],
})
registerComponent({
  type: 'card',
  title: '卡片',
  menu: 'layout',
  icon: null,
  isContainer: true,
  defaultSchema: () => ({ id: 'x', type: 'card', props: {}, children: [] }),
  render: () => null,
  configForm: [],
})

function reset() {
  useDesignerStore.setState({
    schema: createEmptySchema(),
    selectedId: null,
    past: [],
    future: [],
    lastCoalesce: null,
  })
}

const store = () => useDesignerStore.getState()

describe('designer store', () => {
  beforeEach(reset)

  it('addField 向根列表插入字段并选中', () => {
    store().addField('input', { parentId: null, index: 0 })
    expect(store().schema.children).toHaveLength(1)
    expect(store().schema.children[0].type).toBe('input')
    expect(store().schema.children[0].id).not.toBe('x') // 重新生成
    expect(store().schema.children[0].field).not.toBe('fx')
    expect(store().selectedId).toBe(store().schema.children[0].id)
  })

  it('addField 向容器内插入', () => {
    store().addField('card', { parentId: null, index: 0 })
    const cardId = store().schema.children[0].id
    store().addField('input', { parentId: cardId, index: 0 })
    expect(store().schema.children[0].children).toHaveLength(1)
  })

  it('moveField 同列表排序（移到后方时下标修正）', () => {
    store().addField('input', { parentId: null, index: 0 })
    store().addField('input', { parentId: null, index: 1 })
    store().addField('input', { parentId: null, index: 2 })
    const [a, b, c] = store().schema.children.map(n => n.id)
    store().moveField(a, { parentId: null, index: 3 }) // a 移到末尾
    expect(store().schema.children.map(n => n.id)).toEqual([b, c, a])
  })

  it('moveField 拒绝拖入自身子树', () => {
    store().addField('card', { parentId: null, index: 0 })
    const cardId = store().schema.children[0].id
    store().addField('card', { parentId: cardId, index: 0 })
    const innerId = store().schema.children[0].children![0].id
    store().moveField(cardId, { parentId: innerId, index: 0 })
    expect(store().schema.children[0].id).toBe(cardId) // 未变化
  })

  it('removeField / duplicateField', () => {
    store().addField('input', { parentId: null, index: 0 })
    const id = store().schema.children[0].id
    store().duplicateField(id)
    expect(store().schema.children).toHaveLength(2)
    expect(store().schema.children[1].id).not.toBe(id)
    store().removeField(id)
    expect(store().schema.children).toHaveLength(1)
  })

  it('updateField 按路径写回并产生历史', () => {
    store().addField('input', { parentId: null, index: 0 })
    const id = store().schema.children[0].id
    store().updateField(id, 'props.placeholder', '请输入')
    expect(store().schema.children[0].props.placeholder).toBe('请输入')
    expect(store().past.length).toBeGreaterThan(0)
  })

  it('undo/redo 往返', () => {
    store().addField('input', { parentId: null, index: 0 })
    expect(store().schema.children).toHaveLength(1)
    store().undo()
    expect(store().schema.children).toHaveLength(0)
    store().redo()
    expect(store().schema.children).toHaveLength(1)
  })

  it('导出导入往返一致，非法 JSON 导入被拒绝', () => {
    store().addField('input', { parentId: null, index: 0 })
    const json = store().exportSchema()
    store().clear()
    expect(store().schema.children).toHaveLength(0)
    expect(store().importSchema(json).ok).toBe(true)
    expect(store().schema.children).toHaveLength(1)
    expect(store().importSchema('{bad json').ok).toBe(false)
    expect(store().importSchema('{"version":99,"children":[]}').ok).toBe(false)
  })

  it('importSchema 把 v1 payload 迁移到当前版本', () => {
    const result = store().importSchema(JSON.stringify({
      version: 1,
      form: { layout: 'vertical' },
      children: [{ id: 'a', type: 'input', field: 'fa', props: {} }],
    }))
    expect(result.ok).toBe(true)
    expect(store().schema.version).toBe(2)
  })

  it('importSchema 拒绝同一层级重名的字段名，且不改动当前 schema', () => {
    const result = store().importSchema(JSON.stringify({
      version: 2,
      form: { layout: 'vertical' },
      children: [
        { id: 'a', type: 'input', field: 'userName', props: {} },
        { id: 'b', type: 'input', field: 'userName', props: {} },
      ],
    }))
    expect(result.ok).toBe(false)
    expect(result.ok ? '' : result.reason).toContain('userName')
    expect(store().schema.children).toHaveLength(0)
  })

  it('importSchema 拒绝未填字段名的字段组件', () => {
    const result = store().importSchema(JSON.stringify({
      version: 2,
      form: { layout: 'vertical' },
      children: [{ id: 'a', type: 'input', props: {} }],
    }))
    expect(result.ok).toBe(false)
    expect(result.ok ? '' : result.reason).toContain('字段名不能为空')
  })

  it('no-op 操作不推历史、不清 future', () => {
    store().addField('input', { parentId: null, index: 0 })
    store().undo()
    // 此时 future 有 1 条；执行 no-op（落点父节点不存在）
    store().addField('input', { parentId: 'ghost', index: 0 })
    store().removeField('ghost')
    store().updateField('ghost', 'props.x', 1)
    expect(store().past).toHaveLength(0) // undo 后为空，no-op 未新增
    expect(store().future).toHaveLength(1) // redo 栈未被清
    store().redo()
    expect(store().schema.children).toHaveLength(1)
  })

  it('moveField 跨容器移动', () => {
    store().addField('card', { parentId: null, index: 0 })
    store().addField('input', { parentId: null, index: 1 })
    const cardId = store().schema.children[0].id
    const inputId = store().schema.children[1].id
    store().moveField(inputId, { parentId: cardId, index: 0 })
    expect(store().schema.children).toHaveLength(1)
    expect(store().schema.children[0].children?.map(n => n.id)).toEqual([inputId])
  })

  it('moveField 同列表向前移动（下标不修正）', () => {
    store().addField('input', { parentId: null, index: 0 })
    store().addField('input', { parentId: null, index: 1 })
    store().addField('input', { parentId: null, index: 2 })
    const [a, b, c] = store().schema.children.map(n => n.id)
    store().moveField(c, { parentId: null, index: 0 }) // c 移到最前
    expect(store().schema.children.map(n => n.id)).toEqual([c, a, b])
  })

  it('removeField 删除包含选中节点的容器后清空选中', () => {
    store().addField('card', { parentId: null, index: 0 })
    const cardId = store().schema.children[0].id
    store().addField('input', { parentId: cardId, index: 0 })
    const inputId = store().schema.children[0].children![0].id
    store().select(inputId)
    store().removeField(cardId)
    expect(store().selectedId).toBeNull()
  })

  it('updateFormConfig 合并全局配置且可撤销', () => {
    store().updateFormConfig({ layout: 'vertical' })
    expect(store().schema.form.layout).toBe('vertical')
    expect(store().schema.form.colon).toBe(true) // 其余配置保留
    store().undo()
    expect(store().schema.form.layout).toBe('horizontal')
  })

  it('importSchema 拒绝 form 为 null、过滤脏节点', () => {
    expect(store().importSchema('{"version":1,"form":null,"children":[]}').ok).toBe(false)
    const ok = store().importSchema(JSON.stringify({
      version: 2,
      form: { layout: 'vertical' },
      children: [
        { id: 'a', type: 'input', field: 'fa', props: {} },
        { type: 'input' }, // 缺 id，应被过滤
        { id: 'b' }, // 缺 type，应被过滤
      ],
    }))
    expect(ok.ok).toBe(true)
    expect(store().schema.children).toHaveLength(1)
    expect(store().schema.form.layout).toBe('vertical')
    expect(store().schema.form.colon).toBe(true) // 默认值补齐
  })

  it('相同 coalesceKey 连续 updateField 合并为一条历史', () => {
    store().addField('input', { parentId: null, index: 0 })
    const id = store().schema.children[0].id
    const before = store().past.length
    store().updateField(id, 'props.placeholder', '请', true)
    store().updateField(id, 'props.placeholder', '请输入', true)
    expect(store().past.length).toBe(before + 1)
    expect(store().schema.children[0].props.placeholder).toBe('请输入')
  })

  it('coalesce 后 undo 回到连续编辑前的状态', () => {
    store().addField('input', { parentId: null, index: 0 })
    const id = store().schema.children[0].id
    store().updateField(id, 'props.placeholder', '请', true)
    store().updateField(id, 'props.placeholder', '请输入', true)
    store().undo()
    expect(store().schema.children[0].props.placeholder).toBeUndefined()
  })

  it('不同 path 的 coalesce 各自推快照', () => {
    store().addField('input', { parentId: null, index: 0 })
    const id = store().schema.children[0].id
    const before = store().past.length
    store().updateField(id, 'label', '标题', true)
    store().updateField(id, 'props.placeholder', '请输入', true)
    expect(store().past.length).toBe(before + 2)
  })

  it('coalesce 与无 coalesce 操作交替时边界正常断开', () => {
    store().addField('input', { parentId: null, index: 0 })
    const id = store().schema.children[0].id
    const before = store().past.length
    store().updateField(id, 'label', 'a', true)
    store().updateField(id, 'label', 'ab') // 无 coalesce：断开并推快照
    store().updateField(id, 'label', 'abc', true) // 重新开启连续编辑：推快照
    store().updateField(id, 'label', 'abcd', true) // 合并
    expect(store().past.length).toBe(before + 3)
    expect(store().schema.children[0].label).toBe('abcd')
  })

  it('undo 后再 coalesce 输入不与撤销前的编辑合并', () => {
    store().addField('input', { parentId: null, index: 0 })
    const id = store().schema.children[0].id
    store().updateField(id, 'label', 'a', true)
    store().undo()
    expect(store().schema.children[0].label).toBe('输入框') // 回到默认
    const before = store().past.length
    store().updateField(id, 'label', 'b', true)
    store().updateField(id, 'label', 'bc', true)
    expect(store().past.length).toBe(before + 1)
    store().undo()
    expect(store().schema.children[0].label).toBe('输入框') // 撤销的是 undo 后的整段编辑
  })

  it('同 key 间隔 ≥500ms 推新快照，窗口内合并', () => {
    vi.useFakeTimers()
    try {
      store().addField('input', { parentId: null, index: 0 })
      const id = store().schema.children[0].id
      const before = store().past.length
      vi.setSystemTime(1000)
      store().updateField(id, 'label', 'a', true)
      vi.setSystemTime(1600) // 距上次 600ms ≥ 500ms
      store().updateField(id, 'label', 'ab', true)
      expect(store().past.length).toBe(before + 2)
      vi.setSystemTime(1800) // 距上次 200ms < 500ms
      store().updateField(id, 'label', 'abc', true)
      expect(store().past.length).toBe(before + 2)
      expect(store().schema.children[0].label).toBe('abc')
    }
    finally {
      vi.useRealTimers()
    }
  })
})
