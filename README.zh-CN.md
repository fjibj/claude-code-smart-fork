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
