import type { MenuNode } from '@zealous-admin/auth'
import type { DataNode } from 'antd/es/tree'
import { assignRoleMenus, getMenuTree, getRoleMenus } from '@zealous-admin/auth'
import { useAppMessage } from '@zealous-admin/layout/index'
import { Modal, Space, Tag, Tree } from 'antd'
import { useEffect, useState } from 'react'

interface AllocMenuModalProps {
  visible: boolean
  roleId?: number
  onClose: () => void
}

export default function AllocMenuModal({ visible, roleId, onClose }: AllocMenuModalProps) {
  const { message } = useAppMessage()
  const [menuTreeList, setMenuTreeList] = useState<MenuNode[]>([])
  const [checkedKeys, setCheckedKeys] = useState<React.Key[]>([])
  const [loading, setLoading] = useState(false)

  const fetchTreeList = async () => {
    const res = await getMenuTree()
    setMenuTreeList(res)
  }

  const fetchRoleMenu = async () => {
    if (!roleId)
      return
    const res = await getRoleMenus(roleId)
    const menuList = res
    const checkedMenuIds = menuList.filter(item => item.parentId !== 0).map(item => item.id!)
    setCheckedKeys(checkedMenuIds)
  }

  useEffect(() => {
    if (visible) {
      setCheckedKeys([])
      fetchTreeList()
    }
  }, [visible])

  useEffect(() => {
    if (visible && roleId && menuTreeList.length > 0) {
      fetchRoleMenu()
    }
  }, [visible, roleId, menuTreeList])

  /** 按钮节点是权限叶子，标出权限标识避免与页面菜单混淆 */
  const convertToTreeData = (menuList: MenuNode[]): DataNode[] => {
    return menuList.map((menu) => {
      const title = menu.type === 2
        ? (
            <Space size={4}>
              <span>{menu.title}</span>
              <Tag color="orange" style={{ marginInlineEnd: 0 }}>{menu.permission || '未配置权限标识'}</Tag>
            </Space>
          )
        : menu.title
      return {
        key: menu.id!,
        title,
        children: menu.children && menu.children.length > 0 ? convertToTreeData(menu.children) : undefined,
      }
    })
  }

  const buildNodeMap = (nodes: MenuNode[]): Map<number, MenuNode> => {
    const map = new Map<number, MenuNode>()
    const walk = (list: MenuNode[]) => {
      for (const node of list) {
        map.set(node.id!, node)
        if (node.children?.length)
          walk(node.children as MenuNode[])
      }
    }
    walk(nodes)
    return map
  }

  const collectCheckedMenuIds = (
    nodes: MenuNode[],
    checked: React.Key[],
    ids: Set<number>,
    nodeMap: Map<number, MenuNode>,
  ) => {
    for (const node of nodes) {
      if (checked.includes(node.id!)) {
        ids.add(node.id!)
        let parentId = node.parentId
        while (parentId !== 0) {
          const parent = nodeMap.get(parentId)
          if (parent) {
            ids.add(parent.id!)
            parentId = parent.parentId
          }
          else { break }
        }
      }
      if (node.children && node.children.length > 0) {
        collectCheckedMenuIds(node.children as MenuNode[], checked, ids, nodeMap)
      }
    }
  }

  const handleSave = async () => {
    const nodeMap = buildNodeMap(menuTreeList)
    const checkedMenuIds = new Set<number>()
    collectCheckedMenuIds(menuTreeList, checkedKeys, checkedMenuIds, nodeMap)

    if (checkedMenuIds.size === 0) {
      message.warning('请至少选择一个菜单')
      return
    }

    setLoading(true)
    try {
      await assignRoleMenus({ roleId: roleId!, menuIds: Array.from(checkedMenuIds).join(',') })
      message.success('分配成功')
      onClose()
    }
    catch (error) {
      console.error('分配菜单失败:', error)
    }
    finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title="分配菜单"
      open={visible}
      onCancel={onClose}
      onOk={handleSave}
      confirmLoading={loading}
      width={500}
      destroyOnClose
    >
      <div style={{ maxHeight: 400, overflow: 'auto' }}>
        <Tree
          checkable
          checkedKeys={checkedKeys}
          onCheck={keys => setCheckedKeys(keys as React.Key[])}
          treeData={convertToTreeData(menuTreeList)}
          defaultExpandAll
        />
      </div>
    </Modal>
  )
}
