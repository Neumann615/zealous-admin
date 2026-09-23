# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev                  # Frontend dev server (port 3509, uses Vite)
pnpm build                # Frontend production build
pnpm lint                 # ESLint check
pnpm lint:fix             # ESLint auto-fix
pnpm docs:dev             # VitePress docs dev server
pnpm docs:build           # VitePress static build
cd service && pnpm dev    # Backend dev server (Express, port 3508 or $PORT)
```

## Architecture

Monorepo (pnpm workspace) with React 19 frontend + Express backend + shared packages.

### Layer map

```
src/                    # App shell (thin: routes + api wrappers only)
  App.tsx               # Session bootstrap gate + route assembly + LayoutProvider + menu conversion
  registry/             # Route assembly: pages.tsx (component key → lazy loader) + routes.tsx (buildRoutes)
  pages/                # Page components; reachable only when za_menu has a matching row
  apis/                 # API functions per domain (http instance lives in packages/layout)

packages/
  auth/                 # Auth package: api + guards (AuthGuard / PermissionGuard) + store + system pages (admin / role / menu)
  layout/               # Layout framework (5 modes: side/only-side/head/only-head/simple)
    store/              # Zustand stores (user, menu, topBar, app, theme, page) — persist to localStorage
    hooks/              # useControlTab (open/close/swap tabs, breadcrumb, navigation), useAppMessage
    utils/              # http (axios instance), appMessage (global message/modal refs), i18n
  components/           # Shared UI (ZaIcon, ZaIconPicker, ZaRichTextEditor, ZaSignaturePad, ZaMarquee, etc.)
  form-designer/        # Self-built form designer: registry + designer + renderer (docs/form-designer/)
  locales/              # Unified i18n messages for layout and components
  theme/                # Theme hooks (useBootstrapTheme, useGlassTheme, etc.)
  utils/                # Shared helpers (data, env, file, parse, time)

service/                # Backend: Express 5 + node:sqlite (DatabaseSync), no ORM
  src/db/index.ts       # Table DDL + seed data + idempotent migrations (za_admin, za_role, za_menu, za_dict, za_form)
  src/db/schema.ts      # Plain TS interfaces describing row shapes
  src/routes/           # API routes by domain (admin, role, menu, dict, form, mcp)
  src/middleware/auth.ts # JWT Bearer token middleware (jose)
docs/                   # VitePress documentation site
```

### Key patterns

**Routing**: Pure DB-driven — the `za_menu` table *is* the route table. `buildRoutes(userInfo.menus)` (`src/registry/routes.tsx`) emits `/login`, one `AuthGuard`-wrapped `Layout` route whose children come from menu rows, and `*`. A menu's `component` column is a key into the page registry (`src/registry/pages.tsx`); when it is empty the loader falls back to `src/pages/index{path}.tsx` (then `{path}/index.tsx`). `App.tsx` gates first render on `refreshSession()` so routes exist before `useRoutes` runs. Pages that must stay out of the nav (detail pages such as `/form/design`) are hidden menu rows (`hidden = 1`): they still produce routes but `convertMenus` drops them from the tree.

**Menu system**: Backend `/admin/info` returns `{ menus, roles, ...userFields }`. `App.tsx` calls `convertMenus()` to build tree from flat list (parentId-based). Result passed to `<LayoutProvider menuData={...}>` and also feeds `buildRoutes`, so every navigable path needs a menu row. MainNav renders top-level, Menu renders sub-navigation. In `simple` mode, Menu renders `mainNavData` directly instead of sub-menu.

**Permissions**: Menu-driven — `za_menu.type` (0 dir / 1 menu / 2 button) + `za_menu.permission` (`system:user:add` style) are the only source of permission codes, and `za_role.is_super = 1` short-circuits to `['*']` so a mis-seeded menu can never lock out the super admin. `permissionMiddleware` (`service/src/middleware/permission.ts`) runs right after `authMiddleware` and matches `req.baseUrl + req.path` against a route → codes table (multiple codes = any-of). A route that is not in the table **must** be listed in `UNPROTECTED_ROUTES` with a reason; `permission.test.ts` scans every `*routes.ts` and fails on gaps. The whitelist is checked *before* pattern matching, otherwise `/admin/:id` swallows `/admin/info` and non-super users get logged out on refresh. Button nodes (`type = 2`) are never returned in `menus` — they only contribute codes. The frontend reads `permissions` from `/admin/info` and hides entry points with `useHasPermission()` (or `<PermissionGuard>`); that is UX only, the server is the boundary.

**Page registry**: `src/registry/pages.tsx` maps a menu's `component` key to a lazy loader (package pages) and falls back to `src/pages/index{path}.tsx` when the key is empty. `knownPageKeys()` is injected into the auth package at boot via `registerPageKeys()` so the menu editor can offer a dropdown instead of free text — `packages/*` must never import from `src/`.

**Tab/Breadcrumb navigation**: Use `useControlTab().openTab({key, label})` to programmatically navigate. Never use `navigate()` directly — it won't sync tab/breadcrumb state. Popstate listener in `Layout.tsx` auto-syncs on browser back/forward.

**State management**: Zustand stores persisted to localStorage with prefix `zealous-admin-`. `useUserStore` for auth; layout stores (`useMenuStore`, `useTopBarStore`, `useAppStore`, `useThemeStore`) for layout config. All exported from `@zealous-admin/layout/index`.

**antd theme sync**: `<App>` component wraps app in `LayoutProvider.tsx`. All `message.xxx()` and `Modal.confirm()` must use context-aware versions:
- Components: `const { message, modal } = useAppMessage()` (from `@zealous-admin/layout/index`); inside `packages/form-designer` use antd's `App.useApp()` directly (the package must not depend on layout)
- Non-component code (`http.ts`): `getGlobalMessage()?.error(...)` / `getGlobalModal()?.confirm(...)` (refs injected by `AppMessageProvider`)

**Database writes**: Timestamps are stored as TEXT via `now()` from `service/src/lib/date.ts` (`YYYY-MM-DD HH:mm:ss`, local time). Never write `new Date().toISOString()` — the ISO `T`/`Z` shape is inconsistent with existing rows and breaks ordering plus frontend dayjs formatting.

<!-- superpowers-zh:begin (do not edit between these markers) -->
# Superpowers-ZH 中文增强版

本项目已安装 superpowers-zh 技能框架（20 个 skills）。

## 核心规则

1. **收到任务时，先检查是否有匹配的 skill** — 哪怕只有 1% 的可能性也要检查
2. **设计先于编码** — 收到功能需求时，先用 brainstorming skill 做需求分析
3. **测试先于实现** — 写代码前先写测试（TDD）
4. **验证先于完成** — 声称完成前必须运行验证命令

## 可用 Skills

Skills 位于 `.claude/skills/` 目录，每个 skill 有独立的 `SKILL.md` 文件。

- **brainstorming**: 在任何创造性工作之前必须使用此技能——创建功能、构建组件、添加功能或修改行为。在实现之前先探索用户意图、需求和设计。
- **chinese-code-review**: 中文 review 沟通参考——话术模板、分级标注（必须修复/建议修改/仅供参考）、国内团队常见反模式应对。仅在用户显式 /chinese-code-review 时调用，不要根据上下文自动触发。
- **chinese-commit-conventions**: 中文 commit 与 changelog 配置参考——Conventional Commits 中文适配、commitlint/husky/commitizen 中文模板、conventional-changelog 中文配置。仅在用户显式 /chinese-commit-conventions 时调用，不要根据上下文自动触发。
- **chinese-documentation**: 中文文档排版参考——中英文空格、全半角标点、术语保留、链接格式、中文文案排版指北约定。仅在用户显式 /chinese-documentation 时调用，不要根据上下文自动触发。
- **chinese-git-workflow**: 国内 Git 平台配置参考——Gitee、Coding.net、极狐 GitLab、CNB 的 SSH/HTTPS/凭据/CI 接入差异与镜像同步配置。仅在用户显式 /chinese-git-workflow 时调用，不要根据上下文自动触发。
- **dispatching-parallel-agents**: 当面对 2 个以上可以独立进行、无共享状态或顺序依赖的任务时使用
- **executing-plans**: 当你有一份书面实现计划需要在单独的会话中执行，并设有审查检查点时使用
- **finishing-a-development-branch**: 当实现完成、所有测试通过、需要决定如何集成工作时使用——通过提供合并、PR 或清理等结构化选项来引导开发工作的收尾
- **mcp-builder**: MCP 服务器构建方法论 — 系统化构建生产级 MCP 工具，让 AI 助手连接外部能力
- **receiving-code-review**: 收到代码审查反馈后、实施建议之前使用，尤其当反馈不明确或技术上有疑问时——需要技术严谨性和验证，而非敷衍附和或盲目执行
- **requesting-code-review**: 完成任务、实现重要功能或合并前使用，用于验证工作成果是否符合要求
- **subagent-driven-development**: 当在当前会话中执行包含独立任务的实现计划时使用
- **systematic-debugging**: 遇到任何 bug、测试失败或异常行为时使用，在提出修复方案之前执行
- **test-driven-development**: 在实现任何功能或修复 bug 时使用，在编写实现代码之前
- **using-git-worktrees**: 当需要开始与当前工作区隔离的功能开发，或在执行实现计划之前使用——通过原生工具或 git worktree 回退机制确保隔离工作区存在
- **using-superpowers**: 在开始任何对话时使用——确立如何查找和使用技能，要求在任何响应（包括澄清性问题）之前调用 Skill 工具
- **verification-before-completion**: 在宣称工作完成、已修复或测试通过之前使用，在提交或创建 PR 之前——必须运行验证命令并确认输出后才能声称成功；始终用证据支撑断言
- **workflow-runner**: 在 Claude Code / OpenClaw / Cursor 中直接运行 agency-orchestrator YAML 工作流——无需 API key，使用当前会话的 LLM 作为执行引擎。当用户提供 .yaml 工作流文件或要求多角色协作完成任务时触发。
- **writing-plans**: 当你有规格说明或需求用于多步骤任务时使用，在动手写代码之前
- **writing-skills**: 当创建新技能、编辑现有技能或在部署前验证技能是否有效时使用

## 如何使用

当任务匹配某个 skill 时，使用 `Skill` 工具加载对应 skill 并严格遵循其流程。绝不要用 Read 工具读取 SKILL.md 文件。

如果你认为哪怕只有 1% 的可能性某个 skill 适用于你正在做的事情，你必须调用该 skill 检查。
<!-- superpowers-zh:end -->
