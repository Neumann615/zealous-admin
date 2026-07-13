# ZIcon / ZIconPicker 图标

**ZIcon** 是一个动态图标渲染器，通过 `"libKey:iconName"` 格式的字符串即可渲染任意图标库中的图标。

**ZIconPicker** 是一个完整的图标选择器组件，提供侧边栏切换图标库、搜索过滤、网格浏览等功能。

## 代码演示

### ZIcon 基础用法

```tsx
import { ZIcon } from '@zealous-admin/components'

// 渲染 Ant Design 的 HomeOutlined 图标
<ZIcon value="ai:HomeOutlined" />

// 渲染 Font Awesome 的 user 图标
<ZIcon value="fa:FaUser" />

// 渲染 Material Design 的 home 图标
<ZIcon value="md:MdHome" />

// 带自定义样式
<ZIcon value="ai:SettingOutlined" className="custom-icon" />
```

### ZIconPicker 基础用法

```tsx
import { ZIconPicker } from '@zealous-admin/components'
import { useState } from 'react'

function IconSelector() {
  const [icon, setIcon] = useState('')

  return (
    <ZIconPicker
      value={icon}
      onChange={setIcon}
      placeholder="请选择图标"
      clearable
    />
  )
}
```

### 限制可选图标库

```tsx
// 仅显示 Ant Design 和 Material Design 图标
<ZIconPicker library={['ai', 'md']} />
```

### 自定义触发器

```tsx
<ZIconPicker value={icon} onChange={setIcon}>
  <button>选择图标</button>
</ZIconPicker>
```

## API

### ZIcon Props

| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| value | 图标标识符，格式为 `"libKey:iconName"` | `string` | - |
| className | 自定义 CSS 类名 | `string` | - |

### ZIconPicker Props

| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| value | 当前选中的图标值 | `string` | - |
| onChange | 选择图标时的回调 | `(value: string) => void` | - |
| placeholder | 占位文本 | `string` | `"请选择图标"` |
| library | 限制可选的图标库列表 | `IconLibraryKey[]` | 全部 32 个库 |
| clearable | 是否显示清除按钮 | `boolean` | - |
| children | 自定义触发器元素 | `React.ReactNode` | - |

## 支持的图标库

| 库标识 | 图标库 | 库标识 | 图标库 |
|--------|--------|--------|--------|
| `ai` | Ant Design Icons | `io5` | Ionicons 5 |
| `bs` | Bootstrap Icons | `lu` | Lucide Icons |
| `bi` | BoxIcons | `md` | Material Design Icons |
| `ci` | Circum Icons | `pi` | Phosphor Icons |
| `cg` | css.gg | `rx` | Radix Icons |
| `di` | Devicons | `ri` | Remix Icon |
| `fi` | Feather Icons | `si` | Simple Icons |
| `fc` | Flat Color Icons | `sl` | Simple Line Icons |
| `fa` | Font Awesome 5 | `tb` | Tabler Icons |
| `fa6` | Font Awesome 6 | `tfi` | Themify Icons |
| `gi` | Game Icons | `ti` | Typicons |
| `go` | GitHub Octicons | `vsc` | VS Code Icons |
| `gr` | Grommet Icons | `wi` | Weather Icons |
| `hi` | Heroicons v1 | `io` | Ionicons 4 |
| `hi2` | Heroicons v2 | `lia` | Line Awesome |
| `im` | IcoMoon Free | | |
