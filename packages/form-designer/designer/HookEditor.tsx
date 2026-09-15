import type { FnSource } from '../events/fnSource'
import { Input } from 'antd'
import { makeFnSource, validateFnSource } from '../events/fnSource'

/**
 * 钩子可用形参：模型 A 下由配置声明，运行时按声明顺序注入。
 * 与组件同文件导出常量会让该模块失去 fast refresh，但常量与编辑器强绑定，拆文件不做收益。
 */
// eslint-disable-next-line react-refresh/only-export-components
export const HOOK_ARGS = ['ctx']

/**
 * 单个钩子的函数体编辑器。
 * 受控（正文直接读 value.body，不另存 state）：引用列表会被上移/删除/切换引用，
 * 本地 state 在这些外部变更下会残留旧正文，受控渲染天然不会读到过期内容。
 */
export function HookEditor({ value, onChange }: { value?: FnSource, onChange: (v?: FnSource) => void }) {
  const error = value ? validateFnSource(value) : null
  return (
    <div>
      <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
        {`可用参数：${HOOK_ARGS.join(' / ')}`}
      </div>
      <Input.TextArea
        rows={4}
        value={value?.body ?? ''}
        style={{ fontFamily: 'monospace', fontSize: 12 }}
        onChange={e => onChange(e.target.value.trim() ? makeFnSource(HOOK_ARGS, e.target.value) : undefined)}
      />
      {error && <div style={{ fontSize: 12, color: '#ff4d4f', marginTop: 4 }}>{error}</div>}
    </div>
  )
}
