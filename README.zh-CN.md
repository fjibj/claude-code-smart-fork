# Claude Code Smart Fork 中文文档

🔀 **Claude Code 智能会话分支** - 使用 AI 驱动的语义搜索，在所有项目中查找并恢复相关的历史会话。

## 功能特性

- 🔍 **语义搜索** - 基于含义而非关键词查找相关会话
- 🌐 **跨项目** - 在所有项目中搜索，不限于当前项目
- 🤖 **AI 驱动** - 使用嵌入向量理解上下文和意图
- ⚡ **快速** - 本地向量存储，即时返回结果
- 🔒 **隐私** - 默认所有数据保存在本地

## 快速开始

```bash
# 安装
npm install -g claude-code-smart-fork

# 索引当前会话
smart-fork index --summary "实现用户认证功能"

# 查找相关会话
smart-fork detect

# 跨所有项目搜索
smart-fork detect --all
```

## Claude Code 集成

安装后，在 Claude Code 中可以使用以下命令：

```
/index-session    - 索引当前会话
/fork-detect      - 查找相关会话
/fork-to <id>     - 切换到指定会话
/list-sessions    - 列出所有会话
/fork-status      - 显示状态和建议
```

## 更多文档

- [英文 README](./README.md)
- [贡献指南](./CONTRIBUTING.md)
- [更新日志](./CHANGELOG.md)
