import type { DataSourceDef, DataSourceType, FieldDataSource, FieldOption } from '../types/schema'
import type { DataSourceKind } from './dataSourceType'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Checkbox, Input, InputNumber, Select } from 'antd'
import { getFormDataApiCatalog } from '../renderer/dataApis'
import { dataSourceKind, withDataSourceKind } from './dataSourceType'
import { OptionsEditor } from './OptionsEditor'

const KIND_OPTIONS: { label: string, value: DataSourceType | 'ref' }[] = [
  { label: '静态选项', value: 'static' },
  { label: '元数据编码', value: 'metadata' },
  { label: '宿主注册接口', value: 'api' },
  { label: '引用命名数据源', value: 'ref' },
]

interface DataSourceEditorProps {
  value?: FieldDataSource
  onChange?: (value: FieldDataSource | undefined) => void
  /** 可作为 watch 依赖的字段名路径（当前 schema 的全部字段） */
  fieldNames?: string[]
  /** schema.dataSources 里的命名数据源名（引用类型下拉用） */
  dataSourceNames?: string[]
  /** 组件属性里已配置的选项：切到「静态选项」时作为初值播种 */
  componentOptions?: FieldOption[]
  /** 名路径校验：解析不了时返回问题描述（数组行内字段要写成 items.0.title） */
  pathIssueOf?: (path: string) => string | null
  /** 宿主提供的编码集清单；未提供时保留手填兜底 */
  optionSets?: Array<{ code: string, name: string, status: number }>
}

/** 参数键值对编辑器（api 的 params）：值支持 {{字段}} 插值 */
function ParamsEditor({ value = {}, onChange }: {
  value?: Record<string, string>
  onChange: (value: Record<string, string>) => void
}) {
  const entries = Object.entries(value)

  const rename = (index: number, key: string) => {
    const next: Record<string, string> = {}
    entries.forEach(([k, v], i) => {
      next[i === index ? key : k] = v
    })
    onChange(next)
  }

  const setValue = (index: number, v: string) => {
    const next: Record<string, string> = {}
    entries.forEach(([k, old], i) => {
      next[k] = i === index ? v : old
    })
    onChange(next)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {entries.map(([key, v], index) => (
        // eslint-disable-next-line react/no-array-index-key -- 参数行按位置渲染：用参数名做 key 会让每次按键重挂节点、输入框丢焦点
        <div key={index} style={{ display: 'flex', gap: 6 }}>
          <Input size="small" placeholder="参数名" value={key} onChange={e => rename(index, e.target.value)} />
          <Input size="small" placeholder="值，支持 {{字段}}" value={v} onChange={e => setValue(index, e.target.value)} />
          <Button
            size="small"
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => onChange(Object.fromEntries(entries.filter((_, i) => i !== index)))}
          />
        </div>
      ))}
      <Button
        size="small"
        type="dashed"
        icon={<PlusOutlined />}
        onClick={() => onChange({ ...value, [`param${entries.length + 1}`]: '' })}
      >
        添加参数
      </Button>
    </div>
  )
}

/**
 * 数据来源配置：来源类型 → 对应参数 → 依赖与防抖。
 * 接口名来自宿主注入的清单（`setFormDataApiCatalog`）：没有清单时退化为自由文本输入并提示，
 * 因为包本体并不知道宿主注册了哪些名字。
 */
export function DataSourceEditor({
  value,
  onChange,
  fieldNames = [],
  dataSourceNames = [],
  componentOptions,
  pathIssueOf,
  optionSets,
}: DataSourceEditorProps) {
  const kind = dataSourceKind(value)
  const patch = (next: FieldDataSource) => onChange?.(next)
  const patchDef = (def: DataSourceDef) => patch({ ...(value ?? {}), def })

  const catalog = getFormDataApiCatalog()
  const setWatch = (watch: string[]) => patch({ ...(value ?? {}), watch: watch.length ? watch : undefined })
  const watchIssues = (value?.watch ?? []).map(path => ({ path, issue: pathIssueOf?.(path) })).filter(item => !!item.issue)
  const setDebounce = (debounce?: number) => {
    const next = { ...(value ?? {}) }
    if (typeof debounce === 'number')
      next.debounce = debounce
    else
      delete next.debounce
    patch(next)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Select
        size="small"
        allowClear
        placeholder="不启用"
        value={kind}
        options={KIND_OPTIONS}
        onChange={(next: DataSourceKind | undefined) => onChange?.(next ? withDataSourceKind(value, next, componentOptions) : undefined)}
      />
      <div style={{ fontSize: 12, color: '#999' }}>
        配置来源后，取数结果会覆盖组件属性里的选项（空列表同样覆盖）
      </div>

      {kind === 'static' && (
        <OptionsEditor
          value={value?.def?.type === 'static' ? value.def.options : []}
          onChange={options => patchDef({ type: 'static', options })}
        />
      )}

      {kind === 'metadata' && (
        <>
          {optionSets?.length
            ? (
                <Select
                  showSearch
                  optionFilterProp="label"
                  size="small"
                  placeholder="选择编码集"
                  value={value?.def?.type === 'metadata' && value.def.setCode ? value.def.setCode : undefined}
                  options={optionSets.map(item => ({
                    label: `${item.name}（${item.code}）`,
                    value: item.code,
                    disabled: item.status !== 1,
                  }))}
                  onChange={setCode => patchDef({ ...(value?.def as Extract<DataSourceDef, { type: 'metadata' }>), type: 'metadata', setCode })}
                />
              )
            : (
                <Input
                  size="small"
                  placeholder="编码集 setCode"
                  value={value?.def?.type === 'metadata' ? value.def.setCode : ''}
                  onChange={e => patchDef({ ...(value?.def as Extract<DataSourceDef, { type: 'metadata' }>), type: 'metadata', setCode: e.target.value })}
                />
              )}
          <Select
            size="small"
            allowClear
            placeholder="展示形态（默认平铺）"
            value={value?.def?.type === 'metadata' ? value.def.shape : undefined}
            options={[
              { label: '平铺', value: 'flat' },
              { label: '层级路径', value: 'path' },
              { label: '树结构', value: 'tree' },
            ]}
            onChange={shape => patchDef({
              ...(value?.def as Extract<DataSourceDef, { type: 'metadata' }>),
              type: 'metadata',
              shape,
            })}
          />
          <Checkbox
            checked={value?.def?.type === 'metadata' ? value.def.onlyValid ?? false : false}
            onChange={e => patchDef({
              ...(value?.def as Extract<DataSourceDef, { type: 'metadata' }>),
              type: 'metadata',
              onlyValid: e.target.checked || undefined,
            })}
          >
            只取有效数据
          </Checkbox>
          <div style={{ fontSize: 12, color: '#999' }}>元数据编码走宿主注册的 metadata 接口，包本体不发起请求</div>
        </>
      )}

      {kind === 'api' && (
        <>
          {catalog.length
            ? (
                <Select
                  size="small"
                  placeholder="选择宿主注册的接口名"
                  value={value?.def?.type === 'api' && value.def.api ? value.def.api : undefined}
                  options={catalog.map(name => ({ label: name, value: name }))}
                  onChange={api => patchDef({ ...(value?.def as Extract<DataSourceDef, { type: 'api' }>), type: 'api', api })}
                />
              )
            : (
                <>
                  <Input
                    size="small"
                    placeholder="宿主注册的接口名"
                    value={value?.def?.type === 'api' ? value.def.api : ''}
                    onChange={e => patchDef({ ...(value?.def as Extract<DataSourceDef, { type: 'api' }>), type: 'api', api: e.target.value })}
                  />
                  <div style={{ fontSize: 12, color: '#ff4d4f' }}>未提供接口清单（宿主未调用 setFormDataApiCatalog）</div>
                </>
              )}
          <ParamsEditor
            value={value?.def?.type === 'api' ? value.def.params : undefined}
            onChange={params => patchDef({ ...(value?.def as Extract<DataSourceDef, { type: 'api' }>), type: 'api', params })}
          />
          <Input
            size="small"
            placeholder="取值路径 parse（如 data.list，可留空）"
            value={value?.def?.type === 'api' ? value.def.parse ?? '' : ''}
            onChange={e => patchDef({
              ...(value?.def as Extract<DataSourceDef, { type: 'api' }>),
              type: 'api',
              parse: e.target.value || undefined,
            })}
          />
        </>
      )}

      {kind === 'ref' && (
        <>
          {dataSourceNames.length
            ? (
                <Select
                  size="small"
                  placeholder="选择命名数据源"
                  value={value?.ref || undefined}
                  options={dataSourceNames.map(name => ({ label: name, value: name }))}
                  onChange={ref => patch({ ...(value ?? {}), ref })}
                />
              )
            : (
                <>
                  <Input
                    size="small"
                    placeholder="命名数据源名字"
                    value={value?.ref ?? ''}
                    onChange={e => patch({ ...(value ?? {}), ref: e.target.value })}
                  />
                  <div style={{ fontSize: 12, color: '#999' }}>schema.dataSources 里还没有命名数据源</div>
                </>
              )}
        </>
      )}

      {kind && (
        <>
          <div style={{ fontSize: 12, color: '#666' }}>依赖字段（这些字段变化时重新取数）</div>
          <Select
            size="small"
            mode="multiple"
            allowClear
            placeholder="默认不监听，只在挂载与手动重载时取数"
            value={value?.watch ?? []}
            options={fieldNames.map(name => ({ label: name, value: name }))}
            onChange={setWatch}
          />
          {watchIssues.map(item => (
            <div key={item.path} style={{ fontSize: 12, color: '#ff4d4f' }}>
              {`监听字段「${item.path}」：${item.issue}`}
            </div>
          ))}
          <div style={{ fontSize: 12, color: '#999' }}>
            数组行内字段的名路径要带行下标（如 items.0.title），行下标是运行期才有的，只能手写
          </div>
          <div style={{ fontSize: 12, color: '#666' }}>防抖（ms，默认 300）</div>
          <InputNumber
            size="small"
            min={0}
            style={{ width: '100%' }}
            placeholder="300"
            value={value?.debounce ?? null}
            onChange={v => setDebounce(typeof v === 'number' ? v : undefined)}
          />
        </>
      )}
    </div>
  )
}
