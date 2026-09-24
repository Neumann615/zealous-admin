# 系统架构驾驶舱设计记录

## 背景

系统需要一个可维护的架构视图，用于回答三类问题：前端与后端各层职责如何划分、数据库业务域如何建模、接口权限如何与真实鉴权保持一致。该页面面向研发与运维，不做代码生成或在线改库。

## 方案

- 新增 `/system/architecture` 菜单与 `system:architecture:list` 权限，页面 key 为 `system/architecture`。
- 后端提供 `GET /system/architecture`，一次返回概览指标、前后端分层、请求链路、数据库域和接口权限矩阵。
- 数据库字段、索引、外键通过 `sqlite_master` 与 `PRAGMA table_info / index_list / index_info / foreign_key_list` 实时读取，不新增第二份架构描述表。
- 前后端模块职责与业务域说明使用服务端静态 manifest 维护；未知表自动归入「扩展与运维」，避免遗漏真实结构。
- 接口矩阵直接聚合 `ROUTE_PERMISSIONS`，指标中的接口总数额外计入白名单接口，保证页面与服务端权限决策同源。
- 页面采用单页驾驶舱：指标、三列分层 / 链路、业务域卡片、可展开权限矩阵顺序呈现，不使用 Tab；表结构通过 Drawer 查看明细。

## 数据库域

| 域 | 核心表 | 设计要点 |
| --- | --- | --- |
| 认证与权限 | `za_admin`、`za_role`、`za_menu`、两张关系表、会话吊销 / 登录限流表 | 用户 → 角色 → 菜单授权，权限标识驱动接口鉴权 |
| 表单中心 | `za_form_category`、`za_form`、`za_form_version`、`za_form_data` | 稳定主档 + 不可变版本，提交绑定版本 |
| 元数据 | `za_metadata_set`、`za_metadata_item` | 编码唯一、支持树形选项与状态 |
| 监控中心 | `za_monitor_app`、`za_monitor_log`、`za_monitor_alert_history` | 以 `app_id` 关联日志、告警与队列配置 |

## 验收

- 新库默认包含系统架构菜单；老库启动自动补菜单并继承 `/system` 的角色授权。
- 数据库域能覆盖全部非 SQLite 内部表，且表结构明细来自当前运行库。
- 权限矩阵端点数等于 `ROUTE_PERMISSIONS` 数量，并包含 `/system/architecture` 自身。
- 页面所有主区块同页呈现，主交互不出现 `Tabs`。
