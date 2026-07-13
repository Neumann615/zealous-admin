# 面包屑（Breadcrumb）

面包屑导航帮助用户了解当前页面在系统中的位置层级，并支持快速跳转到上级页面。

## 启用面包屑

```tsx
const config: LayoutConfig = {
  topBar: {
    toolbar: {
      isEnableToolbar: true,
      isEnableBreadcrumb: true,
    },
  },
}
```

## 面包屑样式

通过 `topBar.toolbar.breadcrumb.style` 设置：

### default（默认样式）

经典的 `/` 分隔方式，与 Ant Design Breadcrumb 默认风格一致。

```tsx
breadcrumb: {
  isEnableBreadcrumb: true,
  style: 'default',
}
```

### modern（现代样式）

芯片/胶囊风格的面包屑，提供更现代的视觉效果。

```tsx
breadcrumb: {
  isEnableBreadcrumb: true,
  style: 'modern',
}
```

## 在主导航中显示

当 `isEnableMainNav` 为 `true` 时，面包屑会包含主导航层级的显示。

```tsx
breadcrumb: {
  isEnableBreadcrumb: true,
  isEnableMainNav: true,
}
```

## 面包屑数据来源

面包屑数据由标签系统自动维护。当通过 `useControlTab.openTab()` 打开新标签时，会自动生成对应的面包屑路径。

面包屑与标签栏的数据保持一致，关闭标签时对应的面包屑也会同步清除。
