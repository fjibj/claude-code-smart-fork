# 使用示例 (Usage Examples)

## 场景一：日常开发中的会话管理

### 背景
你同时在多个项目中工作，每天切换不同的任务。Smart Fork 可以帮助你快速找到之前做到哪里了。

### 工作流程

#### 早上：开始工作

```bash
# 1. 查看最近的会话
/list-sessions

# 输出示例：
# 📋 5 Indexed Session(s):
#
# D:\projects\my-app:
#   • 实现用户登录功能...
#     ID: abc123... | 2026/3/3
#   • 修复支付 bug...
#     ID: def456... | 2026/3/2
#
# D:\projects\api-server:
#   • API 性能优化...
#     ID: ghi789... | 2026/3/3
```

#### 中午：切换到另一个项目

```bash
# 当前在 my-app 项目，需要切换到 api-server 的会话
/fork-to ghi789

# 输出示例：
# 🔄 Forking to session: ghi789
# 📄 src/controllers/user.js
# 📄 src/routes/api.js
#
# 📋 Session Summary:
# API 性能优化
#
# 💬 Conversation History:
# [1] 👤 User: 帮我优化一下用户查询接口的性能
# [1] 🤖 Assistant: 让我分析一下当前的实现...
# ...
```

#### 下午：返回原始会话

```bash
# 查看完成后，返回原来的会话
/fork-back

# 输出示例：
# 🔄 Forking back to previous session: abc123
# ✓ Forked back to previous session!
```

---

## 场景二：跨项目搜索解决方案

### 背景
你在当前项目遇到了一个问题，记得之前在其他项目中解决过类似的问题，但不记得是哪个项目了。

### 问题场景

```bash
# 当前项目：新电商项目
# 问题：npm install 报 403 forbidden 错误

# 使用跨项目搜索
/fork-detect -q "npm install 403 forbidden" --all
```

### 输出示例

```
🔍 Analyzing current context...

Query: npm install 403 forbidden...

✓ Found 2 relevant session(s):

1. my-first-app
   Path: D:\claudecode\MyAICodes\my-first-app
   Relevance: 45%
   Summary: npm install 403 forbidden 错误修复
   Last updated: 2026/3/4

2. shopping-cart
   Path: D:\projects\shopping-cart
   Relevance: 23%
   Summary: 修复 npm 权限问题
   Last updated: 2026/2/28

Select a session to fork (1-2, or 0 to cancel):
```

### 切换到找到的会话

```bash
# 选择第一个会话（输入 1）
# 或者直接指定 session ID
/fork-to 6dd285b5-6bc1-42db-88e2-3537285590c4

# 现在你可以看到之前解决这个问题的完整对话
```

---

## 场景三：长时间项目的进度管理

### 背景
一个持续数周的项目，你需要记住之前的进度和决策。

### 完整流程

#### Day 1: 开始项目

```bash
# 开始实现用户认证系统
/index-session -s "用户认证系统 - 设计和实现" -t "auth,session,start"
```

#### Day 2: 继续工作

```bash
# 查找昨天的会话
/fork-detect -q "用户认证 登录 session"

# 输出示例：
# ✓ Found 1 relevant session(s):
# 1. my-app
#    Relevance: 78%
#    Summary: 用户认证系统 - 设计和实现
#    ID: day1-session-id

# 切换到会话继续工作
/fork-to day1-session-id
```

#### Day 3: 遇到问题需要回顾

```bash
# 搜索之前关于 JWT 的讨论
/fork-detect -q "JWT token 认证 过期"

# 查看状态
/fork-status

# 输出示例：
# 🔀 Fork Status
#
# Currently forked to: day1-session-id
# Working Directory: D:\projects\my-app
# Git Branch: feature/auth
#
# 💡 Suggested Sessions:
# • 用户认证系统 - 数据库设计 (Relevance: 65%)
# • 用户认证系统 - JWT 实现 (Relevance: 58%)
```

#### Day N: 项目完成后整理

```bash
# 导出完整的会话记录作为文档
smart-fork export final-session-id -o auth-implementation-notes.json

# 查看所有相关会话
smart-fork list -p D:\projects\my-app --json | jq '.[] | select(.summary | contains("认证"))'
```

---

## 场景四：多分支并行开发

### 背景
你在同一项目的不同分支上开发多个功能，需要频繁切换。

### 设置

```bash
# 分支结构：
# main
# ├── feature/auth (用户认证)
# ├── feature/payment (支付功能)
# └── feature/analytics (数据分析)
```

### 工作流程

```bash
# 上午：在 auth 分支工作
git checkout feature/auth
# ... 工作 ...
/index-session -s "Auth feature - OAuth 集成" -t "auth,oauth,feature"

# 下午：切换到 payment 分支
git checkout feature/payment
/fork-detect -q "支付 集成 payment"
/fork-to payment-session-id

# 第二天：返回 auth 分支
git checkout feature/auth
/fork-detect -q "OAuth 认证"
/fork-to oauth-session-id

# 查看当前状态
/fork-status
```

---

## 场景五：问题排查和调试

### 背景
你遇到了一个复杂的 bug，需要查看之前是否遇到过类似问题。

### 排查流程

```bash
# 1. 索引当前问题会话
/index-session -s "Bug: 用户登录后页面空白" -t "bug,login,blank-page"

# 2. 搜索历史记录
/fork-detect -q "登录后空白 页面不显示"

# 3. 如果没有找到，扩大搜索范围
/fork-detect -q "login blank screen" --all --threshold 0.1

# 4. 找到相关会话后，查看完整对话
/fork-to related-session-id

# 5. 查看之前的解决方案并应用
```

---

## 场景六：学习和知识积累

### 背景
你在学习新技术，想要记录学习过程并方便以后回顾。

### 学习记录

```bash
# 第一次学习 React Hooks
/index-session -s "React Hooks 学习 - useState useEffect" -t "react,hooks,learning"

# 一周后
/index-session -s "React Hooks - 自定义 Hook" -t "react,hooks,custom"

# 查找特定主题
smart-fork list --json | grep -i hooks

# 导出学习笔记
smart-fork export session1 -o react-hooks-part1.json
smart-fork export session2 -o react-hooks-part2.json
```

---

## 高级用法

### 1. 使用标签管理会话

```bash
# 索引时添加多个标签
/index-session -s "实现购物车功能" -t "feature,shopping-cart,urgent"

# 按标签搜索（需要自定义脚本）
smart-fork list --json | jq '.[] | select(.tags | contains(["urgent"]))'
```

### 2. 批量操作

```bash
# 导出所有会话
for id in $(smart-fork list --json | jq -r '.[].id'); do
  smart-fork export $id -o "backup-$id.json"
done

# 清理旧会话（谨慎使用）
smart-fork list --json | jq -r '.[] | select(.updatedAt < 1700000000000) | .id' | xargs rm
```

### 3. 自定义查询

```bash
# 搜索特定项目的会话
/fork-detect -p D:\projects\my-app -q "数据库优化"

# 增加返回数量
/fork-detect -n 10 -q "API design"

# 降低阈值找到更多相关结果
/fork-detect --threshold 0.1 -q "微服务架构"
```

---

## 命令速查表

| 命令 | 简写 | 说明 | 示例 |
|------|------|------|------|
| `/fork-detect` | - | 搜索相关会话 | `/fork-detect -q "关键词" --all` |
| `/fork-to` | - | 切换到指定会话 | `/fork-to <session-id>` |
| `/fork-back` | `/back` | 返回原始会话 | `/fork-back` |
| `/fork-status` | - | 显示当前状态 | `/fork-status` |
| `/index-session` | - | 索引当前会话 | `/index-session -s "摘要" -t "标签"` |
| `/list-sessions` | - | 列出所有会话 | `/list-sessions --json` |

---

## 常见问题

### Q: 如何删除一个会话？

```bash
# 1. 找到会话 ID
/list-sessions

# 2. 手动删除（需要编辑文件）
# 编辑 ~/.smart-fork/index.json，删除对应条目
# 删除 ~/.smart-fork/sessions/<session-id>.json
```

### Q: 如何备份所有数据？

```bash
# 备份整个目录
cp -r ~/.smart-fork ~/backups/smart-fork-$(date +%Y%m%d)

# 或者导出所有会话
smart-fork list --json > index-backup.json
for id in $(smart-fork list --json | jq -r 'keys[]'); do
  smart-fork export $id -o "session-$id.json"
done
```

### Q: 会话数据占用多少空间？

```bash
# 查看占用空间
du -sh ~/.smart-fork/

# 典型大小：
# - 一个会话：10KB - 100KB（取决于对话长度）
# - 100 个会话：约 1MB - 10MB
```

### Q: 可以在不同电脑之间同步吗？

```bash
# 可以，通过同步 ~/.smart-fork 目录
# 推荐使用云盘或 Git 同步

# 方法 1：使用云盘
# 将 ~/.smart-fork 移动到云盘目录，然后创建软链接

# 方法 2：使用 Git
# 将 ~/.smart-fork 初始化为 Git 仓库（排除大文件）
```

---

## 最佳实践

1. **及时索引** - 每次重要对话后都索引，方便以后查找
2. **使用描述性摘要** - 帮助以后快速识别会话内容
3. **添加标签** - 便于分类和筛选
4. **定期备份** - 防止数据丢失
5. **清理旧数据** - 删除不再需要的会话，保持索引精简
