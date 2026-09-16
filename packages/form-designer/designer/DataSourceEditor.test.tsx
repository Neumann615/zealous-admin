// @vitest-environment jsdom
import type { FieldDataSource } from '../types/schema'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { setFormDataApiCatalog } from '../renderer/dataApis'
import { DataSourceEditor } from './DataSourceEditor'
import { dataSourceKind, withDataSourceKind } from './dataSourceType'
import '../test/setupDom'

afterEach(cleanup)

/** 展开第 index 个下拉并点选文案命中的选项（antd Select 的交互方式） */
async function pickOption(index: number, label: string) {
  fireEvent.mouseDown(screen.getAllByRole('combobox')[index])
  const option = await waitFor(() => {
    const holder = document.querySelector('.rc-virtual-list-holder') as HTMLElement | null
    if (holder) {
      holder.scrollTop = 10000
      fireEvent.scroll(holder)
    }
    const el = [...document.querySelectorAll('.ant-select-item-option')].find(o => o.textContent?.includes(label))
    if (!el)
      throw new Error(`下拉里没有「${label}」`)
    return el as HTMLElement
  })
  fireEvent.click(option)
}

describe('数据来源面板归一化', () => {
  it('按 def / ref 判定当前类型，def 优先', () => {
    expect(dataSourceKind(undefined)).toBeUndefined()
    expect(dataSourceKind({ ref: 'shared' })).toBe('ref')
    expect(dataSourceKind({ def: { type: 'static', options: [] } })).toBe('static')
    expect(dataSourceKind({ ref: 'shared', def: { type: 'dict', dictType: 'sex' } })).toBe('dict')
  })

  it('切类型时丢弃无关参数（含 def / ref 二选一），保留 watch 与 debounce', () => {
    const previous: FieldDataSource = {
      def: { type: 'api', api: 'orgTree', params: { id: '{{dept}}' }, parse: 'data' },
      watch: ['dept'],
      debounce: 500,
    }

    expect(withDataSourceKind(previous, 'dict')).toEqual({
      watch: ['dept'],
      debounce: 500,
      def: { type: 'dict', dictType: '' },
    })
    expect(withDataSourceKind(previous, 'ref')).toEqual({ watch: ['dept'], debounce: 500, ref: '' })
  })

  it('同类型之间切换保留已填参数（api → api 保住注册名、参数与 parse）', () => {
    const previous: FieldDataSource = { def: { type: 'api', api: 'orgTree', params: { id: '1' }, parse: 'data.list' } }

    expect(withDataSourceKind(previous, 'api')).toEqual({
      def: { type: 'api', api: 'orgTree', params: { id: '1' }, parse: 'data.list' },
    })
    expect(withDataSourceKind({ def: { type: 'dict', dictType: 'sex' } }, 'dict')).toEqual({ def: { type: 'dict', dictType: 'sex' } })
  })

  it('静态选项从 static 切走再切回时不残留旧选项', () => {
    const previous: FieldDataSource = { def: { type: 'static', options: [{ label: 'A', value: 'a' }] } }
    const dict = withDataSourceKind(previous, 'dict')

    expect(dict.def).toEqual({ type: 'dict', dictType: '' })
    expect(withDataSourceKind(dict, 'static')).toEqual({ def: { type: 'static', options: [] } })
  })
})

describe('数据来源编辑器（DataSourceEditor）', () => {
  it('清空来源类型整体回传 undefined', async () => {
    const onChange = vi.fn()
    render(
      <DataSourceEditor
        value={{ def: { type: 'static', options: [] } }}
        onChange={onChange}
      />,
    )

    const clear = document.querySelector('.ant-select-clear') as HTMLElement
    fireEvent.mouseDown(clear)
    fireEvent.click(clear)
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(undefined))
  })

  it('切到字典类型写回空 dictType（由保存拦截提示补全），并丢弃原接口参数', async () => {
    const onChange = vi.fn()
    render(
      <DataSourceEditor
        value={{ def: { type: 'api', api: 'orgTree', params: { id: '1' } }, watch: ['dept'] }}
        onChange={onChange}
      />,
    )

    await pickOption(0, '字典')
    expect(onChange).toHaveBeenCalledWith({ watch: ['dept'], def: { type: 'dict', dictType: '' } })
  })

  it('字典类型下填 dictType 与字段映射', () => {
    const onChange = vi.fn()
    render(<DataSourceEditor value={{ def: { type: 'dict', dictType: '' } }} onChange={onChange} />)

    fireEvent.change(screen.getByPlaceholderText('字典类型 dictType'), { target: { value: 'sys_sex' } })
    expect(onChange).toHaveBeenCalledWith({ def: { type: 'dict', dictType: 'sys_sex' } })
  })

  it('接口类型未提供清单时退化为自由文本并提示', () => {
    setFormDataApiCatalog([])
    render(<DataSourceEditor value={{ def: { type: 'api', api: '' } }} onChange={vi.fn()} />)

    expect(screen.getByPlaceholderText('宿主注册的接口名')).toBeTruthy()
    expect(screen.getByText(/未提供接口清单/)).toBeTruthy()
  })

  it('接口类型有清单时给下拉，选中写回注册名', async () => {
    setFormDataApiCatalog(['dict', 'orgTree'])
    const onChange = vi.fn()
    render(<DataSourceEditor value={{ def: { type: 'api', api: '' } }} onChange={onChange} />)

    // 0 号是来源类型下拉，接口名下拉是 1 号
    await pickOption(1, 'orgTree')
    expect(onChange).toHaveBeenCalledWith({ def: { type: 'api', api: 'orgTree' } })
    setFormDataApiCatalog([])
  })

  it('接口参数键值对写回 params（值支持插值占位符）', () => {
    setFormDataApiCatalog(['orgTree'])
    const onChange = vi.fn()
    render(<DataSourceEditor value={{ def: { type: 'api', api: 'orgTree', params: { deptId: '' } } }} onChange={onChange} />)

    fireEvent.change(screen.getByPlaceholderText('值，支持 {{字段}}'), { target: { value: '{{dept}}' } })
    expect(onChange).toHaveBeenCalledWith({
      def: { type: 'api', api: 'orgTree', params: { deptId: '{{dept}}' } },
    })
    setFormDataApiCatalog([])
  })

  it('依赖字段多选写回 watch（空数组回落 undefined）', async () => {
    const onChange = vi.fn()
    render(
      <DataSourceEditor
        value={{ def: { type: 'static', options: [] } }}
        fieldNames={['city', 'contact.name']}
        onChange={onChange}
      />,
    )

    await pickOption(1, 'contact.name')
    expect(onChange).toHaveBeenCalledWith({
      def: { type: 'static', options: [] },
      watch: ['contact.name'],
    })
  })

  it('防抖写回数值，清空时删掉该键', () => {
    const onChange = vi.fn()
    render(
      <DataSourceEditor
        value={{ def: { type: 'static', options: [] }, debounce: 300 }}
        onChange={onChange}
      />,
    )

    fireEvent.change(screen.getByPlaceholderText('300'), { target: { value: '' } })
    expect(onChange).toHaveBeenCalledWith({ def: { type: 'static', options: [] } })
  })

  it('引用类型没有命名数据源时给自由文本与提示', () => {
    render(<DataSourceEditor value={{ ref: 'shared' }} dataSourceNames={[]} onChange={vi.fn()} />)

    expect(screen.getByPlaceholderText('命名数据源名字')).toBeTruthy()
    expect(screen.getByText(/还没有命名数据源/)).toBeTruthy()
  })

  it('接口参数名连续输入时不丢焦点（参数名不能当 React key）', () => {
    setFormDataApiCatalog(['orgTree'])

    // 受控组件：用带状态的宿主承接 onChange，才能验证「连续输入」的结果
    function Harness() {
      const [value, setValue] = useState<FieldDataSource>({ def: { type: 'api', api: 'orgTree', params: { deptId: '' } } })
      return <DataSourceEditor value={value} onChange={next => setValue(next ?? {})} />
    }
    render(<Harness />)

    const keyInput = screen.getByPlaceholderText('参数名')
    keyInput.focus()
    fireEvent.change(keyInput, { target: { value: 'd' } })
    expect(document.activeElement).toBe(screen.getByPlaceholderText('参数名'))
    fireEvent.change(keyInput, { target: { value: 'd' } })
    fireEvent.change(keyInput, { target: { value: 'de' } })
    fireEvent.change(keyInput, { target: { value: 'dept' } })

    // 焦点仍在同一个输入框（key 用了参数名的话，每次按键会重挂节点、焦点掉到 body）
    expect(document.activeElement).toBe(screen.getByPlaceholderText('参数名'))
    expect((screen.getByPlaceholderText('参数名') as HTMLInputElement).value).toBe('dept')
    setFormDataApiCatalog([])
  })

  it('切到静态选项时用组件属性里的选项播种初值（不静默清空已有选项）', async () => {
    const onChange = vi.fn()
    render(
      <DataSourceEditor
        value={{ def: { type: 'dict', dictType: 'sys' } }}
        componentOptions={[{ label: '甲', value: 'a' }]}
        onChange={onChange}
      />,
    )

    await pickOption(0, '静态选项')
    expect(onChange).toHaveBeenCalledWith({ def: { type: 'static', options: [{ label: '甲', value: 'a' }] } })
  })

  it('切到静态选项且没有组件属性选项时落空数组', async () => {
    const onChange = vi.fn()
    render(<DataSourceEditor value={{ def: { type: 'dict', dictType: 'sys' } }} onChange={onChange} />)

    await pickOption(0, '静态选项')
    expect(onChange).toHaveBeenCalledWith({ def: { type: 'static', options: [] } })
  })

  it('解析不了的监听字段就地红字提示', () => {
    render(
      <DataSourceEditor
        value={{ def: { type: 'static', options: [] }, watch: ['items.title'] }}
        pathIssueOf={path => (path === 'items.title' ? '「items」是数组容器：行内字段要带行下标，如 items.0.title' : null)}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByText('监听字段「items.title」：「items」是数组容器：行内字段要带行下标，如 items.0.title')).toBeTruthy()
    expect(screen.getByText(/数组行内字段的名路径要带行下标/)).toBeTruthy()
  })
})
