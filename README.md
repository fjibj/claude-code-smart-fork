# Claude Code Smart Fork

🔀 **Smart session forking for Claude Code** - Find and resume relevant historical sessions across all your projects using AI-powered semantic search.

[![npm version](https://badge.fury.io/js/claude-code-smart-fork.svg)](https://www.npmjs.com/package/claude-code-smart-fork)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js CI](https://github.com/yourusername/claude-code-smart-fork/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/claude-code-smart-fork/actions)

## 🌟 Features

- 🔍 **Semantic Search** - Find relevant sessions based on meaning, not just keywords
- 🌐 **Cross-Project** - Search across all your projects, not just the current one
- 🤖 **AI-Powered** - Uses embeddings to understand context and intent
- ⚡ **Fast** - Local vector storage for instant results
- 🔒 **Private** - All data stays on your machine by default
- 🎯 **Easy Integration** - Works seamlessly with Claude Code as slash commands

## 📦 Installation

```bash
# Install globally
npm install -g claude-code-smart-fork

# Or use npx (no installation needed)
npx claude-code-smart-fork
```

## 🚀 Quick Start

### 1. Index Your Current Session

```bash
smart-fork index --summary "Implementing user authentication"
```

### 2. Later, Find Relevant Sessions

```bash
smart-fork detect
```

### 3. Switch to a Session

```bash
smart-fork fork-to <session-id>
```

## 🛠️ Usage

### CLI Commands

| Command | Description |
|---------|-------------|
| `smart-fork index` | Index current session for future searching |
| `smart-fork detect` | Find relevant historical sessions |
| `smart-fork detect --all` | Search across all projects |
| `smart-fork list` | List all indexed sessions |
| `smart-fork status` | Show current status and suggestions |
| `smart-fork export <id>` | Export a session to JSON |

### Claude Code Integration

After installation, these slash commands are available in Claude Code:

```
/index-session    - Index current session
/fork-detect      - Find relevant sessions
/fork-to <id>     - Switch to a session
/list-sessions    - List all sessions
/fork-status      - Show status and suggestions
```

## ⚙️ Configuration

Create `~/.smart-fork/config.json`:

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

### Embedding Providers

#### Local (Default) - No API key needed
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
Requires `OPENAI_API_KEY` environment variable.

#### Ollama
```json
{
  "embedding": {
    "provider": "ollama",
    "model": "nomic-embed-text"
  }
}
```
Requires a running Ollama server.

## 📁 Data Storage

All data is stored locally in `~/.smart-fork/`:

```
~/.smart-fork/
├── sessions/          # Full session data (JSON)
├── index.json         # Session index with embeddings
└── config.json        # User configuration
```

## 🔧 Development

```bash
# Clone the repository
git clone https://github.com/yourusername/claude-code-smart-fork.git
cd claude-code-smart-fork

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Watch mode for development
npm run dev
```

## 📚 API Usage

```typescript
import { ForkDetector, SessionManager } from 'claude-code-smart-fork';

const detector = new ForkDetector();
await detector.initialize();

// Find relevant sessions
const results = await detector.findRelevantSessions({
  text: "How to implement authentication?",
  limit: 5
});

// Switch to a session
const sessionManager = new SessionManager();
await sessionManager.forkToSession(results[0].session.id);
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the need for better session management in Claude Code
- Thanks to the open-source community for the amazing tools

## 📮 Support

- 🐛 [Report a bug](https://github.com/yourusername/claude-code-smart-fork/issues)
- 💡 [Request a feature](https://github.com/yourusername/claude-code-smart-fork/issues)
- 📧 Contact: your-email@example.com
