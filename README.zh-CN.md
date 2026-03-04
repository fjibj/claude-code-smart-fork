# Claude Code Smart Fork

🔀 **Claude Code 智能会话分支** - 使用 AI 驱动的语义搜索，在所有项目中查找并恢复相关的历史会话。

**[中文](README.zh-CN.md)** | **[English](README.md)**

[![npm version](https://badge.fury.io/js/claude-code-smart-fork.svg)](https://www.npmjs.com/package/claude-code-smart-fork)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js CI](https://github.com/fjibj/claude-code-smart-fork/actions/workflows/ci.yml/badge.svg)](https://github.com/fjibj/claude-code-smart-fork/actions)

## 🌟 功能特性

- 🔍 **语义搜索** - 基于含义而非关键词查找相关会话
- 🌐 **跨项目** - 在所有项目中搜索，不限于当前项目
- 🤖 **AI 驱动** - 使用嵌入向量理解上下文和意图
- ⚡ **快速** - 本地向量存储，即时返回结果
- 🔒 **隐私** - 默认所有数据保存在本地
- 🎯 **简易集成** - 作为 slash 命令无缝集成到 Claude Code

## ✨ 核心优势

### 1. 完整的会话历史保留

| 传统方式 | Smart Fork |
|----------|------------|
| ❌ 只记录用户输入 | ✅ **完整记录输入和输出** |
| ❌ 丢失助手响应 | ✅ 保存完整的对话轮次 |
| ❌ 丢失上下文 | ✅ 保留所有工具调用和元数据 |

- 完整保存对话历史（用户消息 + 助手响应）
- 存储在本地 `~/.smart-fork/sessions/<session-id>.json`
- 包含所有工具调用、元数据和时间戳
- **零 Token 成本** 检索（本地向量搜索）

### 2. 🔐 隐私优先 - 完全本地存储

```
数据流向对比：

传统云方案：
用户 → 本地 → 云端 API → 云端存储 → 返回结果
         ⚠️ 数据离开本地

Smart Fork：
用户 → 本地 → 本地向量库 → 返回结果
         ✅ 数据不出本地
```

**存储位置：**
```
~/.smart-fork/
├── config.json      # 配置（本地）
├── index.json       # 索引 + 向量（本地）
└── sessions/        # 完整会话数据（本地）
```

**优势：**
- ✅ 不上传到任何云服务（使用 local 嵌入提供者时）
- ✅ 无需担心数据泄露
- ✅ 符合企业数据安全要求
- ✅ 可离线使用

### 3. 💰 零 Token 消耗 - 检索免费

| 操作 | 传统 RAG 方案 | Smart Fork |
|------|--------------|------------|
| 索引会话 | 需要调用 Embedding API（付费） | 本地计算（免费） |
| 搜索会话 | 需要调用 Embedding API（付费） | 本地计算（免费） |
| 存储 | 云数据库（持续付费） | 本地 JSON（免费） |

### 4. 🤖 Human-in-the-Loop 设计

Smart Fork 采用**人在回路**（Human-in-the-Loop）的设计理念：

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   用户决策    │ ──> │  工具执行    │ ──> │   结果确认    │
│  (选择会话)   │     │ (切换会话)   │     │  (继续对话)   │
└──────────────┘     └──────────────┘     └──────────────┘
       ↑                                                      │
       └──────────────────────────────────────────────────────┘
                        人类控制循环
```

**工作流程：**
1. **搜索阶段** - 系统推荐相关会话，用户选择
2. **切换阶段** - 用户确认后再切换会话
3. **继续对话** - 用户决定是否从历史会话继续

### 5. 📦 会话级别的完整上下文

**传统方式的问题：**
```
当前主流 CLI 工具：
- 只记录当前会话的输入
- 不保存助手的输出（tool results, thinking 等）
- 切换会话后丢失所有上下文
```

**Smart Fork 的解决方案：**
```json
{
  "conversationHistory": [
    {
      "userMessage": { "content": "npm install 报 403 错误" },
      "assistantMessage": {
        "content": "让我帮你看看...",
        "toolCalls": [{"type": "Bash", "command": "npm install"}]
      }
    }
  ]
}
```

**优势：**
- ✅ 保存完整的对话轮次（turns）
- ✅ 包括工具调用和结果
- ✅ 可以恢复到之前的精确状态
- ✅ 方便知识沉淀和经验传承

### 6. 🚀 跨项目语义搜索

```
传统 grep 搜索：
  搜索 "npm 错误" → 只匹配包含这些字符的文件
  ❌ 找不到 "npm install 失败" "403 forbidden"

Smart Fork 语义搜索：
  搜索 "npm 错误" → 找到相关会话
  ✅ 能理解 "npm install 失败" "403 forbidden" 是相关的
```

**技术实现：**
- 使用向量嵌入（384 维）
- 余弦相似度计算
- 支持中英文混合
- 本地关键词嵌入器（无需外部 API）

### 7. 🛠️ 与 Claude Code 无缝集成

**Slash 命令集成：**
```
/fork-detect     # 搜索会话
/fork-to <id>    # 切换会话
/fork-back       # 返回
/index-session   # 索引
/list-sessions   # 列表
/fork-status     # 状态
```

### 8. 📊 性能优势对比

| 功能 | 传统方案 | Smart Fork |
|------|----------|------------|
| 索引速度 | ~500ms（API 调用） | <10ms（本地） |
| 搜索速度 | ~500ms（API 调用） | <50ms（内存计算） |
| 存储空间 | 云存储（持续付费） | 本地 JSON（免费） |
| 隐私保护 | ⚠️ 数据上云 | ✅ 完全本地 |
| 离线使用 | ❌ 需要网络 | ✅ 完全离线 |

## 📦 安装

```bash
# 全局安装
npm install -g claude-code-smart-fork

# 或使用 npx（无需安装）
npx claude-code-smart-fork
```

## 🚀 快速开始

### 1. 索引当前会话

```bash
smart-fork index --summary "实现用户认证功能"
```

### 2. 查找相关会话

```bash
smart-fork detect
```

### 3. 切换到会话

```bash
smart-fork fork-to <session-id>
```

## 🛠️ 使用方法

### CLI 命令

| 命令 | 描述 |
|---------|-------------|
| `smart-fork index` | 索引当前会话以供将来搜索 |
| `smart-fork detect` | 查找相关的历史会话 |
| `smart-fork detect --all` | 跨所有项目搜索 |
| `smart-fork list` | 列出所有已索引的会话 |
| `smart-fork status` | 显示当前状态和建议 |
| `smart-fork export <id>` | 将会话导出为 JSON |

### Claude Code 集成

安装后，Claude Code 中可以使用以下 slash 命令：

```
/index-session    - 索引当前会话
/fork-detect      - 查找相关会话
/fork-to <id>     - 切换到指定会话
/list-sessions    - 列出所有会话
/fork-status      - 显示状态和建议
```

## ⚙️ 配置

创建 `~/.smart-fork/config.json`：

```json
{
  "embedding": {
    "provider": "local",
    "model": "all-MiniLM-L6-v2",
    "dimension": 384
  },
  "vectorStore": {
    "provider": "local",
    "collectionName": "smart-fork-sessions"
  },
  "storage": {
    "sessionsDir": "~/.smart-fork/sessions",
    "indexPath": "~/.smart-fork/index.json"
  }
}
```

### 嵌入提供者

#### 本地（默认）- 无需 API 密钥
```json
{
  "embedding": {
    "provider": "local",
    "model": "all-MiniLM-L6-v2"
  }
}
```

#### OpenAI
```json
{
  "embedding": {
    "provider": "openai",
    "model": "text-embedding-3-small"
  }
}
```
需要 `OPENAI_API_KEY` 环境变量。

#### Ollama
```json
{
  "embedding": {
    "provider": "ollama",
    "model": "nomic-embed-text"
  }
}
```
需要运行 Ollama 服务器。

## 💡 使用示例

### 示例 1：使用对话历史索引会话

```bash
# 创建对话历史文件
cat > conversation.json << 'EOF'
[
  {
    "id": "turn-1",
    "timestamp": 1709400000000,
    "userMessage": {
      "content": "如何实现用户认证？",
      "metadata": { "files": ["auth.js"] }
    },
    "assistantMessage": {
      "content": "建议使用 JWT + OAuth2。JWT 适合无状态认证，OAuth2 适合第三方登录。",
      "toolCalls": [{"id": "1", "type": "search", "parameters": {"query": "JWT 最佳实践"}}]
    }
  },
  {
    "id": "turn-2",
    "timestamp": 1709400100000,
    "userMessage": {
      "content": "给我代码示例"
    },
    "assistantMessage": {
      "content": "这是一个使用 Node.js 和 jsonwebtoken 的示例...",
      "toolCalls": [
        {"id": "2", "type": "read_file", "parameters": {"path": "examples/auth.js"}},
        {"id": "3", "type": "edit_file", "parameters": {"path": "src/auth.js"}}
      ]
    }
  }
]
EOF

# 索引会话
smart-fork index --conversation conversation.json --summary "使用 JWT 的用户认证" --tags "auth,jwt,nodejs"

# 输出：
# ✓ Session indexed successfully!
# Session ID: 096549e9-13bd-45bd-9f6c-659d55c78b35
# Conversation turns: 2
# Total messages: 4
```

### 示例 2：查找并恢复会话

```bash
# 搜索相关会话
smart-fork detect --query "认证 JWT 代码示例"

# 输出：
# ✓ Found 1 relevant session(s):
#
# 1. my-first-app
#    Path: D:\\claudecode\\MyAICodes\\my-first-app
#    Relevance: 85%
#    Summary: 使用 JWT 的用户认证
#    Last updated: 2026/3/2

# 切换到会话
smart-fork fork-to 096549e9-13bd-45bd-9f6c-659d55c78b35

# 输出：
# 💬 对话历史：
# ────────────────────────────────────────────────────────────
# [1] 👤 用户：
# 如何实现用户认证？
#     🤖 助手：
# 建议使用 JWT + OAuth2...
#     🔧 工具调用：search
# ────────────────────────────────────────────────────────────
# [2] 👤 用户：
# 给我代码示例
#     🤖 助手：
# 这是一个 Node.js 示例...
#     🔧 工具调用：read_file, edit_file
# ────────────────────────────────────────────────────────────
# ✨ Total turns: 2
# 💡 你可以从这里继续对话。
```

### 示例 3：跨项目搜索

```bash
# 在多个项目中索引会话
# 项目 A：API 网关
cd ~/projects/api-gateway
smart-fork index --summary "实现限流中间件"

# 项目 B：前端
cd ~/projects/frontend
smart-fork index --summary "设置 React 认证上下文"

# 跨所有项目搜索
cd ~/projects/api-gateway
smart-fork detect --all --query "认证中间件"

# 结果将显示来自两个项目的相关会话！
```

### 示例 4：使用 Claude Code Slash 命令

```bash
# 在 Claude Code 中使用 slash 命令：

# 索引当前会话
/index-session 实现用户认证 --tags auth,jwt

# 稍后，查找相关会话
/fork-detect

# 切换到指定会话
/fork-to 096549e9-13bd-45bd-9f6c-659d55c78b35

# 列出所有会话
/list-sessions
```

## 📁 数据存储

所有数据本地存储在 `~/.smart-fork/`：

```
~/.smart-fork/
├── sessions/          # 完整会话数据 (JSON)
├── index.json         # 会话索引和嵌入向量
└── config.json        # 用户配置
```

## 🔧 开发

```bash
# 克隆仓库
git clone https://github.com/fjibj/claude-code-smart-fork.git
cd claude-code-smart-fork

# 安装依赖
npm install

# 构建项目
npm run build

# 运行测试
npm test

# 开发模式
npm run dev
```

## 📚 API 使用

```typescript
import { ForkDetector, SessionManager } from 'claude-code-smart-fork';

const detector = new ForkDetector();
await detector.initialize();

// 查找相关会话
const results = await detector.findRelevantSessions({
  text: "如何实现认证？",
  limit: 5
});

// 切换到会话
const sessionManager = new SessionManager();
await sessionManager.forkToSession(results[0].session.id);
```

## 🤝 贡献

欢迎贡献！请参阅 [CONTRIBUTING.md](CONTRIBUTING.md) 获取指南。

## 📄 许可证

MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

- 灵感来自对更好的 Claude Code 会话管理的需求
- 感谢开源社区提供的强大工具

## 📮 支持

- 🐛 [报告 Bug](https://github.com/fjibj/claude-code-smart-fork/issues)
- 💡 [请求功能](https://github.com/fjibj/claude-code-smart-fork/issues)
- 📧 联系：fjibj@users.noreply.github.com
