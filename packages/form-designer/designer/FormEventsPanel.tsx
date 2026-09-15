import type { CSSProperties } from 'react'
import type { CustomHookDef, HookRef, HookScene } from '../events/types'
import { Button, Divider, Input, InputNumber, Radio, Select, Space, Switch } from 'antd'
import { makeFnSource } from '../events/fnSource'
import { HOOK_ARGS, HookEditor } from './HookEditor'
import { useDesignerStore } from './store'

/** 配置项标题/名称的统一字号与颜色（与 ConfigFormRenderer 的行内写法一致） */
const fieldLabelStyle: CSSProperties = { fontSize: 12, color: '#666' }

/** 场景清单：顺序即面板显示顺序，hint 说明该场景的触发时机与入参要点 */
const SCENES: ReadonlyArray<{ scene: HookScene, label: string, hint: string }> = [
  { scene: 'onFormCreated', label: '表单创建后', hint: '已创建、未挂载' },
  { scene: 'onFormMounted', label: '表单挂载后', hint: '可在此拉取初始数据' },
  { scene: 'onFormUnmount', label: '表单卸载前', hint: '清理副作用' },
  {
    scene: 'onFieldChange',
    label: '字段值变化',
    hint: '可用 watch 限定字段；嵌套字段（子表单/表格子表单内）变化只上报顶层段名，watch 写 contact.name 不会命中',
  },
  { scene: 'beforeLoadData', label: '加载数据前', hint: '返回 false 中断加载（数据源接入后生效）' },
  { scene: 'afterLoadData', label: '加载数据后', hint: '数据源接入后生效' },
  { scene: 'beforeSubmit', label: '提交前', hint: '返回 false 中断提交' },
  { scene: 'onValidateFail', label: '校验失败', hint: '校验未通过时触发' },
  { scene: 'afterSubmit', label: '提交成功后', hint: 'onSubmit 正常返回后触发' },
  { scene: 'onSubmitError', label: '提交失败', hint: 'onSubmit 抛错后触发' },
  { scene: 'onReset', label: '重置后', hint: '重置按钮点击后触发' },
  { scene: 'onReload', label: '重载数据', hint: '数据源接入后生效' },
]

function FormConfig() {
  const { schema, updateFormConfig } = useDesignerStore()
  const { form } = schema
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <div style={{ ...fieldLabelStyle, marginBottom: 4 }}>布局</div>
        <Radio.Group
          size="small"
          value={form.layout}
          onChange={e => updateFormConfig({ layout: e.target.value })}
          options={[
            { label: '水平', value: 'horizontal' },
            { label: '垂直', value: 'vertical' },
            { label: '行内', value: 'inline' },
          ]}
          optionType="button"
        />
      </div>
      <div>
        <div style={{ ...fieldLabelStyle, marginBottom: 4 }}>标签对齐</div>
        <Select
          size="small"
          style={{ width: '100%' }}
          value={form.labelAlign}
          onChange={v => updateFormConfig({ labelAlign: v })}
          options={[{ label: '右对齐', value: 'right' }, { label: '左对齐', value: 'left' }]}
        />
      </div>
      <div>
        <div style={{ ...fieldLabelStyle, marginBottom: 4 }}>尺寸</div>
        <Select
          size="small"
          style={{ width: '100%' }}
          value={form.size}
          onChange={v => updateFormConfig({ size: v })}
          options={[{ label: '大', value: 'large' }, { label: '中', value: 'middle' }, { label: '小', value: 'small' }]}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={fieldLabelStyle}>显示冒号</span>
        <Switch size="small" checked={!!form.colon} onChange={v => updateFormConfig({ colon: v })} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={fieldLabelStyle}>整体禁用</span>
        <Switch size="small" checked={!!form.disabled} onChange={v => updateFormConfig({ disabled: v })} />
      </div>
      <div>
        <div style={{ ...fieldLabelStyle, marginBottom: 4 }}>标签宽度</div>
        <InputNumber
          size="small"
          style={{ width: '100%' }}
          min={20}
          max={300}
          value={form.labelWidth}
          onChange={v => updateFormConfig({ labelWidth: v ?? undefined })}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={fieldLabelStyle}>隐藏必填星号</span>
        <Switch size="small" checked={!!form.hideRequiredAsterisk} onChange={v => updateFormConfig({ hideRequiredAsterisk: v })} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={fieldLabelStyle}>提交按钮</span>
        <Switch size="small" checked={form.submitBtn ?? true} onChange={v => updateFormConfig({ submitBtn: v })} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={fieldLabelStyle}>重置按钮</span>
        <Switch size="small" checked={form.resetBtn ?? true} onChange={v => updateFormConfig({ resetBtn: v })} />
      </div>
    </div>
  )
}

export function FormEventsPanel() {
  const { schema, updateEvents, updateCustomHooks } = useDesignerStore()
  const events = schema.events || {}
  const custom = events.custom || {}
  const customNames = Object.keys(custom)

  const setRefs = (scene: HookScene, refs: HookRef[]) => {
    const patch: Partial<Record<HookScene, HookRef[]>> = {}
    patch[scene] = refs
    updateEvents(patch)
  }

  const addRef = (scene: HookScene) => {
    setRefs(scene, [...(events[scene] || []), { fn: makeFnSource(HOOK_ARGS, '') }])
  }

  const patchRef = (scene: HookScene, index: number, patch: Partial<HookRef>) => {
    setRefs(scene, (events[scene] || []).map((ref, i) => {
      if (i !== index)
        return ref
      const next = { ...ref, ...patch }
      // 归一化：清空引用（Select 的 allowClear 回传 undefined）后既无 fn 也无 hook 的引用会被
      // 序列化成 {}，保存侧放行、回读时整张表单解析失败。空正文是合法的「什么都不做」。
      // 回落必须保留 ref 上原有字段（watch / order 没有面板入口，只能来自导入的 JSON），
      // 否则在面板里点一下引用下拉就会把它们静默抹掉
      return next.fn || next.hook ? next : { ...next, fn: makeFnSource(HOOK_ARGS, '') }
    }))
  }

  const moveUp = (scene: HookScene, index: number) => {
    if (index === 0)
      return
    const refs = [...(events[scene] || [])]
    ;[refs[index - 1], refs[index]] = [refs[index], refs[index - 1]]
    setRefs(scene, refs)
  }

  const removeRef = (scene: HookScene, index: number) => {
    setRefs(scene, (events[scene] || []).filter((_, i) => i !== index))
  }

  const addCustom = () => {
    let n = 1
    while (custom[`event_${n}`])
      n++
    updateCustomHooks({
      ...custom,
      [`event_${n}`]: { label: `公共事件 ${n}`, fn: makeFnSource(HOOK_ARGS, '') },
    })
  }

  const patchCustom = (name: string, patch: Partial<CustomHookDef>) => {
    updateCustomHooks({ ...custom, [name]: { ...custom[name], ...patch } })
  }

  const removeCustom = (name: string) => {
    const next = { ...custom }
    delete next[name]
    updateCustomHooks(next)
  }

  return (
    <div style={{ padding: 12 }}>
      <Divider titlePlacement="start" plain style={{ margin: '4px 0 12px' }}>表单配置</Divider>
      <FormConfig />

      <Divider titlePlacement="start" plain style={{ margin: '16px 0 12px' }}>全局事件</Divider>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {SCENES.map(({ scene, label, hint }) => {
          const refs = events[scene] || []
          return (
            <div key={scene}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div>
                  <div style={fieldLabelStyle}>{label}</div>
                  <div style={{ fontSize: 12, color: '#999' }}>{hint}</div>
                </div>
                <Button size="small" onClick={() => addRef(scene)}>添加钩子</Button>
              </div>
              {refs.map((ref, index) => (
                <div
                  // eslint-disable-next-line react/no-array-index-key -- HookEditor 受控无本地状态，重挂只影响焦点、不会读到过期正文
                  key={`${scene}-${index}-${ref.hook ?? ''}`}
                  style={{ marginTop: 8, padding: 8, border: '1px solid #f0f0f0', borderRadius: 4 }}
                >
                  <HookEditor
                    value={ref.fn}
                    // 内联正文与按名引用互斥：resolveFn 以 fn 优先，留着旧的 fn 会让公共事件永远不执行
                    onChange={fn => patchRef(scene, index, { fn, hook: undefined })}
                  />
                  <Space size={4} style={{ marginTop: 8, width: '100%' }}>
                    <Select
                      size="small"
                      style={{ minWidth: 160 }}
                      allowClear
                      placeholder="引用公共事件"
                      value={ref.hook}
                      onChange={v => patchRef(scene, index, { hook: v, fn: undefined })}
                      options={customNames.map(name => ({ label: custom[name]?.label || name, value: name }))}
                    />
                    <Button size="small" disabled={index === 0} onClick={() => moveUp(scene, index)}>上移</Button>
                    <Button size="small" danger onClick={() => removeRef(scene, index)}>删除</Button>
                  </Space>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      <Divider titlePlacement="start" plain style={{ margin: '16px 0 12px' }}>公共事件</Divider>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {customNames.map(name => (
          <div key={name} style={{ padding: 8, border: '1px solid #f0f0f0', borderRadius: 4 }}>
            <Space size={4} style={{ marginBottom: 8, width: '100%' }}>
              <span style={{ ...fieldLabelStyle, fontFamily: 'monospace' }}>{name}</span>
              <Input
                size="small"
                style={{ width: 140 }}
                value={custom[name]?.label}
                placeholder="事件名称"
                onChange={e => patchCustom(name, { label: e.target.value })}
              />
              <Button size="small" danger onClick={() => removeCustom(name)}>删除</Button>
            </Space>
            <HookEditor
              value={custom[name]?.fn}
              onChange={fn => patchCustom(name, { fn })}
            />
          </div>
        ))}
        <Button size="small" onClick={addCustom}>新增公共事件</Button>
      </div>
    </div>
  )
}
