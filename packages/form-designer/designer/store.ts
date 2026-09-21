import type { CustomHookDef, FormEventConfig } from '../events/types'
import type { FieldPermission, FieldSchema, FormSchema } from '../types/schema'
import { create } from 'zustand'
import { getComponent } from '../registry/registry'
import { createEmptySchema } from '../types/schema'
import { validateSchemaFieldNames } from '../utils/fieldName'
import { parseSchema } from '../utils/parseSchema'
import { setByPath } from '../utils/path'
import { getFieldPermissionKey, pruneFieldPermissions, renameFieldPermissions } from '../utils/permissions'
import { childrenOf, cloneNode, findNode, isDescendant, removeNode } from '../utils/schemaTree'
import { uniqueId } from '../utils/uniqueId'

/** 拖拽落点：插入到 parentId 的 children 的 index 处 */
export interface DropTarget {
  parentId: string | null
  index: number
}

/** 导入结果：失败时 reason 直接面向用户展示 */
export type ImportResult = { ok: true } | { ok: false, reason: string }

const HISTORY_LIMIT = 50
/** 相同 coalesceKey 的连续编辑在该时间窗内合并为一条历史 */
const COALESCE_WINDOW = 500

interface DesignerState {
  schema: FormSchema
  selectedId: string | null
  past: FormSchema[]
  future: FormSchema[]
  /** 内部：上一次带 coalesceKey 的写入记录，用于连续编辑合并；不参与序列化 */
  lastCoalesce: { key: string, time: number } | null
  select: (id: string | null) => void
  addField: (type: string, target: DropTarget) => void
  moveField: (id: string, target: DropTarget) => void
  removeField: (id: string) => void
  duplicateField: (id: string) => void
  /** 按点分路径更新字段属性，如 updateField(id, 'props.placeholder', '请输入')；coalesce 为 true 时同字段连续编辑合并历史 */
  updateField: (id: string, path: string, value: any, coalesce?: boolean) => void
  updateFormConfig: (patch: Partial<FormSchema['form']>) => void
  updateEvents: (patch: Partial<FormEventConfig>) => void
  updateCustomHooks: (custom: Record<string, CustomHookDef>) => void
  updateFieldPermission: (path: string, patch: FieldPermission) => void
  undo: () => void
  redo: () => void
  clear: () => void
  importSchema: (json: string) => ImportResult
  exportSchema: () => string
  /** 导出渲染规则（children 字段树，对应 form-create 的 rule） */
  exportRule: () => string
  /** 导出表单配置（form + events + dataSources，对应 form-create 的 options） */
  exportOptions: () => string
  /** 导入渲染规则（仅替换字段树，保留当前表单配置） */
  importRule: (json: string) => ImportResult
  /** 导入表单配置（仅替换全局配置，保留当前字段树） */
  importOptions: (json: string) => ImportResult
  setSchema: (schema: FormSchema) => void
  getSelected: () => FieldSchema | null
}

function clone(schema: FormSchema): FormSchema {
  return JSON.parse(JSON.stringify(schema))
}

export const useDesignerStore = create<DesignerState>((set, get) => {
  /**
   * 所有结构/属性变更走此入口：深拷贝 → 变更 → 推历史；fn 返回 false 表示中止（no-op，不推历史）。
   * 传入 coalesceKey 时，若上次写入 key 相同且间隔 < 500ms，则不推新快照（连续编辑合并为一条历史）。
   */
  const mutate = (fn: (draft: FormSchema) => void | false, coalesceKey?: string) => {
    const { schema, past, lastCoalesce } = get()
    const draft = clone(schema)
    if (fn(draft) === false)
      return
    const now = Date.now()
    const merge = coalesceKey !== undefined
      && lastCoalesce?.key === coalesceKey
      && now - lastCoalesce.time < COALESCE_WINDOW
    set({
      schema: draft,
      past: merge ? past : [...past.slice(-(HISTORY_LIMIT - 1)), schema],
      future: [],
      lastCoalesce: coalesceKey === undefined ? null : { key: coalesceKey, time: now },
    })
  }

  return {
    schema: createEmptySchema(),
    selectedId: null,
    past: [],
    future: [],
    lastCoalesce: null,

    select: id => set({ selectedId: id }),

    addField: (type, target) => {
      const def = getComponent(type)
      if (!def)
        return
      mutate((draft) => {
        const list = childrenOf(draft, target.parentId)
        if (!list)
          return false
        const node = def.defaultSchema()
        node.id = uniqueId()
        if (node.field)
          node.field = uniqueId()
        list.splice(Math.min(target.index, list.length), 0, node)
        set({ selectedId: node.id })
      })
    },

    moveField: (id, target) => {
      if (target.parentId === id)
        return // 不能拖入自身
      const located = findNode(get().schema.children, id)
      if (!located)
        return
      if (target.parentId && isDescendant(located.node, target.parentId))
        return // 不能拖入自身子树
      mutate((draft) => {
        // 摘除前先在 draft 内定位，记录同列表相对位置
        const draftLocated = findNode(draft.children, id)
        const draftTargetList = childrenOf(draft, target.parentId)
        if (!draftLocated || !draftTargetList)
          return false
        const sameList = draftLocated.parentChildren === draftTargetList
        const fromIndex = draftLocated.index
        const node = removeNode(draft, id)!
        const list = childrenOf(draft, target.parentId)!
        const index = sameList && fromIndex < target.index ? target.index - 1 : target.index
        list.splice(Math.min(index, list.length), 0, node)
      })
    },

    removeField: (id) => {
      mutate((draft) => {
        if (!removeNode(draft, id))
          return false
        draft.permissions = pruneFieldPermissions(draft.permissions, draft.children)
      })
      // 删除的可能是包含选中节点的容器，统一校验选中态
      if (get().selectedId && !findNode(get().schema.children, get().selectedId!))
        set({ selectedId: null })
    },

    duplicateField: (id) => {
      mutate((draft) => {
        const located = findNode(draft.children, id)
        if (!located)
          return false
        const copy = cloneNode(located.node, uniqueId)
        located.parentChildren.splice(located.index + 1, 0, copy)
      })
    },

    updateField: (id, path, value, coalesce) => {
      mutate((draft) => {
        const located = findNode(draft.children, id)
        if (!located)
          return false
        const oldPermissionKey = path === 'field' ? getFieldPermissionKey(draft.children, id) : null
        setByPath(located.node as unknown as Record<string, any>, path, value)
        if (oldPermissionKey) {
          const newPermissionKey = getFieldPermissionKey(draft.children, id)
          if (newPermissionKey)
            draft.permissions = renameFieldPermissions(draft.permissions, oldPermissionKey, newPermissionKey)
        }
      }, coalesce ? `${id}:${path}` : undefined)
    },

    updateFormConfig: patch => mutate(draft => void Object.assign(draft.form, patch)),

    // coalesceKey：钩子编辑是逐键写入，合并 500ms 窗口内的连续编辑，避免每个按键占一条历史
    updateEvents: patch => mutate((draft) => {
      draft.events = { ...(draft.events || {}), ...patch }
    }, 'events'),

    updateCustomHooks: custom => mutate((draft) => {
      draft.events = { ...(draft.events || {}), custom }
    }, 'events:custom'),

    updateFieldPermission: (path, patch) => mutate((draft) => {
      const next: FieldPermission = {
        ...(draft.permissions?.[path] ?? {}),
        ...patch,
      }
      if (next.visible !== false)
        delete next.visible
      if (next.editable !== false)
        delete next.editable
      if (next.required !== true)
        delete next.required

      const permissions = { ...(draft.permissions ?? {}) }
      if (Object.keys(next).length)
        permissions[path] = next
      else
        delete permissions[path]
      draft.permissions = Object.keys(permissions).length ? permissions : undefined
    }, `permission:${path}`),

    undo: () => {
      const { past, schema, future } = get()
      if (!past.length)
        return
      set({
        schema: past[past.length - 1],
        past: past.slice(0, -1),
        future: [schema, ...future],
        selectedId: null,
        lastCoalesce: null,
      })
    },

    redo: () => {
      const { past, schema, future } = get()
      if (!future.length)
        return
      set({
        schema: future[0],
        past: [...past, schema],
        future: future.slice(1),
        selectedId: null,
        lastCoalesce: null,
      })
    },

    clear: () => mutate((draft) => {
      draft.children = []
      draft.permissions = pruneFieldPermissions(draft.permissions, draft.children)
    }),

    importSchema: (json) => {
      let parsed: FormSchema
      try {
        parsed = parseSchema(json)
      }
      catch (e: any) {
        return { ok: false, reason: e?.message || 'JSON 格式不正确，未导入' }
      }
      // 过滤缺 id/type 的脏节点（深层递归校验留给后续）；校验只针对真正会装载的节点
      const children = parsed.children.filter(
        (c: any) => typeof c?.id === 'string' && typeof c?.type === 'string',
      )
      const issues = validateSchemaFieldNames({ ...parsed, children })
      if (issues.length) {
        const brief = issues.slice(0, 3).join('；')
        return { ok: false, reason: `字段名校验未通过，未导入：${brief}${issues.length > 3 ? ' 等' : ''}` }
      }
      mutate((draft) => {
        draft.form = parsed.form
        draft.children = children
        // events / dataSources 也必须回填：否则「导出 → 导入」会静默丢掉全部钩子与数据源
        draft.events = parsed.events
        draft.dataSources = parsed.dataSources
        draft.permissions = pruneFieldPermissions(parsed.permissions, children)
      })
      set({ selectedId: null })
      return { ok: true }
    },

    exportSchema: () => JSON.stringify(get().schema, null, 2),

    exportRule: () => JSON.stringify(get().schema.children, null, 2),

    exportOptions: () => {
      const { schema } = get()
      return JSON.stringify({
        form: schema.form,
        events: schema.events,
        dataSources: schema.dataSources,
        permissions: schema.permissions,
      }, null, 2)
    },

    importRule: (json) => {
      let children: any[]
      try {
        children = JSON.parse(json)
      }
      catch {
        return { ok: false, reason: '渲染规则不是合法 JSON' }
      }
      if (!Array.isArray(children))
        return { ok: false, reason: '渲染规则应为字段树数组' }
      const valid = children.filter(
        (c: any) => typeof c?.id === 'string' && typeof c?.type === 'string',
      )
      if (!valid.length)
        return { ok: false, reason: '渲染规则中没有有效字段节点' }
      mutate((draft) => {
        draft.children = valid
        draft.permissions = pruneFieldPermissions(draft.permissions, valid)
      })
      set({ selectedId: null })
      return { ok: true }
    },

    importOptions: (json) => {
      let options: any
      try {
        options = JSON.parse(json)
      }
      catch {
        return { ok: false, reason: '表单配置不是合法 JSON' }
      }
      if (!options || typeof options !== 'object' || Array.isArray(options))
        return { ok: false, reason: '表单配置应为对象' }
      mutate((draft) => {
        if (options.form !== undefined)
          draft.form = { ...draft.form, ...options.form }
        if (options.events !== undefined)
          draft.events = options.events
        if (options.dataSources !== undefined)
          draft.dataSources = options.dataSources
        if (options.permissions !== undefined)
          draft.permissions = options.permissions
      })
      return { ok: true }
    },

    setSchema: schema => set({ schema, selectedId: null, past: [], future: [], lastCoalesce: null }),

    getSelected: () => {
      const { schema, selectedId } = get()
      if (!selectedId)
        return null
      return findNode(schema.children, selectedId)?.node ?? null
    },
  }
})
