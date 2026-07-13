import type { UmsResource, UmsResourceCategory } from '@/types/resource'
import { App, Button, Card, Checkbox, Col, Row } from 'antd'
import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppMessage } from '@/hooks/useAppMessage'
import { fetchAllResourceList } from '@/apis/resource'
import { resourceCategoryListAllAPI } from '@/apis/resourceCategory'
import { roleAllocResourceAPI, roleListResourceById } from '@/apis/role'

export default function AllocResource() {
  const { message, modal } = useAppMessage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // 当前操作的角色ID
  const [roleId, setRoleId] = useState<number>()
  // 所有资源列表
  const [allResource, setAllResource] = useState<UmsResource[]>([])
  // 所有资源分类列表
  const [allResourceCate, setAllResourceCate] = useState<UmsResourceCategory[]>([])

  // 获取所有资源分类列表
  const getAllResourceCateList = async () => {
    const res = await resourceCategoryListAllAPI()
    const cateList = res.data.map(item => ({ ...item, checked: false }))
    setAllResourceCate(cateList)
  }

  // 获取所有资源列表
  const getAllResourceList = async () => {
    const res = await fetchAllResourceList()
    const resourceList = res.data.map(item => ({ ...item, checked: false }))
    setAllResource(resourceList)
  }

  // 根据角色获取已分配资源并设置选中状态
  const getResourceByRole = async () => {
    if (!roleId)
      return
    const res = await roleListResourceById(roleId)
    const allocResource = res.data
    setAllResource(prev => prev.map(item => ({
      ...item,
      checked: getResourceChecked(item.id!, allocResource),
    })))
    setAllResourceCate(prev => prev.map(item => ({
      ...item,
      checked: isAllChecked(item.id!),
    })))
  }

  // 页面挂载时执行
  useEffect(() => {
    const id = searchParams.get('roleId')
    if (id) {
      setRoleId(Number(id))
    }
    getAllResourceCateList()
    getAllResourceList()
  }, [])

  useEffect(() => {
    if (roleId && allResource.length > 0) {
      getResourceByRole()
    }
  }, [roleId, allResource.length])

  // 根据分类ID获取资源
  const getResourceByCate = (categoryId: number) => {
    return allResource.filter(item => item.categoryId === categoryId)
  }

  // 检查资源是否被选中
  const getResourceChecked = (resourceId: number, allocResource: UmsResource[]) => {
    const index = allocResource.findIndex(item => item.id === resourceId)
    return index > -1
  }

  // 检查分类是否半选状态
  const isIndeterminate = (categoryId: number) => {
    const cateResources = getResourceByCate(categoryId)
    return !(cateResources.every(item => item.checked === true) || cateResources.every(item => item.checked === false))
  }

  // 检查分类是否全选
  const isAllChecked = (categoryId: number) => {
    const cateResources = getResourceByCate(categoryId)
    return cateResources.every(item => item.checked === true)
  }

  // 保存资源分配
  const handleSave = async () => {
    modal.confirm({
      title: '提示',
      content: '是否分配资源？',
      onOk: async () => {
        const checkedResourceIds = new Set<number>()
        if (allResource && allResource.length > 0) {
          allResource.forEach((item) => {
            if (item.checked) {
              checkedResourceIds.add(item.id!)
            }
          })
        }
        try {
          await roleAllocResourceAPI({ roleId: roleId!, resourceIds: Array.from(checkedResourceIds).join(',') })
          message.success('分配成功')
          navigate(-1)
        }
        catch (error) {
          console.error('分配资源失败:', error)
        }
      },
    })
  }

  // 清空选中项
  const handleClear = () => {
    setAllResourceCate(prev => prev.map(item => ({ ...item, checked: false })))
    setAllResource(prev => prev.map(item => ({ ...item, checked: false })))
  }

  // 处理全选改变事件
  const handleCheckAllChange = (cate: UmsResourceCategory, checked: boolean) => {
    setAllResourceCate(prev => prev.map(item =>
      item.id === cate.id ? { ...item, checked } : item,
    ))
    setAllResource(prev => prev.map(item =>
      item.categoryId === cate.id ? { ...item, checked } : item,
    ))
  }

  // 处理单个资源选中事件
  const handleCheckChange = (resource: UmsResource, checked: boolean) => {
    setAllResource(prev => prev.map(item =>
      item.id === resource.id ? { ...item, checked } : item,
    ))
    // 更新分类的选中状态
    setAllResourceCate(prev => prev.map((item) => {
      if (item.id === resource.categoryId) {
        const cateResources = getResourceByCate(resource.categoryId)
        const newChecked = cateResources.every(r => r.id === resource.id ? checked : r.checked)
        return { ...item, checked: newChecked }
      }
      return item
    }))
  }

  return (
    <Card>
      {allResourceCate.map((cate, index) => (
        <div
          key={cate.id}
          style={{
            borderTop: index === 0 ? '1px solid #DCDFE6' : undefined,
          }}
        >
          <Row
            style={{
              padding: 20,
              borderLeft: '1px solid #DCDFE6',
              borderRight: '1px solid #DCDFE6',
              borderBottom: '1px solid #DCDFE6',
              background: '#F2F6FC',
            }}
          >
            <Checkbox
              checked={cate.checked}
              indeterminate={isIndeterminate(cate.id!)}
              onChange={e => handleCheckAllChange(cate, e.target.checked)}
            >
              {cate.name}
            </Checkbox>
          </Row>
          <Row
            style={{
              padding: 20,
              borderLeft: '1px solid #DCDFE6',
              borderRight: '1px solid #DCDFE6',
              borderBottom: '1px solid #DCDFE6',
            }}
          >
            {getResourceByCate(cate.id!).map(resource => (
              <Col span={8} key={resource.id} style={{ padding: '4px 0' }}>
                <Checkbox
                  checked={resource.checked}
                  onChange={e => handleCheckChange(resource, e.target.checked)}
                >
                  {resource.name}
                </Checkbox>
              </Col>
            ))}
          </Row>
        </div>
      ))}
      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <Button type="primary" onClick={handleSave} style={{ marginRight: 10 }}>保存</Button>
        <Button onClick={handleClear}>清空</Button>
      </div>
    </Card>
  )
}
