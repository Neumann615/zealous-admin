import type { MetadataItem, MetadataSet } from './contracts/metadata'
// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { App as AntdApp } from 'antd'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { MetadataManager } from './management'
import { getOptionSetByCodeAPI, getOptionSetPageAPI } from './services/metadata'

vi.mock('./services/metadata', () => ({
  changeOptionSetItemStatusAPI: vi.fn(),
  changeOptionSetStatusAPI: vi.fn(),
  createOptionSetAPI: vi.fn(),
  createOptionSetItemAPI: vi.fn(),
  deleteOptionSetAPI: vi.fn(),
  deleteOptionSetItemAPI: vi.fn(),
  getOptionSetByCodeAPI: vi.fn(),
  getOptionSetPageAPI: vi.fn(),
  updateOptionSetAPI: vi.fn(),
  updateOptionSetItemAPI: vi.fn(),
}))

const set: MetadataSet = {
  id: 1,
  code: 'ORGANIZATION',
  name: '组织机构',
  status: 1,
  itemCount: 2,
}

const child: MetadataItem = {
  id: 2,
  setId: 1,
  parentId: 1,
  code: 'RD',
  name: '研发中心',
  sortOrder: 0,
  status: 1,
}

const root: MetadataItem = {
  id: 1,
  setId: 1,
  parentId: null,
  code: 'HQ',
  name: '集团总部',
  sortOrder: 0,
  status: 1,
  children: [child],
}

describe('metadataManager', () => {
  beforeAll(() => {
    class ResizeObserverMock {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
    }
    Object.defineProperty(window, 'ResizeObserver', {
      writable: true,
      value: ResizeObserverMock,
    })
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('加载编码集并展示树形编码项', async () => {
    vi.mocked(getOptionSetPageAPI).mockResolvedValue({
      list: [set],
      total: 1,
      pageNum: 1,
      pageSize: 10,
    })
    vi.mocked(getOptionSetByCodeAPI).mockResolvedValue({
      set,
      items: [root],
    })

    render(
      <AntdApp>
        <MetadataManager />
      </AntdApp>,
    )

    await waitFor(() => expect(screen.getByText('组织机构')).toBeTruthy())
    await waitFor(() => expect(screen.getByText('集团总部')).toBeTruthy())
    await waitFor(() => expect(screen.getByText('研发中心')).toBeTruthy())
    expect(getOptionSetPageAPI).toHaveBeenCalledWith(expect.objectContaining({
      pageNum: 1,
      pageSize: 10,
    }))
    expect(getOptionSetByCodeAPI).toHaveBeenCalledWith('ORGANIZATION', {
      includeDisabled: true,
      signal: undefined,
    })
  })
})
