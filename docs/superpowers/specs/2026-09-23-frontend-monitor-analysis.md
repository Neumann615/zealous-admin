# 前端监控平台（vis_monitor）分析与 zealous-admin 集成方案

日期：2026-09-23
状态：**已落地**（1–8 节为分析与方案，第 9 节为本轮交付说明与验证结论）
分析对象：https://portal-test.yntrust.com/vis_monitor/#/log

---

## 1. 分析方式与可信度

- 站点可公网访问（APISIX 网关，`index.html` 9.4KB），业务接口需登录（未登录返回 `{"code":401,"msg":"登录已失效，请重新登录"}`）。
- 本文结论来自对**线上构建产物的静态还原**：入口 `static/js/index-CpwQrk-L.js`（1.27MB）+ 26 个懒加载 chunk（各 View / 共享组件）+ `static/css/name-*.css`。
- 因此：**路由、菜单、字段名、枚举值、接口路径与入参、默认阈值** 均为代码级实证；后端存储与聚合实现为**推断**（文中已标注）。

## 2. 被分析系统概览

| 项 | 结论 |
|---|---|
| 产品名 | 前端监控平台（登录页副标题：可视化监控与预警分析） |
| 前端栈 | Vue 3.5.42 + Element Plus + vue-router（hash 模式）+ axios |
| 图表 | **未使用 ECharts**。`TrendChart` 是手写内联 SVG 折线图（含渐变、tooltip、按 label 数量自适应步长） |
| 构建 | Vite，产物 `static/js|css/<name>-<hash>`，路由级懒加载 + `modulepreload` |
| 首屏 | `index.html` 内联骨架屏，几何严格对齐 `DefaultLayout`（侧栏 232 / logo 56 / 顶栏 56 / 页签 42 / 内容区 10px 留白），与 `create-portal` 模板同源 |
| 网关 | APISIX，带 `X-Request-Id` |
| 认证 | `/api/sso/*`：域账号密码 + 短信验证码 + 云信 OTP（TOTP，微信小程序扫码绑定）+ 企业微信扫码；密码策略 10–20 位且含数字/大写/小写/特殊符号中至少 3 类、不含用户名 |
| 响应封装 | `{ code, msg, data }`；403→无权限、404/504→服务器异常、401→重登 |
| 多实例 | 配置变更提示「本实例即时生效，其余实例最长 3 分钟内生效」，说明后端是多实例 + 配置轮询同步 |

> 注意：本仓 `packages/layout/utils/http.ts` 的封装是 `{ code, message, data }`（`message` 而非 `msg`）。若直连 vis 后端，需要适配层。

## 3. 功能地图

| 路由 | 组件 | 菜单标题 | 职责 | 主要接口 |
|---|---|---|---|---|
| `/workbench` | WorkbenchView | 工作台（`hidden`） | 大屏式数据看板：核心指标 + 实时访问趋势 + 页面/错误 Top10 | `manage/log/workbenchStats` |
| `/application` | ApplicationView | 应用管理 | 接入应用清单、队列配置、日志消费开关、队列运行时状态 | `app/info`、`app/create`、`app/edit`、`queue/start`、`queue/stop`、`queue/stats/{appId}` |
| `/chatApp` | ChatAppView | chat 应用 | 消息推送侧应用与接收人（域账号）注册 | `chat/app/getApp`、`chat/app/create`、`chat/app/edit`、`chat/user/all` |
| `/log` | LogView | 实时日志 | 实时日志检索（**用户给的链接页**） | `log/query` |
| `/operationLog` | OperationLogView | 操作日志 | 业务操作日志检索，多一个「系统」维度 | `editLog/query` |
| `/analysis/perf` | PerfView | 数据分析 › 性能统计 | 页面加载耗时与资源性能（PERFORMANCE 聚合） | `manage/log/perfStats` |
| `/analysis/api` | ApiView | 数据分析 › 接口分析 | 调用次数、慢调用、报错、P95 趋势、接口明细下钻 | `manage/log/apiStats` |
| `/analysis/behavior` | BehaviorView | 数据分析 › 行为分析 | PV/UV、点击、页面访问、路径流转 | `manage/log/behaviorStats` |
| `/analysis/jsError` | JsErrorView | 数据分析 › JS错误分析 | 脚本异常聚合（`ErrorCommonView kind=js`） | `manage/log/errorStats` |
| `/analysis/bizError` | BizErrorView | 数据分析 › 业务错误分析 | 业务操作失败聚合（`ErrorCommonView kind=biz`） | `manage/log/bizErrorStats` |
| `/analysis/alertHistory` | AlertHistoryView | 数据分析 › 预警记录 | 预警推送历史、通道投递状态、失败重发 | `manage/log/alertHistory`、`manage/log/alertRetry` |
| `/login`、`/404` | LoginView、NotFoundView | — | 公开页（`meta.public`、`noTab`） | `sso/*` |

`/analysis` 为父级路由，`redirect: /analysis/perf`。

## 4. 数据模型（可直接作为我们的契约草案）

### 4.1 埋点分类 `rangeType`（8 类）

| 值 | 含义 |
|---|---|
| `WINDOW_ERROR` | 脚本异常 |
| `PROMISE_ERROR` | Promise 未处理拒绝 |
| `API` | 接口请求/返回/报错 |
| `PERFORMANCE` | 页面性能 |
| `RESOURCE_PER` | 资源加载汇总 |
| `USER_CLICK` | 用户点击 |
| `USER_ROUTE` | 路由变化 |
| `PROACTIVE_REPORTING` | 业务主动上报 |

### 4.2 日志级别 `type`

`INFO` / `WARN` / `ERROR` / `DEBUG`（前端按 `ERROR→row-error`、`WARN→row-warn` 着色，其余归 `info`）。

### 4.3 日志记录字段（实证）

`id`、`appId`、`logId`（批次 id）、`serial`（批次内序号）、`happenTime`（13 位毫秒）、`type`、`rangeType`、`params`（关键字，逗号分隔，**首词=来源系统**）、`title`、`content`、`nickname`。
操作日志的「系统」列即 `params` 首词，线上门户形态取值示例：`薪火管理系统` / `TCMP文件导出` / `薪火网上营业厅` / `信股通ESOP`。

### 4.4 应用模型

```ts
interface MonitorApp {
  appId: string
  appName: string
  type: 'realTimeLog' | 'operationLog'
  content: string          // 应用描述/接入内容
  operatingState: 0 | 1    // 是否启用（切换后约 3 分钟全实例生效）
  props: {
    enableQueue?: boolean  // 启用后异步批量落库，停用恢复同步写库
    maxSize?: number       // 队列最大长度（>0）
    batchSize?: number     // 批量处理大小（>0）
    flushInterval?: number // 刷新间隔 ms（>=100）
    retryAttempts?: number // 重试次数（>=0）
    retryDelay?: number    // 重试延迟 ms（>=100）
    consume?: { enabled: boolean }   // 日志消费/统计分析开关
    alert?: AlertConfig | null
  }
}
```

### 4.5 队列运行时指标 `queue/stats/{appId}`

`totalEnqueued`（总入队）、`totalDequeued`（总出队）、`totalProcessed`（成功）、`totalFailed`（失败，>0 告警态）、`totalQueued`（当前排队，>0 警告态）、`retryQueueSize`（重试队列）、`queueSizes: { high, normal, low }`（三级优先级占比条）。

### 4.6 预警配置

```ts
interface AlertConfig {
  enabled: boolean
  cooldownMinutes: number | null   // 冷却时间，null=默认 10 分钟
  channels: AlertChannel[] | null
  rules: AlertRule[] | null
}
interface AlertChannel {
  type: 'vis-chat'
  enabled: boolean
  pushUrl: string      // 形如 {chat-host}/api/chat/app/message/push
  chatAppId: string    // chat 侧注册的服务应用
  receivers: string    // 域账号，逗号分隔
  templateId: 'TEXT_CARD' | 'MARKDOWN'
}
interface AlertRule {
  id: RuleId
  realtime?: { enabled: boolean, minDurationMs?: number, windowMinutes: number, minCount: number, paramsPrefix?: string }
  agg?:      { enabled: boolean, windowMinutes: number, minCount: number, avgMs?: number, maxMs?: number }
}
```

规则清单（`id` / 通道 / 可配字段 / 默认值）：

| id | 名称 | 通道 | 字段 | 默认 |
|---|---|---|---|---|
| `API_SLOW` | 接口慢调用（实时） | realtime | `minDurationMs` `windowMinutes` `minCount` `paramsPrefix` | 0 / 5 / 3 / '' |
| `API_ERROR` | 接口报错（实时） | realtime | `windowMinutes` `minCount` `paramsPrefix` | 5 / 3 / '' |
| `API_AGG` | 接口聚合巡检 | agg | `windowMinutes` `minCount` `avgMs` `maxMs` | 5 / 5 / 5000 / 10000 |
| `WINDOW_ERROR_AGG` | 脚本异常突增 | agg | `windowMinutes` `minCount` | 5 / 10 |
| `PROMISE_ERROR_AGG` | Promise 异常突增 | agg | `windowMinutes` `minCount` | 5 / 10 |
| `PROACTIVE_RT` | 业务操作失败（实时） | realtime | `windowMinutes` `minCount` `paramsPrefix` | 5 / 3 / '' |
| `PROACTIVE_AGG` | 业务失败突增 | agg | `windowMinutes` `minCount` | 5 / 5 |
| `FALLBACK_AGG` | 未知类目兜底 | agg | `windowMinutes` `minCount` | 5 / 10 |

字段语义（原文提示）：`minDurationMs` 单笔耗时达该值即计入慢调用窗口计数；`windowMinutes` 同一接口窗口内累计判定；`minCount` 窗口内命中次数达该值才触发；`avgMs`/`maxMs` 满足其一即触发；`paramsPrefix` 按 params 首词圈定来源，留空=全部。
规则触发面按页面裁剪：接口分析只暴露 `API_SLOW/API_ERROR/API_AGG`；JS 错误页只暴露 `WINDOW_ERROR_AGG/PROMISE_ERROR_AGG/FALLBACK_AGG`；业务错误页只暴露 `PROACTIVE_RT/PROACTIVE_AGG`。

预警记录里的 `alertType` 枚举比规则 id 多两个（细分业务失败）：`SLOW_API`、`API_ERROR`、`BIZ_OP_FAILED`、`BIZ_OP_PARTIAL`、`API_AGG`、`WINDOW_ERROR_AGG`、`PROMISE_ERROR_AGG`、`PROACTIVE_AGG`、`FALLBACK_AGG`。

### 4.7 统计接口响应结构（实证字段）

```ts
// workbenchStats?appId=
{ window: { day: string }, truncated: boolean,
  overall: { pv, uv, clicks, jsError: { count, rate, users, userPct } },
  yesterday: { pv, uv, ... },                 // 未就绪时前端显示「昨日数据未就绪」
  trend: [{ bucket, pv, uv, errCount }],      // 今日按小时分桶
  topPages: [{ page, pv, uv }], topErrors: [{ title, count, users }] }

// perfStats?appId&startTime&endTime
{ granularity: 'day' | ...,
  overall: { pages, samples, stages: { load: { avg, p95 }, ... }, resource: { avgCount, avgTotalKB, slowTop: [...] } },
  trend: [{ day, loadAvg, loadP95 }],
  pages: [{ page, stages: { dns|tcp|ttfb|download|dcl|load|fp|fcp: { avg, p95, max, min } } }] }

// apiStats
{ trend: [{ day, count, p95 }],
  apis: [{ url, count, avg, max, p95, slowCount, errorCount,
           errors: [{ time, status, message, duration, page, user, requestId, repeat }] }] }

// behaviorStats
{ overall: { pv, uv, clicks, paths }, trend: [{ day, pv, uv }],
  topClicks: [{ label, count, pages: string[] }],
  pageviews: [{ page, pv, uv }], topPaths: [{ from, to, count }] }

// errorStats / bizErrorStats（额外入参 granularity: 'hour' | 'day'）
{ total: { count, rate, users, userPct },
  trend: [{ bucket, count, users, pv | ops }],
  top: [{ title, count, users, lastPage, lastTime }] }

// alertHistory → data: AlertHistoryRow[]
{ id, appId, alertType, ruleId, level, title, channels: [...], fields: {...},
  retryCount, cooldownHit, happenTime, lastRetryTime }
```

性能阶段字典 `perfStage`：`dns` DNS查询 / `tcp` TCP连接 / `ttfb` 首字节 / `download` 响应下载 / `dcl` DOM就绪 / `load` 完全加载 / `fp` 首次绘制 / `fcp` 首次内容绘制。

## 5. 接口清单

| 方法 | 路径 | 入参 | 备注 |
|---|---|---|---|
| GET | `/api/vis/app/info` | `keyword?` | 返回**全量数组**，前端本地分页 |
| POST | `/api/vis/app/create` | `MonitorApp` | |
| POST | `/api/vis/app/edit` | `{ appId, ...patch }` | 也用于启停（改 `operatingState`）与保存 `props` |
| GET | `/api/vis/log/query` | `appId, nickname?, params?, type?, logId?, title?, content?, rangeType?, startTime, endTime, pageNum, pageSize` | 返回 `data.rows[]`，**游标式无限滚动**（`rows.length == pageSize` 判定还有下一页） |
| GET | `/api/vis/editLog/query` | 同上 + 系统维度 | 操作日志 |
| GET | `/api/vis/queue/stats/{appId}` | — | 队列运行时指标 |
| POST | `/api/vis/queue/start` / `stop` | `{ appId }` | |
| GET | `/api/vis/manage/log/workbenchStats` | `appId` | 今日 00:00 至今 |
| GET | `/api/vis/manage/log/perfStats` | `appId, startTime, endTime, source?` | |
| GET | `/api/vis/manage/log/apiStats` | 同上 | |
| GET | `/api/vis/manage/log/behaviorStats` | 同上 | |
| GET | `/api/vis/manage/log/errorStats` | 同上 + `granularity` | |
| GET | `/api/vis/manage/log/bizErrorStats` | 同上 + `granularity` | |
| GET | `/api/vis/manage/log/alertHistory` | `appId, startTime, endTime, alertType?, channel?, ok?` | 返回数组，前端分页 |
| POST | `/api/vis/manage/log/alertRetry` | `{ id }` | 仅重投失败通道，不计入冷却 |
| POST | `/api/vis/user/info` | — | 当前用户 |
| * | `/api/sso/*`、`/api/chat/*` | — | 登录、消息推送侧 |

时间快捷档位：日志页 `1h/2h/8h/12h/1d/3d/7d/自定义`；统计页 `1h/4h/8h/24h/3d/7d/30d/自定义`。**统计窗口硬上限 30 天**；窗口 >24h 时强制 `granularity='day'` 且不再提供 UV / 影响占比（无窗口级去重口径）。

## 6. 交互与工程细节（值得直接借鉴）

**实时日志页（`/log`，用户给的页面）**
- 左右分栏：左侧查询条件面板可**拖拽调宽**（320 ~ 容器宽-400，宽度写 `localStorage`）且可**整体折叠**（折叠态写 `localStorage`）。
- 查询条件整体持久化到 `localStorage['log-search-form']`，白名单字段恢复，刷新不丢条件。
- 分页是**无限滚动 + 追加去重**（按 `id` 去重），排序随 `logId` 切换：指定批次时升序（还原调用链），否则按 `happenTime` 倒序。
- **增量轮询**：自动刷新 5s/10s/30s，`startTime = max(happenTime) - 1`、`endTime = now`、`pageNum = 1`，只追加新数据，不重查全量。
- **批次分组**：按 `logId + serial` 聚成一个「批次」，展示批次号/昵称/条数；子项 >5 条自动折叠；批次内 ERROR/WARN 计数徽标。
- `content` 长度 >150 或换行 >=3 自动折叠；自动嗅探 JSON（以 `{`/`[` 开头且可 `JSON.parse`）并支持「原文/格式化」切换。
- **结果二次筛选**：在已加载结果中按 `happenTime/type/rangeType/params/title/content` 做客户端 `includes` 过滤，并把已加载行的 `params` 拆词回填到「关键字」下拉（`allow-create`），形成免请求的快速收敛。
- 卡片 / 表格双视图；行内一键复制（含失败提示）。

**统计分析页**
- 统一 `FilterBar`：应用下拉（默认只列 `props.consume.enabled === true` 的应用）+ 时间快捷/自定义 + `source`（params 首词）；`alertMark` 模式下默认选中已开启预警的应用。
- 三件套复用组件：`PanelBlock`（title/sub/actions 区块）、`TrendChart`（手写 SVG 折线）、`HbarList`（Top N 横向条形，按最大值归一）。
- `StatNotes` 统一挂口径说明，例如「窗口超过 24 小时：按日粒度预聚合，分位数（P95 等）为直方图近似值」。
- **口径诚实**是这套系统最值钱的地方：错误率明确写「分母 PV（采样近似、分子全量），方向性高估，用于趋势与对比而非精确水位」；业务失败率写「分母为同期主动上报操作总数（非 PV）」；Top 点击写「总计以顶部卡片为准，不可由 Top N 求和」；`truncated` 时提示「数据量超单窗口上限，部分指标为截断样本口径」。
- 接口分析支持**隐藏指定 URL** 与「仅看次数 ≤ N」，用于剔除高频轮询/健康检查噪声；接口明细可下钻最近 N 条错误（含状态码、报错信息、用时、发生页面、用户、请求 ID、重复次数）。

## 7. 不足与我们要改进的点

| 问题 | 影响 | 我们的做法 |
|---|---|---|
| 图表全部手写 SVG | 无缩放/刷选/dataZoom，大数据量趋势图可读性差 | 仓内已有 `echarts`，直接用它，保留 sparkline 轻量 SVG |
| 应用列表、预警记录**全量返回 + 前端分页** | 应用/记录数增长后首屏变慢 | 服务端分页（对齐本仓 `CommonPage`/`PageParam`） |
| 实时日志 `pageSize` 最大 5000，纯 DOM 渲染 | 大页必卡 | 虚拟列表（`rc-virtual-list` / antd Table `virtual`） |
| 查询走 GET，参数无长度保护 | 长 `content`/多条件易撞 URL 长度与网关限制 | 复杂检索改 POST + body |
| 无 sourcemap 还原 | 压缩堆栈不可读，定位成本高 | P4 接 sourcemap 上传 + 还原 |
| 无会话回放 / 无用户维度钻取 | 只能看单条日志，缺上下文 | P4 评估（rrweb 成本高，先做「同一 nickname 时间线」） |
| 权限只到「登录/未登录」 | 无按 appId 的数据权限 | 复用本仓角色-菜单 + 扩展 appId 数据域 |
| 无导出 | 排障取证不便 | 表格 CSV 导出（低成本高收益） |
| 告警只有单通道 `vis-chat`，无静默/值班/升级 | 夜间噪声、无兜底 | 通道抽象为 webhook/飞书/企业微信 + 静默时段 |
| 配置变更「最长 3 分钟生效」 | 应急调阈值有延迟 | 单实例即时 + 版本号轮询，或配置中心推送 |

## 8. 集成方案

### 8.1 路线选择

| 路线 | 说明 | 工作量 | 结论 |
|---|---|---|---|
| A. iframe 嵌入 | `packages/components/Iframe` 直接挂 `/#/log` | ~0.5 天 | 仅作过渡：SSO 跨域、样式割裂、无法与本仓权限/主题联动 |
| B. React 重写前端 + 复用 vis 后端 | 只写 `packages/monitor` 前端，接口打 vis 网关 | ~2–3 周 | **有后端协作时首选**；需解决 token 互信与 `{code,msg}` 适配 |
| C. 全自研（前端 + `service/` 后端 + 采集 SDK） | 完整闭环，可独立交付 | ~5–7 周（分期） | **zealous-admin 作为交付基座时的正解**（客户环境通常拿不到该后端） |

推荐：**目标态 C，落地顺序 B → C**。即先把前端模块与契约按 vis 的字段命名做出来（迁移成本最低、语义已被生产验证），后端在 `service/` 内自研实现同一契约；若客户已有 vis 后端，则通过 `runtime/client.ts` 切 baseURL 直接复用（与 `packages/metadata` 完全同构）。

### 8.2 目录结构

```
packages/monitor/
  index.ts                      # 导出组件、契约类型、枚举、注册函数
  contracts/monitor.ts          # 数据模型（对齐第 4 节字段命名）
  constants/enums.ts            # rangeType / logLevel / alertType / timeType / perfStage 字典
  runtime/client.ts             # monitorRequest：可切 baseURL（对齐 metadata/runtime/client.ts）
  services/monitor.ts           # 所有 API 封装
  hooks/
    useLogQuery.ts              # 条件持久化 + 增量轮询 + 无限滚动 + 批次分组
    useStatsQuery.ts            # FilterBar 参数 → 各 stats 接口，含 30 天上限与粒度收敛
    useMonitorApps.ts           # 应用列表（consumeOnly / alertMark 过滤）
  components/
    MonitorFilterBar.tsx        # 应用 + 时间窗口 + 来源系统
    StatCards.tsx / PanelBlock.tsx / HbarList.tsx / TrendChart.tsx / StatNotes.tsx
    LogStream/                  # 实时日志：虚拟列表 + 批次折叠 + JSON 格式化 + 二次筛选
    AlertRuleForm.tsx           # 8 条规则的动态字段表单
    QueueStatusPanel.tsx        # 队列运行时指标

src/pages/index/monitor/
  workbench.tsx  log.tsx  operation-log.tsx  app.tsx
  analysis/perf.tsx  analysis/api.tsx  analysis/behavior.tsx
  analysis/js-error.tsx  analysis/biz-error.tsx  analysis/alert-history.tsx

service/src/modules/monitor/
  routes.ts  service.ts  schema.ts  validation.ts
  collector.ts                  # 采集入口（批量、限流、appId 校验）
  queue.ts                      # 内存优先级队列（maxSize/batchSize/flushInterval/retryAttempts/retryDelay）
  aggregate.ts                  # 5min 窗口聚合 + 日聚合预表 + P95 直方图
  alert.ts                      # realtime 滑窗判定 + agg 巡检 + 冷却 + 通道投递 + 重发

packages/monitor-sdk/           # （C 方案 P3）浏览器采集 SDK，8 类采集器对齐 rangeType
```

### 8.3 后端要点（`service/`，推断实现 → 我们的设计）

- **表**：`za_monitor_app`、`za_monitor_log`（按天分区/TTL）、`za_monitor_agg_5m`、`za_monitor_agg_day`、`za_monitor_alert_rule`、`za_monitor_alert_history`。
- **采集**：`POST /monitor/collect`，批量 + `Content-Encoding: gzip`，`appId` 白名单校验、IP/UA 限流、无用户态鉴权（SDK 在浏览器端）。
- **写入**：三级优先级内存队列（ERROR/业务失败=high，API/PERFORMANCE=normal，CLICK/ROUTE=low）→ 批量落库；参数与应用配置一一对应。
- **聚合**：短窗口（<=24h）走明细实时聚合（P95 全量排序，标注「全量值排序」）；长窗口走日预聚合（P95 直方图近似，标注「直方图近似」）。这正是 vis 的两套口径，**必须原样保留提示语**，否则会给出误导性数字。
- **保留策略**：明细 7–30 天，聚合 1 年；`truncated` 标志在单窗口扫描量超限时置位并透传到前端。
- **预警**：realtime 走滑动窗口计数（`windowMinutes` + `minCount`），agg 走定时巡检；命中后按 `cooldownMinutes`（默认 10）做同规则+同维度冷却；投递失败可重发且**不计入冷却计数**（与 vis 一致）。

### 8.4 与本仓现有能力的对接点

| 能力 | 落点 |
|---|---|
| 菜单 | `service/src/db/index.ts` 的 `insertMenuTree` 增加「监控中心」分组（工作台/实时日志/操作日志/应用管理/数据分析…），图标沿用 `ai:AiOutline*` 体系 |
| 权限 | 菜单级走现有角色-菜单；按钮级用 `PermissionGuard`；数据域（按 appId）新增扩展 |
| 主题 | 严格 `createStyles` + token，禁硬编码颜色（PRODUCT.md 约束）。vis 用的 `--brand`/`--aiops-danger|warning|success|info` 需映射为 antd token（`colorPrimary`/`colorError`/`colorWarning`/`colorSuccess`/`colorInfo`） |
| 请求 | `packages/layout/utils/http.ts`；直连 vis 时加 `msg → message` 适配 |
| 字典 | `rangeType`/`alertType`/`perfStage` 建议落 `packages/metadata` 的 OptionSet，避免前端硬编码枚举 |
| i18n | `packages/locales/zh-CN.ts`、`en-US.ts` 增加 `monitor` 命名空间 |
| 文档 | `docs/monitor/*.md` + `docs/.vitepress/config.ts` sidebar |
| 测试 | 沿用 Vitest + jsdom；聚合/队列/规则判定用纯函数单测（对齐 `packages/form-designer` 的测试密度） |

### 8.5 分期计划

| 期 | 内容 | 验收 |
|---|---|---|
| **P0**（1–1.5 周） | `contracts` + `constants` + `services` + `runtime/client`；应用管理页；**实时日志页**（虚拟列表、批次分组、JSON 格式化、二次筛选、增量轮询、条件持久化）；菜单/权限/i18n 接入；mock 数据 | 用 mock 可完整跑通「选应用 → 检索 → 批次展开 → 自动刷新 → 复制」；`pnpm lint`、`pnpm test` 全绿 |
| **P1**（1 周） | 工作台看板 + 性能/接口/行为/JS错误/业务错误五个分析页 + 5 个复用组件（FilterBar/StatCards/PanelBlock/TrendChart/HbarList/StatNotes） | 30 天窗口上限、>24h 强制按天、口径提示全部生效；echarts 支持 dataZoom |
| **P2**（1 周） | 预警规则配置（8 条规则动态表单）+ 预警记录 + 通道投递 + 失败重发；队列配置与运行时状态面板 | 规则默认值与 vis 一致；重发不产生冷却计数 |
| **P3**（1–2 周） | `packages/monitor-sdk` 采集端 + `service/src/modules/monitor` 采集/队列/聚合/预警落地 | 自建 demo 页埋点后，实时日志与分析页出现真实数据；聚合口径与明细可交叉校验 |
| **P4** | sourcemap 还原、同用户时间线、CSV 导出、告警静默/值班/升级、按 appId 数据权限 | 按需排期 |

### 8.6 待确认决策点

1. 后端是复用 `portal-test.yntrust.com` 的 vis 服务（路线 B），还是用本仓 `service/` 自研（路线 C）？
2. 是否已有可用的采集 SDK？若已有，P3 可整期砍掉，只做看板与预警。
3. 消息通道必须支持哪些：飞书 / 企业微信 / 通用 webhook / 短信？
4. 预期数据量级与保留周期？（决定 SQLite → MySQL → ClickHouse 的选型拐点）
5. 是否需要先出一个 iframe 过渡版本给业务方看效果？

> 以上 5 点均已确认，结论见第 9 节开头。

---

## 9. 落地实现（本轮交付：全自研、无 iframe、直接跑在本后台）

8.6 的决策点已全部落定：

| 决策点 | 结论 |
|---|---|
| 后端路线 | **C 全自研**，落在 `service/src/modules/monitor/`，不复用 vis 后端 |
| 采集 SDK | 无现成 SDK，**自研** `packages/monitor-sdk/`，并已直接接入本仓（zealous-admin 自己就是被监控对象） |
| 消息通道 | **通用 Webhook + 飞书自定义机器人**（详见 9.2） |
| 数据量级 / 保留期 | 明细 **7 天**、预警记录 **90 天**、SQLite、单窗口聚合扫描上限 **5 万行**（详见 9.3） |
| iframe 过渡版 | **不做**，9 个页面全部是仓内 React 组件，与本后台共用鉴权 / 主题 / 菜单 / 请求层 |

### 9.1 交付清单

| 层 | 路径 | 内容 |
|---|---|---|
| 后端 | `service/src/modules/monitor/` | `schema.ts` 建表 + 应用种子、`collector.ts` 采集入口、`queue.ts` 三级优先级内存队列、`aggregate.ts` 五类统计、`alert.ts` 实时判定 + 定时巡检 + 冷却 + 重发、`channels.ts` 通道投递、`routes.ts` 19 个接口、`validation.ts` zod 校验、`constants.ts` 规则目录与阈值 |
| 采集端 | `packages/monitor-sdk/` | 零依赖浏览器 SDK，7 个采集器（error / promise / api / performance / resource / click / route）覆盖 8 类 `rangeType`；批量上报 + `sendBeacon` 兜底；`monitor.report()` 供业务主动上报；`monitor.test.ts` 8 个 jsdom 用例 |
| 前端模块 | `packages/monitor/` | 8 个视图（工作台 / 实时日志 / 应用管理 / 性能 / 接口 / 行为 / 错误分析×2 / 预警记录）+ 7 个复用组件 + `contracts` 契约 + `constants` 字典 + `runtime/client.ts`（可切 baseURL） |
| 路由页面 | `src/pages/index/monitor/**` | 9 个薄包装页面，文件路由与种子菜单 path 一一对应 |
| 接线 | `src/main.tsx`、`src/App.tsx` | `initMonitor()` 启动采集（try/catch 兜底，监控失败不阻断渲染）；`configureMonitorClient()` 复用 `packages/layout` 的 `http`；登录态变化时 `monitor.setUser({ nickname, uid })` |
| 菜单 | `service/src/db/index.ts` | `seedMonitorMenu()` 幂等种子「监控中心」10 个节点，并授予现有全部角色 |
| 环境变量 | `.env`、`vite-env.d.ts` | `VITE_MONITOR_APP_ID`（默认 `zealous-admin`）、可选 `VITE_MONITOR_REPORT_URL`（缺省取 `VITE_BASE_SERVER_URL + /monitor/collect`） |

`ErrorAnalysis` 用 `kind: 'js' | 'biz'` 一份组件承载两个菜单，口径差异（分母是 PV 还是主动上报操作总数）由后端返回并在页面 `StatNotes` 明示。

### 9.2 消息通道是怎么工作的（回答「消息通道我没理解」）

**先分清两条链路**，这是最容易混淆的点：

- **入站（采集）**：浏览器 SDK → `POST /monitor/collect` → 内存队列 → 落 `za_monitor_log`。这条链路不需要任何通道配置，公开接口、无鉴权。
- **出站（通知）**：预警规则命中 → `dispatchChannels()` → 你配置的「消息通道」→ 结果落 `za_monitor_alert_history.channels`。**「消息通道」只属于这条出站链路**，即「预警命中之后往哪儿发通知」。

配置入口：`监控中心 → 应用管理 → 预警配置`，或各分析页右上角「告警配置」按钮（分析页只暴露本主题相关的规则，其余规则原样回写）。每个通道 5 个字段：

| 字段 | 含义 |
|---|---|
| `type` | `webhook`（通用）或 `feishu`（飞书自定义机器人） |
| `enabled` | 关掉即保留配置但不投递 |
| `url` | 接收地址 |
| `secret` | 仅飞书用：机器人「签名校验」密钥，留空则不签名 |
| `templateId` | 仅飞书用：`TEXT_CARD` 交互卡片 / `MARKDOWN` 纯文本 |

两种通道的差异：

- **通用 Webhook**：把预警 JSON 原样 POST 过去（`appId / appName / ruleId / ruleLabel / alertType / level / title / windowMinutes / happenTime / fields`），对方返回 2xx 即算成功。企业微信、钉钉、短信网关都可以通过一个 10 行的转发中间层接进来，因此没有为它们各写一个通道。
- **飞书自定义机器人**：按飞书协议组包（卡片或纯文本），配了 `secret` 就附带 `timestamp` 与 `sign`（`HmacSHA256(timestamp + "\n" + secret)` 后 base64，与飞书文档一致）。地址就是「群设置 → 群机器人 → 添加自定义机器人」拿到的 webhook。

投递与治理规则：

- **触发时机**：realtime 规则（`API_SLOW` / `API_ERROR` / `PROACTIVE_RT`）在日志入队后按滑动窗口判定，15s 节流；agg 规则（`API_AGG` / `WINDOW_ERROR_AGG` / `PROMISE_ERROR_AGG` / `PROACTIVE_AGG` / `FALLBACK_AGG`）每 60s 巡检一次。
- **并发投递**：同一预警同时发给所有 enabled 通道，逐通道记录 `{ ok, status, error, at }`，因此「哪个通道挂了」在预警记录页一眼可见。
- **冷却**：同一「规则 + 维度」在 `cooldownMinutes`（默认 10 分钟）内再次命中，只把该记录的 `cooldownHit + 1`，不重复外发，避免刷屏。
- **失败重发**：预警记录页「重发」只重投**失败**的通道，使用**当前**应用配置里的通道地址（改完地址再重发即可验证），且**不产生新的冷却计数**——与 vis 行为一致。

### 9.3 数据量级与保留周期

- **存储**：沿用 `service/` 的 `node:sqlite`（`service/data/sqlite.db`，已 gitignore），三张表 `za_monitor_app` / `za_monitor_log` / `za_monitor_alert_history`。
- **保留期**：明细 `LOG_RETENTION_DAYS=7`、预警记录 `ALERT_RETENTION_DAYS=90`，可用同名环境变量覆盖。服务启动时清一次，之后每小时清一次，也可 `POST /monitor/maintenance/prune` 手动触发。
- **量级估算**：SDK 默认全量采样，一次会话大约产出「路由 1 + 性能 1 + 资源汇总 1 + 每个接口 1 + 每次点击 1」条。按 50 日活 × 人均 200 条 ≈ 1 万条/天，7 天约 7 万行、单行约 0.5KB，也就是几十 MB —— SQLite 毫无压力。
- **性能护栏**：单窗口聚合扫描上限 `AGG_SCAN_LIMIT = 50000` 行，超出即置 `truncated=true`，前端在页面顶部明示「数据量超单窗口上限，部分指标为截断样本口径」；查询窗口硬上限 30 天，超过直接 400。窗口 > 24h 时强制按天粒度，分位数走直方图近似并标注「直方图近似」——**这两条提示语必须保留**，否则会给出误导性数字。
- **选型拐点**：日增量长期 > 50 万行，或业务要求 > 30 天明细 / 秒级多维下钻时，再迁 MySQL（按天分区）或 ClickHouse。前端请求实现由 `packages/monitor/runtime/client.ts` 的 `configureMonitorClient` 注入，换后端不动前端。
- **减量手段**：SDK 支持 `sampleRate`（0~1）与 `disabled`（按采集器关闭）。高流量场景把 `click` / `route` 采样到 0.1~0.3，量级立刻降一个数量级，而 `error` / `api` 建议保持全量。

### 9.4 本地跑通

```bash
pnpm --filter @zealous-admin/service dev   # 后端 http://localhost:3508（首次启动自动建表 + 种子应用 + 种子菜单）
pnpm dev                                   # 前端 http://localhost:3509
```

用 `admin / admin123` 登录后，左侧出现「监控中心」。因为 SDK 已在 `src/main.tsx` 接入，**你自己的浏览行为就是数据源**：进入任意页面约 5 秒（SDK `flushInterval`）后，工作台 / 实时日志 / 性能统计就会出现真实的 PV、加载耗时、接口调用与点击记录。

想立刻看到预警链路：`应用管理 → 预警配置` 打开总开关，加一条飞书或 webhook 通道，把「接口报错（实时）」的次数下限调成 1，然后在任意页面触发一个失败请求即可。

清空本地数据（例如想重新演示）：停掉后端后执行

```bash
node -e "const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync('./service/data/sqlite.db');db.exec('DELETE FROM za_monitor_log;DELETE FROM za_monitor_alert_history');db.close()"
```

### 9.5 已验证 / 未验证

已验证（本机实跑）：

- `POST /monitor/collect` 批量入队落库（227 条 3 批，`accepted=227 / dropped=0`），单批 > 100 条按契约拒绝
- 五类统计接口全部返回真实聚合值：workbench / perf / api / behavior / error / biz-error
- 预警全链路：realtime `API_ERROR` 与 agg `WINDOW_ERROR_AGG` 均触发 → webhook 返回 500 记为失败 → 改地址后重发成功（`retryCount=1`）→ 冷却期内二次命中只累加 `cooldownHit`
- 鉴权：`/monitor/collect` 公开，其余接口无 token 返回 401
- SDK 行为：`packages/monitor-sdk/monitor.test.ts` 8 个 jsdom 用例覆盖首屏路由、window 异常、Promise 拒绝、点击文案提取、路由来源、主动上报、`setUser`、`destroy` 后停止采集
- 构建期：`tsc --noEmit`（前后端各自）0 错、`eslint` 0 error、`vitest run` 全仓 495 用例通过、vite 文件路由已生成 `/monitor/**` 9 条带 `meta.auth` 的路由
- 视觉与交互：Playwright E2E（`e2e/`）渲染 11 例 + 交互 9 例 + 预警链路 1 例，加登录 setup 共 22 个 run，全量连跑全绿，全页截图存 `e2e/screenshots/`，详见 9.7

未验证（需要你在浏览器里确认）：

- 飞书真实机器人投递（本机只验证到 webhook 协议与签名计算，没有真实飞书群）

### 9.6 已知限制与后续排期

- 修复了 `listAlertHistory` 的分页口径问题：`channel` / `ok` 原先在 JS 侧后过滤，导致 `total` 与 `list` 不一致；现已下推为 SQLite JSON1 谓词，`total` 与分页严格对齐。
- 明细日志没有做虚拟列表，单页最大 200 条；数据量大时建议先用时间窗口 + 类型收敛，再考虑 P4 的虚拟滚动。
- 尚未做：sourcemap 还原、同用户行为时间线、CSV 导出、告警静默/值班/升级、按 `appId` 的数据权限。这些都在 8.5 的 P4，按需再排。
- 采集接口目前没有 IP/UA 限流与 `appId` 白名单签名，公网部署前建议补上（内网后台可暂缓）。
- 布局用户头像依赖外网 `api.dicebear.com`（`packages/layout/components/UserInfo/UserInfo.tsx`、`ProfileModal.tsx`），内网/离线部署会超时并在每个页面产生控制台报错；E2E 已将其按环境噪音过滤，建议后续改本地默认头像或走后端代理。

### 9.7 自动化测试：Playwright 视觉 + 交互

回答「页面视觉效果和交互细节可以自动化测试下吗」：可以，且已落地。

- 入口：`pnpm test:e2e`（即 `playwright test`）。`playwright.config.ts` 会自行拉起后端（tsx）与前端（vite，独立端口 3510，避免复用长期运行、依赖预构建缓存已过期的 dev server）。
- 数据：`e2e/global-setup.ts` 先清掉 `za-e2e` / `za-e2e-alert` 两个测试应用的历史数据，再确定性灌入 213 条日志（全部落在最近 20 分钟），随后把后端统计接口的真实返回值落盘到 `e2e/.cache/expected.json`。UI 断言一律与这份期望值对账，不写魔法数字。
- 会话：`e2e/auth.setup.ts` 走真实登录页 UI 登录并保存 storageState，顺带把 9 条监控路由各访问一次，焐热 rolldown-vite 的按需编译缓存。
- 渲染套件 `e2e/monitor-render.spec.ts`（11 例）：9 页渲染 + 无控制台报错 + 无横向溢出 + 全页截图；工作台/性能/接口/行为/JS 错误/业务错误的指标卡与后端逐项对账；1280 宽度响应式；并用「scrollWidth > clientWidth」断言守住窄容器里的文案截断（级别 Segmented 曾被截成 ERR…/DEB…）。九页连跑用例单独放宽到 180s：冷编译或机器被抢占时 90s 默认上限会误报超时。
- 交互套件 `e2e/monitor-interaction.spec.ts`（9 例）：实时日志的级别筛选、本地关键字、卡片⇄表格、查询面板折叠、批次展开收起；接口分析的隐藏接口（含「已隐藏」浮层恢复）与次数阈值；应用管理的消费配置弹窗取消不落库、队列状态抽屉；预警记录筛选触发真实请求；工作台刷新重拉。
- 预警链路套件 `e2e/monitor-alert.spec.ts`（1 例）：本地 webhook sink（`e2e/helpers/sink.ts`，3999 端口，`/fail` 恒 500、`/ok` 恒 200、`/received` 供断言）；给预警专用应用 `za-e2e-alert`（`E2E_ALERT_APP`，与种子应用完全隔离）配 realtime `API_ERROR` 规则后灌一条报错日志 → 断言预警落库且通知失败、sink 收到 payload → 在 UI 的预警配置弹窗把通道改到 `/ok` 保存 → 点「重发」断言 `retryCount+1`、通知转成功、sink 收到 `/ok` → 过 15s 节流再灌同维度日志，断言只累加 `cooldownHit` 且不再外发。用例结束在 `finally` 里把该应用的 `alert` 置空（应用保留，固定 appId 幂等复用）。隔离的原因：alert 用例灌的 ERROR 日志会让 `za-e2e` 的接口明细多出一行、预警记录的空态断言失真，全量连跑曾因此挂掉 5 例。
- CI：`.github/workflows/monitor-verify.yml`（lint 监控范围 + 前后端 tsc + vitest + E2E，上传 report 与截图为 artifact）。全仓 lint/tsc 的历史遗留问题不卡 CI，只卡监控模块范围。
- 未采用 `toHaveScreenshot()` 像素基线：CI 跑在 ubuntu 而本地开发在 Windows，字体渲染差异会让基线跨机必挂；当前以「结构性断言 + 全页截图人工 diff」替代，确需像素回归时再按 OS 拆 job 生成基线。
- 视觉验收：截图在 `e2e/screenshots/`；`00-<页>-zealous-admin` 是默认应用视角，`01`~`10` 是 E2E 应用视角。改样式后重跑即可肉眼 diff。
- 本轮靠它抓到的真问题：antd v6 的 Select/Segmented DOM 变更、启动遮罩遮挡点击、Vite 依赖重预构建 504、`sendBeacon` 跨域被 `ACAO: *` 拒绝、接口分析隐藏后无法恢复、用例间数据污染（预警用例与种子应用共用 appId，已拆出 `za-e2e-alert`）。后三项已修，见 9.8。

### 9.8 本轮顺带修复的真实缺陷

- `service/src/app.ts`：CORS 由 `origin: '*'` 改为回显请求源并允许凭据。原因：采集 SDK 在页面卸载时用 `navigator.sendBeacon` 兜底上报，浏览器以 credentials 模式发跨域请求，`*` 会被整批拒绝，跨域部署时静默丢日志。同时新增 `X-Request-Id` 响应头并通过 `exposedHeaders` 暴露（`service/src/middleware/requestId.ts`），让接口日志的「请求ID」列真正可用。
- `packages/monitor/views/ApiAnalysis.tsx`：隐藏接口后该行从表格移除，「取消隐藏」成为死代码；现改为点击「已隐藏 N 个接口」Tag 弹出浮层逐条恢复。
- `packages/monitor/views/AppManager.tsx`：antd v6 弃用 Drawer `width`，改用 `size`，消除控制台弃用告警。
- `packages/monitor/views/LogStream.tsx`：查询面板最窄 300px 时，级别 Segmented 默认尺寸下 ERROR/DEBUG 被 ellipsis 截成 `ERR…`/`DEB…`；改为 `size="small"` 后五项完整可读，渲染套件新增 `expectNoEllipsis` 断言防回归。

---
## 附录 A：`packages/monitor/contracts/monitor.ts` 类型草案

见第 4 节代码块，落地时补 `CommonPage<T>` 分页包装与 `PageParam` 对齐。

## 附录 B：枚举字典（原样照搬，避免语义漂移）

`rangeType`(8)、`logLevel`(4)、`alertType`(9)、`ruleId`(8)、`perfStage`(8)、`logTimeType`(1h/2h/8h/12h/1d/3d/7d/自定义)、`statsTimeType`(1h/4h/8h/24h/3d/7d/30d/自定义)、`templateId`(TEXT_CARD/MARKDOWN)。
