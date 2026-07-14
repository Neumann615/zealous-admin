import { FrownOutlined, SearchOutlined, SmileOutlined } from '@ant-design/icons'
import { Input, Modal } from 'antd'
import { createStyles } from 'antd-style'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useControlTab } from '../../hooks/useControlTab'
import { useMenuStore } from '../../store/menu'

// 扁平化菜单树，仅返回叶子节点（对应实际页面路由）
function flattenMenu(items: any[]): any[] {
  return items.flatMap((item) => {
    const children = item.children || []
    if (children.length === 0) {
      return [{ label: item.label, key: item.key, icon: item.icon }]
    }
    return flattenMenu(children)
  })
}

const useStyles = createStyles(({ token, css }) => ({
  trigger: css`
    cursor: pointer;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.3s;
    color: ${token.colorIcon};
    font-size: 18px;

    :hover {
      transition: all 0.3s;
      background-color: ${token.colorFillContentHover};
    }
  `,

  modal: css`
    .ant-modal-content {
      padding: 0 !important;
    }
  `,

  container: css`
    display: flex;
    flex-direction: column;
    max-height: 560px;
  `,

  searchArea: css`
    padding: 0;
  `,

  resultsArea: css`
    flex: 1;
    overflow-y: auto;
    padding: 0 12px 12px;
    min-height: 200px;

    &::-webkit-scrollbar {
      width: 4px;
    }
    &::-webkit-scrollbar-thumb {
      background: ${token.colorFillSecondary};
      border-radius: 2px;
    }
  `,

  resultItem: css`
    display: flex;
    flex-direction: column;
    padding: 10px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s;
  `,

  resultItemActive: css`
    background: ${token.colorFillContent};
  `,

  resultLabel: css`
    font-size: 14px;
    color: ${token.colorText};
    line-height: 1.5;
  `,

  resultPath: css`
    font-size: 12px;
    color: ${token.colorTextTertiary};
    line-height: 1.4;
    margin-top: 2px;
    font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
  `,

  empty: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 200px;
    color: ${token.colorTextQuaternary};
    font-size: 14px;
    gap: 8px;
  `,

  emptyIcon: css`
    font-size: 48px;
    color: ${token.colorTextQuaternary};
  `,

  hints: css`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
    padding: 8px 16px;
    border-top: 1px solid ${token.colorBorderSecondary};
    font-size: 12px;
    color: ${token.colorTextQuaternary};
  `,

  hintKey: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 22px;
    height: 20px;
    padding: 0 5px;
    margin: 0 3px;
    border-radius: 3px;
    background: ${token.colorFillTertiary};
    font-size: 11px;
    color: ${token.colorTextSecondary};
    font-family: inherit;
    box-shadow: 0 1px 0 ${token.colorFillSecondary};
  `,

  highlight: css`
    color: ${token.colorPrimary};
    font-weight: 500;
  `,
}))

export function Search() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<any>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const { mainNavData } = useMenuStore()
  const { openTab } = useControlTab()
  const { styles } = useStyles()

  // 扁平化菜单获取所有叶子页面
  const allItems = useMemo(() => {
    return flattenMenu(mainNavData)
  }, [mainNavData])

  // 根据查询过滤结果
  const results = useMemo(() => {
    if (!query.trim())
      return []
    const q = query.toLowerCase().trim()
    return allItems.filter(
      item =>
        item.label.toLowerCase().includes(q)
        || item.key.toLowerCase().includes(q),
    )
  }, [query, allItems])

  // 结果变化时重置选中索引
  useEffect(() => {
    setSelectedIndex(0)
  }, [results])

  // 弹窗打开时自动聚焦输入框
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
    else {
      setQuery('')
    }
  }, [open])

  // 选中项滚动到可视区域
  useEffect(() => {
    if (listRef.current) {
      const activeItem = listRef.current.querySelector('[data-active="true"]') as HTMLElement
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  const navigateToItem = useCallback(
    (item: any) => {
      openTab({ key: item.key, label: item.label, icon: item.icon })
      setOpen(false)
    },
    [openTab],
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (results.length === 0)
      return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(i => (i + 1) % results.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(i => (i - 1 + results.length) % results.length)
        break
      case 'Enter':
        e.preventDefault()
        if (results[selectedIndex]) {
          navigateToItem(results[selectedIndex])
        }
        break
    }
  }

  const handleClose = () => {
    setOpen(false)
  }

  return (
    <>
      {/* 触发器按钮 */}
      <div className={styles.trigger} onClick={() => setOpen(true)}>
        <SearchOutlined />
      </div>

      {/* 搜索弹窗 */}
      <Modal
        open={open}
        onCancel={handleClose}
        footer={null}
        width={560}
        style={{ top: '8%' }}
        closable={false}
        maskClosable
        destroyOnClose
        className={styles.modal}
        styles={{
          header: { display: 'none' },
          body: { padding: 0 },
          container: { padding: 0 },
        }}
      >
        <div className={styles.container}>
          {/* 搜索输入区 */}
          <div className={styles.searchArea}>
            <Input
              ref={inputRef}
              placeholder="支持标题、URL模糊查询"
              prefix={<SearchOutlined />}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              size="large"
              variant="filled"
              allowClear
            />
          </div>

          {/* 结果列表 */}
          <div className={styles.resultsArea} ref={listRef}>
            {!query.trim()
              ? (
                  <div className={styles.empty}>
                    <SmileOutlined className={styles.emptyIcon} />
                    <div>输入你要搜索的导航</div>
                  </div>
                )
              : results.length === 0
                ? (
                    <div className={styles.empty}>
                      <FrownOutlined className={styles.emptyIcon} />
                      <div>没有找到你想要的</div>
                    </div>
                  )
                : (
                    results.map((item, index) => (
                      <div
                        key={item.key}
                        className={`${styles.resultItem} ${index === selectedIndex ? styles.resultItemActive : ''}`}
                        data-active={index === selectedIndex}
                        onClick={() => navigateToItem(item)}
                        onMouseEnter={() => setSelectedIndex(index)}
                      >
                        <div className={styles.resultLabel}>{item.label}</div>
                        <div className={styles.resultPath}>{item.key}</div>
                      </div>
                    ))
                  )}
          </div>

          {/* 键盘操作提示 */}
          <div className={styles.hints}>
            <span>
              <span className={styles.hintKey}>↑↓</span>
              切换
            </span>
            <span>
              <span className={styles.hintKey}>↵</span>
              跳转
            </span>
            <span>
              <span className={styles.hintKey}>Esc</span>
              关闭
            </span>
          </div>
        </div>
      </Modal>
    </>
  )
}
