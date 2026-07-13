import type { DataNode } from 'antd/es/tree'
import type { UmsMenuNode } from '@/types/menu'
import { App, Modal, Tree } from 'antd'
import React, { useEffect, useState } from 'react'
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
  // 所有菜单树形结构列表
  const [menuTreeList, setMenuTreeList] = useState<UmsMenuNode[]>([])
  // 选中的菜单ID
  const [checkedKeys, setCheckedKeys] = useState<React.Key[]>([])
  // 加载状态
  const [loading, setLoading] = useState(false)

  // 获取菜单树列表
  const fetchTreeList = async () => {
    const res = await getMenuTreeListAPI()
    setMenuTreeList(res.data)
  }

  // 获取角色对应的菜单
  const fetchRoleMenu = async () => {
    if (!roleId)
      return
    const res = await roleListMenuByRoleIdAPI(roleId)
    const menuList = res.data
    // 只选中非父级菜单
    const checkedMenuIds = menuList.filter(item => item.parentId !== 0).map(item => item.id!)
    setCheckedKeys(checkedMenuIds)
  }

  // 弹窗打开时初始化
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

  // 将菜单数据转换为Tree组件需要的格式
  const convertToTreeData = (menuList: UmsMenuNode[]): DataNode[] => {
    return menuList.map(menu => ({
      key: menu.id!,
      title: menu.title,
      children: menu.children && menu.children.length > 0 ? convertToTreeData(menu.children as UmsMenuNode[]) : undefined,
    }))
  }

  // 构建 id → node 的查找表
  const buildNodeMap = (nodes: UmsMenuNode[]): Map<number, UmsMenuNode> => {
    const map = new Map<number, UmsMenuNode>()
    const walk = (list: UmsMenuNode[]) => {
      for (const node of list) {
        map.set(node.id!, node)
        if (node.children?.length) {
          walk(node.children as UmsMenuNode[])
        }
      }
    }
    walk(nodes)
    return map
  }

  // 递归收集选中菜单ID，同时向上追溯所有祖先节点
  const collectCheckedMenuIds = (
    nodes: UmsMenuNode[],
    checked: React.Key[],
    ids: Set<number>,
    nodeMap: Map<number, UmsMenuNode>,
  ) => {
    for (const node of nodes) {
      if (checked.includes(node.id!)) {
        ids.add(node.id!)
        // 向上追溯所有祖先
        let parentId = node.parentId
        while (parentId !== 0) {
          const parent = nodeMap.get(parentId)
          if (parent) {
            ids.add(parent.id!)
            parentId = parent.parentId
          }
          else {
            break
          }
        }
      }
      if (node.children && node.children.length > 0) {
        collectCheckedMenuIds(node.children as UmsMenuNode[], checked, ids, nodeMap)
      }
    }
  }

  // 保存菜单分配
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
