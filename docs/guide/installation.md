# 安装

## 环境要求

- **Node.js** >= 22.14.0
- **pnpm** >= 11.8.0（推荐，项目使用 pnpm workspace 管理）

## 获取代码

```bash
# 克隆仓库
git clone https://github.com/Neumann615/zealous-admin.git

# 进入项目目录
cd zealous-admin
```

## 安装依赖

```bash
pnpm install
```

::: tip pnpm 安装
如果你还没有安装 pnpm，可以通过以下命令安装：

```bash
npm install -g pnpm
```

或者使用 Corepack：

```bash
corepack enable
corepack prepare pnpm@11.8.0 --activate
```
:::

## 环境变量

项目启动后会读取 `.env.development` 文件中的环境变量：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_APP_TITLE` | 应用标题 | zealous-admin |
| `VITE_BASE_SERVER_URL` | 后端 API 地址 | `http://localhost:3508` |

生产环境使用 `.env.production`。后端服务可通过 `service/.env` 配置 `PORT` 和 `DB_PATH`。

## 启动开发

```bash
# 启动前端开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 预览生产构建
pnpm preview
```

## 构建库文件

当需要将 `@zealous-admin/components`、`@zealous-admin/layout`、`@zealous-admin/theme` 作为独立包发布时，执行以下命令：

```bash
# 构建所有三个包
pnpm build:lib

# 或单独构建
pnpm build:lib:components
pnpm build:lib:layout
pnpm build:lib:theme
```

每个包的构建产物输出到对应 `packages/*/dist/` 目录，包含 ES Module 格式的 JS 文件和 TypeScript 类型声明文件（`.d.ts`）。

## 文档站

```bash
# 启动文档开发服务器
pnpm docs:dev

# 构建文档站
pnpm docs:build

# 预览文档构建产物
pnpm docs:preview
```
