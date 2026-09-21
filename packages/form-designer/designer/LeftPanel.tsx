import type { ComponentDef } from '../registry/registry'
import { useDraggable } from '@dnd-kit/react'
import { Collapse, Input, Tabs } from 'antd'
import { createStyles } from 'antd-style'
import { useMemo, useState } from 'react'
import { getMenus } from '../registry/registry'
import { OutlinePanel } from './OutlinePanel'

const useStyles = createStyles(({ token, css }) => ({
  panel: css`
    padding: ${token.paddingSM}px;
  `,
  item: css`
    display: flex;
    align-items: center;
    gap: ${token.marginXS}px;
    padding: 6px 10px;
    margin-bottom: ${token.marginXS}px;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadius}px;
    cursor: grab;
    font-size: ${token.fontSizeSM}px;
    background: ${token.colorBgContainer};
    user-select: none;
    &:hover {
      border-color: ${token.colorPrimary};
      color: ${token.colorPrimary};
    }
  `,
}))

function PaletteItem({ def }: { def: ComponentDef }) {
  const { styles } = useStyles()
  const { ref } = useDraggable({
    id: `palette-${def.type}`,
    data: { kind: 'palette', type: def.type },
  })
  return (
    <div ref={ref} className={styles.item}>
      {def.icon}
      <span>{def.title}</span>
    </div>
  )
}

export function LeftPanel() {
  const { styles } = useStyles()
  const [keyword, setKeyword] = useState('')
  const [activeTab, setActiveTab] = useState('palette')

  const menus = useMemo(() => {
    const all = getMenus()
    if (!keyword.trim())
      return all
    const kw = keyword.trim().toLowerCase()
    return all
      .map(g => ({ ...g, list: g.list.filter(d => d.title.toLowerCase().includes(kw) || d.type.toLowerCase().includes(kw)) }))
      .filter(g => g.list.length > 0)
  }, [keyword])

  return (
    <div className={styles.panel}>
      <Tabs
        size="small"
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'palette',
            label: '组件',
            children: (
              <>
                <Input.Search
                  size="small"
                  placeholder="搜索组件"
                  allowClear
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  style={{ marginBottom: 8 }}
                />
                <Collapse
                  ghost
                  size="small"
                  defaultActiveKey={menus.map(g => g.name)}
                  items={menus.map(g => ({
                    key: g.name,
                    label: g.title,
                    children: g.list.map(def => <PaletteItem key={def.type} def={def} />),
                  }))}
                />
              </>
            ),
          },
          {
            key: 'outline',
            label: '结构',
            children: <OutlinePanel />,
          },
        ]}
      />
    </div>
  )
}
