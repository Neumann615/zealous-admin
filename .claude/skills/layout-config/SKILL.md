---
name: layout-config
description: 管理和配置 zealous-admin 框架设置。当用户提到水印、锁屏、错误日志、更新检查、哀悼模式、移动端访问、主题切换、菜单模式、标签栏风格、工具栏功能、版权信息、认证权限、页面动画、居中布局、路由模式等配置需求时使用。
---

# Layout Config Skill

## Instructions

当用户提到以下任何配置需求时，使用此技能进行操作：

- 开启/关闭水印、锁屏、错误日志、更新检查、哀悼模式、移动端访问
- 切换暗色/亮色/跟随系统主题
- 修改菜单模式（侧边栏/顶部/精简/面板）
- 配置标签栏风格（fashion/card/square）
- 启用/禁用工具栏功能（收藏夹、面包屑、搜索、通知、国际化、全屏、刷新）
- 设置版权信息
- 配置认证/权限/登录过期
- 调整页面切换动画
- 配置居中布局
- 修改路由模式
- 任何涉及 `packages/layout/defaultSetting.ts` 的修改

### Step 1: 读取当前配置

首先读取 `packages/layout/defaultSetting.ts` 文件获取当前配置：
!`cat packages/layout/defaultSetting.ts`

### Step 2: 分析用户需求

根据用户需求，确定需要修改的配置项。参考 `references/config-reference.md` 获取各配置项的详细说明。

### Step 3: 修改配置

编辑 `packages/layout/defaultSetting.ts` 文件，修改对应的配置项。确保修改符合类型定义（参考 `packages/layout/types/config.d.ts`）。

### Step 4: 验证修改

修改完成后，验证配置是否正确，确保：
- 类型正确（符合 `LayoutConfig` 接口）
- 格式正确（使用 TypeScript 语法）
- 值合理（符合预期行为）

### Step 5: 输出结果

在聊天中输出修改的配置项及其新值，说明修改的效果。

## Examples

### 示例 1: 开启水印和暗色模式

**输入**：开启水印功能，切换到暗色模式

**处理**：
1. 读取 defaultSetting.ts
2. 修改配置：
   - `app.isEnableWatermark: true`
   - `theme.darkMode: '1'`
3. 写入文件
4. 输出：已开启水印功能，已切换到暗色模式

### 示例 2: 禁用面包屑和搜索功能

**输入**：关闭面包屑和搜索功能

**处理**：
1. 读取 defaultSetting.ts
2. 修改配置：
   - `topBar.toolbar.breadcrumb.isEnableBreadcrumb: false`
   - `topBar.toolbar.isEnableSearch: false`
3. 写入文件
4. 输出：已禁用面包屑和搜索功能

### 示例 3: 修改版权信息

**输入**：修改版权信息为公司名称和年份

**处理**：
1. 读取 defaultSetting.ts
2. 修改配置：
   - `app.copyright.date: '2026'`
   - `app.copyright.company: 'My Company'`
3. 写入文件
4. 输出：已更新版权信息

## 配置参考

详细的配置项说明请参考 [references/config-reference.md](references/config-reference.md)

## 注意事项

1. 修改配置后需要重启应用才能生效
2. 配置项的值必须符合类型定义
3. 修改前请确认配置项的含义和影响
4. 涉及主题切换的配置会影响全局样式