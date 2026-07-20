import type { DataNode } from 'antd/es/tree'
import type { MenuNode } from '@/types/menu'
import { Modal, Tree } from 'antd'
import { useEffect, useState } from 'react'
import { useAppMessage } from '@/hooks/useAppMessage'
import { getMenuTreeListAPI } from '@/apis/menu'
import { roleAllocMenuAPI, roleListMenuByRoleIdAPI } from '@/apis/role'

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
    const res = await getMenuTreeListAPI()
    setMenuTreeList(res.data)
  }

  const fetchRoleMenu = async () => {
    if (!roleId) return
    const res = await roleListMenuByRoleIdAPI(roleId)
    const menuList = res.data
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

  const convertToTreeData = (menuList: MenuNode[]): DataNode[] => {
    return menuList.map(menu => ({
      key: menu.id!,
      title: menu.title,
      children: menu.children && menu.children.length > 0 ? convertToTreeData(menu.children as MenuNode[]) : undefined,
    }))
  }

  const buildNodeMap = (nodes: MenuNode[]): Map<number, MenuNode> => {
    const map = new Map<number, MenuNode>()
    const walk = (list: MenuNode[]) => {
      for (const node of list) {
        map.set(node.id!, node)
        if (node.children?.length) walk(node.children as MenuNode[])
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
      await roleAllocMenuAPI({ roleId: roleId!, menuIds: Array.from(checkedMenuIds).join(',') })
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
