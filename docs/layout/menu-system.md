# 菜单系统

菜单系统是后台导航的核心。`@zealous-admin/layout` 提供了灵活的菜单配置和多种视觉风格。

## 菜单数据结构

### MenuItem

```typescript
interface MenuItem {
  id: string // 唯一标识
  key: string // 菜单键值（通常为路由路径）
  label: string // 显示文字
  icon?: string // 图标标识符（格式："libKey:iconName"）
  children?: MenuItem[] // 子菜单
  // ... 更多扩展属性
}
```

### 示例数据

```tsx
const menuData: MenuItem[] = [
  {
    id: '1',
    key: '/dashboard',
    label: '仪表盘',
    icon: 'ai:DashboardOutlined',
  },
  {
    id: '2',
    key: '/system',
    label: '系统管理',
    icon: 'ai:SettingOutlined',
    children: [
      { id: '2-1', key: '/system/users', label: '用户管理', icon: 'ai:UserOutlined' },
      { id: '2-2', key: '/system/roles', label: '角色管理', icon: 'ai:TeamOutlined' },
    ],
  },
]
```

## 菜单图标映射

使用 `createMenuIconMap` 将 SVG 图标模块转换为菜单可用的图标映射表：

```tsx
import { createMenuIconMap } from '@zealous-admin/layout'

// 使用 Vite 的 import.meta.glob 批量导入 SVG
const svgModules = import.meta.glob('./assets/menu-icons/*.svg', {
  eager: true,
  query: '?react',
})

const menuIconMap = createMenuIconMap(svgModules)

// 传递给 LayoutProvider
<LayoutProvider menuData={menuData} menuIconMap={menuIconMap}>
  <Layout />
</LayoutProvider>
```

## 菜单填充风格

通过 `menu.menuFillStyle` 设置菜单项的背景填充风格：

| 值 | 效果 |
|----|------|
| `'none'` | 无填充，简洁风格 |
| `'radius'` | 圆角填充背景 |

## 菜单激活指示风格

通过 `menu.menuActiveStyle` 设置当前激活菜单项的指示方式：

| 值 | 效果 |
|----|------|
| `'none'` | 无特殊指示 |
| `'arrow'` | 箭头指示器 |
| `'line'` | 竖线指示器 |
| `'dot'` | 圆点指示器 |

## 其他菜单配置

| 配置项 | 效果 |
|--------|------|
| `subMenuUniqueOpened: true` | 手风琴模式，同时只展开一个子菜单 |
| `subMenuCollapse: true` | 侧边栏折叠（仅显示图标） |
| `isEnableSubMenuCollapse: true` | 显示折叠/展开切换按钮 |
