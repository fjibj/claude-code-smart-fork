# 数据存储 (Data Storage)

## 存储位置

Smart Fork 将所有数据存储在本地，确保隐私和安全。

### 主要目录

```
Windows:
  C:\Users\<用户名>\.smart-fork\
  C:\Users\<用户名>\.claude\commands\

macOS/Linux:
  ~/.smart-fork/
  ~/.claude/commands/
```

### 目录结构详解

```
.smart-fork/
├── config.json              # 用户配置
├── index.json               # 会话索引（包含向量嵌入）
├── fork-context.json        # 临时 fork 上下文（使用时创建）
└── sessions/                # 完整会话数据目录
    ├── <session-id-1>.json
    ├── <session-id-2>.json
    └── ...

.claude/
└── commands/                # Claude Code Slash 命令定义
    ├── fork-detect.md
    ├── fork-to.md
    ├── fork-back.md
    ├── fork-status.md
    ├── index-session.md
    └── list-sessions.md
```

## 文件详解

### 1. config.json - 配置文件

**位置：** `~/.smart-fork/config.json`

**格式：**
```json
{
  "vectorStore": {
    "provider": "local",
    "dimension": 384,
    "collectionName": "smart-fork-sessions"
  },
  "embedding": {
    "provider": "local",
    "model": "all-MiniLM-L6-v2",
    "dimension": 384
  },
  "storage": {
    "sessionsDir": "C:\\Users\\Administrator\\.smart-fork\\sessions",
    "indexPath": "C:\\Users\\Administrator\\.smart-fork\\index.json"
  }
}
```

**字段说明：**

| 字段 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `vectorStore.provider` | string | 向量存储提供者 (`local`/`chroma`/`pinecone`) | `local` |
| `vectorStore.dimension` | number | 向量维度 | 384 |
| `embedding.provider` | string | 嵌入服务提供者 | `local` |
| `embedding.model` | string | 使用的模型名称 | `all-MiniLM-L6-v2` |
| `storage.sessionsDir` | string | 会话数据目录 | `~/.smart-fork/sessions` |
| `storage.indexPath` | string | 索引文件路径 | `~/.smart-fork/index.json` |

---

### 2. index.json - 主索引文件

**位置：** `~/.smart-fork/index.json`

**格式：**
```json
{
  "sessions": {
    "6dd285b5-6bc1-42db-88e2-3537285590c4": {
      "id": "6dd285b5-6bc1-42db-88e2-3537285590c4",
      "projectPath": "D:\\claudecode\\MyAICodes\\my-first-app",
      "projectName": "my-first-app",
      "createdAt": 1772467200000,
      "updatedAt": 1772467200000,
      "messageCount": 121,
      "summary": "npm install 403 forbidden 错误修复",
      "tags": ["npm", "install", "403", "bugfix"],
      "keyTopics": ["npm", "install", "403", "forbidden", "错误"],
      "embedding": [0.023, -0.045, 0.012, ..., 0.001]
    }
  }
}
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 会话唯一标识符（UUID v4） |
| `projectPath` | string | 项目完整路径 |
| `projectName` | string | 项目名称（路径的最后一部分） |
| `createdAt` | number | 创建时间戳（毫秒） |
| `updatedAt` | number | 最后更新时间戳（毫秒） |
| `messageCount` | number | 消息数量 |
| `summary` | string | 会话摘要 |
| `tags` | string[] | 用户定义的标签 |
| `keyTopics` | string[] | 自动提取的关键词 |
| `embedding` | number[] | 384 维向量嵌入 |

**如何读取：**

```bash
# 查看完整的索引文件
cat ~/.smart-fork/index.json

# 使用 smart-fork 命令查看
smart-fork list --json

# 使用 Node.js 读取
node -e "console.log(require('~/.smart-fork/index.json'))"
```

---

### 3. sessions/<session-id>.json - 会话数据

**位置：** `~/.smart-fork/sessions/<session-id>.json`

**格式：**
```json
{
  "id": "6dd285b5-6bc1-42db-88e2-3537285590c4",
  "projectPath": "D:\\claudecode\\MyAICodes\\my-first-app",
  "projectName": "my-first-app",
  "createdAt": 1772467200000,
  "updatedAt": 1772467200000,
  "messages": [
    {
      "role": "user",
      "content": "npm install 报 403 错误"
    },
    {
      "role": "assistant",
      "content": "让我帮你看看这个问题..."
    }
  ],
  "summary": "npm install 403 forbidden 错误修复",
  "tags": ["npm", "install", "403"],
  "conversationHistory": [
    {
      "id": "msg-uuid",
      "timestamp": 1772467200000,
      "userMessage": {
        "content": "npm install 报 403 错误",
        "metadata": {}
      },
      "assistantMessage": {
        "content": "让我帮你看看这个问题...",
        "toolCalls": [],
        "metadata": {}
      }
    }
  ],
  "embedding": [0.023, -0.045, 0.012, ...]
}
```

**conversationHistory 格式：**

每个对话轮次（turn）包含：
- `id`: 对话轮次 ID
- `timestamp`: 时间戳
- `userMessage`: 用户消息
  - `content`: 消息内容
  - `metadata`: 附加元数据
- `assistantMessage`: 助手响应（可选）
  - `content`: 响应内容
  - `toolCalls`: 工具调用列表
  - `metadata`: 附加元数据

**如何读取：**

```bash
# 查看特定会话
cat ~/.smart-fork/sessions/<session-id>.json

# 使用导出命令
smart-fork export <session-id> -o exported-session.json

# 使用 Node.js 读取
node -e "
const fs = require('fs');
const session = JSON.parse(fs.readFileSync('~/.smart-fork/sessions/<session-id>.json'));
console.log('Summary:', session.summary);
console.log('Messages:', session.messages.length);
"
```

---

### 4. fork-context.json - 临时上下文

**位置：** `~/.smart-fork/fork-context.json`

**说明：** 当使用 `/fork-to` 切换会话时自动创建，用于 `/fork-back` 返回原始会话。

**格式：**
```json
{
  "sourceSessionId": "current-session-uuid",
  "targetSessionId": "target-session-uuid",
  "preservedContext": {
    "files": ["src/index.ts", "README.md"],
    "environment": {
      "NODE_ENV": "development",
      "...": "..."
    },
    "gitBranch": "main"
  }
}
```

**生命周期：**
- 创建：使用 `/fork-to <session-id>` 时
- 删除：使用 `/fork-back` 后自动删除

---

### 5. Claude Code Slash 命令定义

**位置：** `~/.claude/commands/fork-*.md`

这些文件定义了 Claude Code 中可以使用的 `/` 命令。

**示例：fork-detect.md**
```markdown
# /fork-detect

Find relevant historical sessions across all projects using AI-powered semantic search.

```bash
npx smart-fork detect "$@"
```
```

**命令列表：**

| 文件 | 命令 | 说明 |
|------|------|------|
| `fork-detect.md` | `/fork-detect` | 搜索相关会话 |
| `fork-to.md` | `/fork-to <id>` | 切换到指定会话 |
| `fork-back.md` | `/fork-back` | 返回原始会话 |
| `fork-status.md` | `/fork-status` | 显示状态 |
| `index-session.md` | `/index-session` | 索引当前会话 |
| `list-sessions.md` | `/list-sessions` | 列出所有会话 |

## 数据操作流程

### 写入流程（索引会话）

```
1. 用户执行：/index-session -s "会话摘要" -t "标签 1，标签 2"
                    │
                    ▼
2. 读取 Claude Code 对话历史
   ~/.claude/projects/<project>/<session>.jsonl
                    │
                    ▼
3. 生成向量嵌入（384 维）
                    │
                    ▼
4. 保存会话数据
   ~/.smart-fork/sessions/<session-id>.json
                    │
                    ▼
5. 更新索引
   ~/.smart-fork/index.json (添加 embedding)
                    │
                    ▼
6. 完成
```

### 读取流程（搜索会话）

```
1. 用户执行：/fork-detect -q "搜索关键词"
                    │
                    ▼
2. 加载索引到内存
   ~/.smart-fork/index.json
                    │
                    ▼
3. 生成查询向量
   EmbeddingService.embed(query)
                    │
                    ▼
4. 计算余弦相似度
   对于每个会话：score = cosine(query_vector, session.embedding)
                    │
                    ▼
5. 过滤和排序
   保留 score > threshold 的会话，按 score 降序排列
                    │
                    ▼
6. 显示结果
```

## 数据管理命令

### 查看索引状态

```bash
# 列出所有会话
smart-fork list

# 以 JSON 格式输出
smart-fork list --json

# 按项目过滤
smart-fork list -p /path/to/project
```

### 导出会话

```bash
# 导出到当前目录
smart-fork export <session-id>

# 导出到指定路径
smart-fork export <session-id> -o /path/to/output.json
```

### 手动管理

```bash
# 查看索引文件大小
ls -lh ~/.smart-fork/index.json

# 查看会话数量
node -e "console.log(Object.keys(require('~/.smart-fork/index.json').sessions).length)"

# 清理过期会话（手动编辑 index.json）
# 删除 sessions 目录中对应的文件
```

## 数据存储最佳实践

### 1. 定期备份

```bash
# 备份整个 smart-fork 目录
cp -r ~/.smart-fork ~/backups/smart-fork-$(date +%Y%m%d)
```

### 2. 清理旧会话

定期清理不需要的会话以节省空间：

```bash
# 查看占用空间
du -sh ~/.smart-fork/sessions/

# 手动删除旧会话
# 1. 从 index.json 中删除条目
# 2. 删除 sessions/ 中对应的文件
```

### 3. 迁移数据

在电脑之间迁移：

```bash
# 导出所有会话
smart-fork list --json > sessions-index.json

# 打包
tar -czf smart-fork-backup.tar.gz ~/.smart-fork/sessions/ sessions-index.json

# 在新电脑上解压
tar -xzf smart-fork-backup.tar.gz -C ~
```

## 安全与隐私

- ✅ 所有数据存储在本地
- ✅ 不上传到任何云端服务（使用 local 提供者时）
- ✅ 不依赖外部 API（可选使用 OpenAI/Ollama）
- ⚠️ 注意：会话内容可能包含敏感信息，请妥善保管备份

## 故障排除

### 索引文件损坏

如果 `index.json` 损坏：

```bash
# 删除损坏的索引（会话数据仍然安全）
rm ~/.smart-fork/index.json

# 重新索引所有会话
# （需要重新运行 /index-session 命令）
```

### 会话丢失

如果会话数据丢失但索引还在：

```bash
# 列出索引中的会话
smart-fork list --json

# 找出不存在的会话文件
node -e "
const fs = require('fs');
const index = require('~/.smart-fork/index.json');
for (const id of Object.keys(index.sessions)) {
  const path = '~/.smart-fork/sessions/' + id + '.json';
  try { fs.accessSync(path); } catch { console.log('Missing:', id); }
}
"
```

### 重置所有数据

```bash
# 警告：这将删除所有索引数据
rm -rf ~/.smart-fork

# 重新安装
npm install -g claude-code-smart-fork

# 重新索引需要的会话
```
