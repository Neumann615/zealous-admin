# 标签栏（Tab Bar）

标签栏提供多标签页导航功能，类似浏览器的标签页体验。用户可以在不同页面之间快速切换，支持拖拽排序和右键操作。

## 启用标签栏

```tsx
const config: LayoutConfig = {
  topBar: {
    tabBar: {
      isEnableTabBar: true,
      showIcon: true, // 显示标签图标，支持 selectIcon 激活态切换
    },
  },
}
```

配置 `showIcon: true` 后，标签栏会显示菜单项图标。若菜单项配置了 `selectIcon`，当前激活标签的图标会自动切换为激活图标。

## 标签栏样式

通过 `topBar.tabBar.style` 设置：

| 样式 | 值 | 说明 |
|------|-----|------|
| 默认 | `'default'` | 经典标签样式 |
| 卡片 | `'card'` | 卡片式标签，类似浏览器标签 |
| 块状 | `'block'` | 块状标签，填满宽度 |

## 标签宽度模式

通过 `topBar.tabBar.widthType` 设置：

| 模式 | 效果 |
|------|------|
| `'auto'` | 自适应宽度 |
| `'fixed'` | 固定宽度（配合 `width` 属性） |
| `'auto-min'` | 自适应 + 最小宽度 |
| `'auto-max'` | 自适应 + 最大宽度 |

## 双击行为

通过 `topBar.tabBar.dblClickEvent` 设置双击标签时的操作：

| 行为 | 效果 |
|------|------|
| `'refresh'` | 刷新当前标签页 |
| `'close'` | 关闭当前标签页 |
| `'fixed'` | 固定/取消固定标签 |
| `'max'` | 最大化内容区 |
| `'open'` | 在新窗口中打开 |

## 标签操作

### 通过 useControlTab Hook

```tsx
import { useControlTab } from '@zealous-admin/layout'

function MyComponent() {
  const { openTab, closeTab, swapTab, fixedTab } = useControlTab()

  // 打开新标签
  const handleNavigate = () => {
    openTab({
      id: '/users',
      key: '/users',
      label: '用户管理',
      icon: 'ai:UserOutlined',
    })
  }

  // 关闭当前标签
  const handleClose = () => {
    closeTab('/users')
  }
}
```

### 右键菜单

标签栏支持右键上下文菜单，提供以下操作：

- **关闭当前** — 关闭当前标签
- **关闭左侧** — 关闭当前标签左侧的所有标签
- **关闭右侧** — 关闭当前标签右侧的所有标签
- **关闭其他** — 关闭除当前标签外的所有标签
- **固定标签** — 将标签固定，不受关闭操作影响
- **刷新** — 刷新当前标签页内容

## 拖拽排序

标签栏使用 `@hello-pangea/dnd` 实现拖拽重排，用户可以通过拖拽调整标签的顺序。
