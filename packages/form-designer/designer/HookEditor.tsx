import type { FnSource } from '../events/fnSource'
import { Input } from 'antd'
import { makeFnSource } from '../events/fnSource'
import { validateHookFn } from '../events/validateEvents'

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
 *
 * 永远产出合法的 FnSource：空正文是合法的「什么都不做」（删除钩子由删除按钮负责），
 * 产出 undefined 会序列化成 {} —— 保存侧 `if (ref.fn)` 判假放行、回读却过不了 parseSchema。
 * 正文不做 trim：否则从空正文起手打不进前导空格/换行。
 */
export function HookEditor({ value, onChange }: { value?: FnSource, onChange: (v: FnSource) => void }) {
  // 与保存/解析同一套口径（形参名 + 语法 + 正文长度），红字能提示的保存一定也能拦
  const error = value ? validateHookFn(value) : null
  return (
    <div>
      <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
        {`可用参数：${HOOK_ARGS.join(' / ')}`}
      </div>
      <Input.TextArea
        rows={4}
        value={value?.body ?? ''}
        style={{ fontFamily: 'monospace', fontSize: 12 }}
        onChange={e => onChange(makeFnSource(HOOK_ARGS, e.target.value))}
      />
      {error && <div style={{ fontSize: 12, color: '#ff4d4f', marginTop: 4 }}>{error}</div>}
    </div>
  )
}
