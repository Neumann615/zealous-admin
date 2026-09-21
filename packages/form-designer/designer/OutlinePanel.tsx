import type { DataNode } from 'antd/es/tree'
import type { Key } from 'react'
import type { FieldSchema } from '../types/schema'
import { App, Empty, Input, Tree } from 'antd'
import { createStyles } from 'antd-style'
import { useMemo, useState } from 'react'
import { getComponent } from '../registry/registry'
import { findNode } from '../utils/schemaTree'
import { useDesignerStore } from './store'

const useStyles = createStyles(({ token, css }) => ({
  root: css`
    display: flex;
    flex-direction: column;
    height: 100%;
  `,
  search: css`
    margin-bottom: ${token.marginXS}px;
  `,
  tree: css`
    flex: 1;
    min-height: 0;
    overflow: auto;

    .ant-tree-node-content-wrapper {
      min-width: 0;
    }

    .ant-tree-title {
      display: inline-block;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `,
  field: css`
    margin-left: ${token.marginXXS}px;
    color: ${token.colorTextTertiary};
    font-size: ${token.fontSizeSM}px;
  `,
}))

function filterTree(children: FieldSchema[], keyword: string): FieldSchema[] {
  return children.reduce<FieldSchema[]>((result, node) => {
    const kids = node.children ? filterTree(node.children, keyword) : []
    const title = `${node.label ?? ''}${node.field ?? ''}${node.type}`.toLowerCase()
    if (title.includes(keyword) || kids.length)
      result.push(kids.length ? { ...node, children: kids } : node)
    return result
  }, [])
}

function toTreeData(children: FieldSchema[], fieldClass: string): DataNode[] {
  return children.map((node) => {
    const def = getComponent(node.type)
    return {
      key: node.id,
      title: (
        <>
          <span>{node.label || def?.title || node.type}</span>
          {node.field && <span className={fieldClass}>{` · ${node.field}`}</span>}
        </>
      ),
      children: node.children ? toTreeData(node.children, fieldClass) : undefined,
    }
  })
}

function collectExpanded(children: FieldSchema[]): string[] {
  return children.flatMap(node => [
    node.id,
    ...(node.children ? collectExpanded(node.children) : []),
  ])
}

export function OutlinePanel() {
  const { styles } = useStyles()
  const { message } = App.useApp()
  const schema = useDesignerStore(s => s.schema)
  const selectedId = useDesignerStore(s => s.selectedId)
  const select = useDesignerStore(s => s.select)
  const moveField = useDesignerStore(s => s.moveField)
  const [keyword, setKeyword] = useState('')
  const [expandedKeys, setExpandedKeys] = useState<Key[] | null>(null)

  const visibleChildren = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()
    return normalizedKeyword ? filterTree(schema.children, normalizedKeyword) : schema.children
  }, [keyword, schema.children])

  const treeData = useMemo(
    () => toTreeData(visibleChildren, styles.field),
    [styles.field, visibleChildren],
  )
  const nextExpandedKeys = useMemo(
    () => (keyword.trim() ? collectExpanded(visibleChildren) : expandedKeys ?? schema.children.map(node => node.id)),
    [expandedKeys, keyword, visibleChildren],
  )

  const locateNode = (id: string) => {
    const find = (
      children: FieldSchema[],
      parentId: string | null,
    ): { node: FieldSchema, parentId: string | null, index: number } | null => {
      const index = children.findIndex(node => node.id === id)
      if (index >= 0)
        return { node: children[index], parentId, index }
      return children
        .map(node => node.children ? find(node.children, node.id) : null)
        .find(Boolean) ?? null
    }
    return find(schema.children, null)
  }

  const handleDrop = (info: any) => {
    const id = String(info.dragNode.key)
    const targetId = String(info.node.key)
    const target = locateNode(targetId)
    if (!target) {
      message.warning('字段位置已变化，请重试')
      return
    }

    if (!info.dropToGap) {
      moveField(id, { parentId: targetId, index: 999999 })
      return
    }

    const parent = target.parentId
    const parentLocated = parent === null ? null : locateNode(parent)
    const siblings = parent === null ? schema.children : parentLocated?.node.children
    if (!siblings) {
      message.warning('目标容器不支持拖入')
      return
    }

    const targetIndex = siblings.findIndex(node => node.id === targetId)
    if (targetIndex < 0) {
      message.warning('字段位置已变化，请重试')
      return
    }

    const relativePosition = info.dropPosition - Number(info.node.pos.split('-').pop())
    const index = relativePosition < 0 ? targetIndex : targetIndex + 1
    moveField(id, { parentId: parent, index })
  }

  const allowDrop = ({ dropNode, dropPosition }: { dropNode: DataNode, dropPosition: number }) => {
    if (dropPosition !== 0)
      return true
    const node = findNode(schema.children, String(dropNode.key))?.node
    return !!node && !!getComponent(node.type)?.isContainer
  }

  return (
    <div className={styles.root}>
      <Input.Search
        className={styles.search}
        size="small"
        placeholder="搜索字段"
        allowClear
        value={keyword}
        onChange={event => setKeyword(event.target.value)}
      />
      {treeData.length
        ? (
            <Tree
              className={styles.tree}
              blockNode
              allowDrop={allowDrop}
              draggable
              selectable
              selectedKeys={selectedId ? [selectedId] : []}
              expandedKeys={nextExpandedKeys}
              treeData={treeData}
              onExpand={keys => setExpandedKeys([...keys])}
              onSelect={(keys) => {
                select(keys.length ? String(keys[0]) : null)
              }}
              onDrop={handleDrop}
            />
          )
        : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={keyword ? '没有匹配字段' : '画布还没有字段'} />}
    </div>
  )
}
