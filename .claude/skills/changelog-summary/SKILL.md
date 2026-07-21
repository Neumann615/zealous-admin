---
name: changelog-summary
description: 分析代码变更，按照项目根目录 CHANGELOG.md 的格式写入更新内容，并生成一句代码提交日志。当用户要求总结改动、整理提交日志或更新 changelog 时使用。
version: "1.0.0"
license: MIT
metadata:
  hermes:
    tags: [git]
---

# Changelog Summary Skill

## Instructions

严格按下面顺序执行，不可跳过任何一步。

### Step 1: 获取变更

```bash
git diff HEAD -- . ":(exclude)node_modules" ":(exclude)CHANGELOG.md"
```

### Step 2: 分析并分类

将每条变更归入以下类型，同类合并，只保留关键信息,尽量精简一点，不要说的过于具体：

| 图标 | 类型 | 适用场景 |
|------|------|---------|
| ✨ | 新增 | 新功能、新组件、新模块 |
| 🔧 | 更新 | 重构、优化、改进 |
| 🐛 | 修复 | Bug 修复 |
| 🗑️ | 删除 | 删除文件或功能 |
| 📝 | 文档 | 文档更新 |

### Step 3: 读取已有 CHANGELOG（必须）

```bash
cat CHANGELOG.md 2>/dev/null || echo ""
```

如果文件不存在则创建 `# Changelog` 标题。

### Step 4: 拼接写入

将新内容**插入今日日期条目**（已有则追加到当日条目下，没有则新建），不要修改旧的提交日志，**完整保留所有历史内容**。

合并同类项后每条不超过 2 行，文件/组件名用反引号包裹。格式：

```markdown
## YYYY-MM-DD

- 图标 **标题**（`file.tsx`）：一句话描述
```

### Step 5: 生成提交日志

一句不超过 50 字符，前缀：`feat` / `fix` / `refactor` / `chore`。用顿号或空格分隔多项。

### Step 6: 输出

写入文件后，在聊天中只输出提交日志，不多解释，千万千万不要自己主动提交。

## 关键规则

- **必须先用 `cat` 或 Read 工具读取已有 CHANGELOG.md，再拼接写入，严禁覆盖**
- 如果已存在今日条目，追加到该条目下，不新建重复日期标题
- 每条变更精炼到一句话，删除的文件注明行数（如 `287 行`）
- 数据库变更用 🔧 标记，注明表和 SQL 操作
- 代码提交日志不超 50 字符
