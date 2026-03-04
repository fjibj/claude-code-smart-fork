# 技术架构 (Technical Architecture)

## 系统概述

Smart Fork 采用模块化设计，主要由以下几个核心组件构成：

```
┌─────────────────────────────────────────────────────────────┐
│                    Claude Code CLI                          │
│                  (Slash Commands)                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      CLI Layer                              │
│                  (src/cli/index.ts)                         │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐ │
│  │ fork-detect │  fork-to    │  fork-back  │   status    │ │
│  │  index      │   list      │   export    │   config    │ │
│  └─────────────┴─────────────┴─────────────┴─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Core Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │SessionManager│  │ForkDetector  │  │VectorStore   │      │
│  │              │  │              │  │              │      │
│  │ - 索引会话    │  │ - 检测分支    │  │ - 向量存储    │      │
│  │ - 加载会话    │  │ - 提取上下文  │  │ - 相似搜索    │      │
│  │ - 导出会话    │  │ - 语义分析    │  │ - 索引管理    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Service Layer                              │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │ EmbeddingService │         │  ConfigManager   │         │
│  │                  │         │                  │         │
│  │ - 文本向量化      │         │ - 加载配置       │         │
│  │ - 批量处理        │         │ - 保存配置       │         │
│  │ - 多语言支持      │         │ - 路径管理       │         │
│  └──────────────────┘         └──────────────────┘         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Storage Layer                             │
│                                                             │
│   ~/.smart-fork/                                            │
│   ├── config.json          # 配置文件                        │
│   ├── index.json           # 会话索引（向量存储）              │
│   └── sessions/            # 会话数据目录                    │
│       └── <session-id>.json                                 │
│                                                             │
│   ~/.claude/commands/                                       │
│   ├── fork-detect.md       # Slash 命令定义                  │
│   ├── fork-to.md                                            │
│   ├── fork-back.md                                          │
│   └── ...                                                   │
└─────────────────────────────────────────────────────────────┘
```

## 核心组件

### 1. CLI Layer (`src/cli/index.ts`)

负责处理命令行接口，解析用户输入并调用相应的功能模块。

**主要命令：**
- `detect` / `fork-detect` - 检测并推荐相关会话
- `fork-to <id>` - 切换到指定会话
- `fork-back` - 返回上一个会话
- `index` - 索引当前会话
- `list` - 列出所有会话
- `status` - 显示当前状态

### 2. Session Manager (`src/core/session-manager.ts`)

管理会话的生命周期，包括索引、加载、导出等操作。

**核心方法：**
```typescript
indexCurrentSession(options)     // 索引当前会话
loadSession(sessionId)           // 加载指定会话
forkToSession(sessionId)         // 切换到历史会话
forkBack()                       // 返回原始会话
exportSession(sessionId, path)   // 导出会话到文件
```

### 3. Fork Detector (`src/core/fork-detector.ts`)

检测当前工作上下文，分析是否需要切换到其他会话。

**功能：**
- 提取当前项目上下文
- 解析 Git 分支信息
- 分析用户查询意图
- 计算会话相关性

### 4. Vector Store (`src/core/vector-store.ts`)

向量化存储和检索系统，支持快速的相似度搜索。

**存储结构：**
```json
{
  "sessions": {
    "<session-id>": {
      "id": "uuid",
      "projectPath": "/path/to/project",
      "embedding": [0.1, 0.2, ...],  // 384 维向量
      "summary": "会话摘要",
      "keyTopics": ["topic1", "topic2"],
      "messageCount": 100
    }
  }
}
```

### 5. Embedding Service (`src/core/embedding.ts`)

文本向量化服务，将文本转换为数值向量用于相似度计算。

**支持的提供者：**
- `local` - 本地关键词嵌入（支持中英文）
- `openai` - OpenAI API（text-embedding-3-small）
- `ollama` - 本地 Ollama 服务（nomic-embed-text）

### 6. Config Manager (`src/core/config.ts`)

配置管理模块，处理所有配置项的加载和保存。

**默认配置：**
```typescript
{
  vectorStore: {
    provider: 'local',
    dimension: 384
  },
  embedding: {
    provider: 'local',
    dimension: 384
  },
  storage: {
    sessionsDir: '~/.smart-fork/sessions',
    indexPath: '~/.smart-fork/index.json'
  }
}
```

## 数据流

```
用户输入
    │
    ▼
Claude Code Slash Command
    │
    ▼
smart-fork CLI 解析
    │
    ▼
┌───────────────────┐
│  命令类型判断      │
└───────────────────┘
    │
    ├──────┬───────────────┬────────────┐
    ▼      ▼               ▼            ▼
 detect  fork-to        index       list
    │      │               │            │
    ▼      ▼               ▼            ▼
搜索会话  加载会话        提取对话     读取索引
    │      │               │            │
    ▼      ▼               ▼            ▼
显示结果  切换上下文      生成向量     显示列表
           │              │
           ▼              ▼
        保存上下文     存储到文件
```

## 文件结构

```
src/
├── cli/
│   └── index.ts           # CLI 入口和命令定义
├── core/
│   ├── config.ts          # 配置管理
│   ├── embedding.ts       # 文本向量化
│   ├── fork-detector.ts   # 分支检测器
│   ├── session-manager.ts # 会话管理
│   └── vector-store.ts    # 向量存储
├── integrations/
│   └── claude-code.ts     # Claude Code 集成
├── types/
│   └── index.ts           # TypeScript 类型定义
└── index.ts               # 主入口
```

## 依赖关系

```json
{
  "dependencies": {
    "chalk": "^4.1.2",      // 终端彩色输出
    "commander": "^12.1.0", // CLI 框架
    "uuid": "^9.0.1"        // UUID 生成
  },
  "devDependencies": {
    "typescript": "^5.7.2",
    "jest": "^29.7.0",
    "eslint": "^8.57.0"
  }
}
```

## 扩展性设计

Smart Fork 设计为易于扩展的架构：

1. **插件化向量存储** - 可以轻松添加新的向量数据库支持（如 Pinecone、Chroma）
2. **可替换嵌入服务** - 支持多种嵌入提供者
3. **灵活的存储后端** - 当前使用 JSON 文件，可扩展到数据库
4. **自定义命令** - 可通过添加新的 CLI 命令扩展功能
