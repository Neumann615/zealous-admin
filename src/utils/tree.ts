import type { TreeDataOrigin } from '@/components/common/group-tree/GroupTree'

export function transformGroup(data: Record<string, any>[], title: string) {
  const loop = (data: Record<string, any>) => {
    return data.map((l: Record<string, any>) => {
      const {
        id,
        children,
      } = l
      const obj: TreeDataOrigin = {
        title: l[title],
        key: id,
        originData: l,
      }
      if (children?.length) {
        obj.children = loop(children)
        return obj
      }
      return obj
    })
  }
  return loop(data)
}

export function searchParentId(treeData: TreeDataOrigin[], item: number) {
  for (const i in treeData) {
    if (treeData[i].key === item) {
      return [treeData[i]].filter(v => v.key !== item)
    }

    if (treeData[i].children) {
      const node: any = searchParentId(treeData[i].children || [], item)
      if (node)
        return node.concat(treeData[i]).filter((v: any) => v.resourcesId !== item)
    }
  }
}
