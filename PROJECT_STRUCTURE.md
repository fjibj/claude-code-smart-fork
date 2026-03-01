# Project Structure

This document outlines the structure of the Claude Code Smart Fork project.

## Directory Structure

```
claude-code-smart-fork/
├── .github/                    # GitHub configuration
│   ├── ISSUE_TEMPLATE/         # Issue templates
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   ├── workflows/              # GitHub Actions
│   │   └── ci.yml
│   └── pull_request_template.md
├── scripts/                    # Build and install scripts
│   └── install.js              # Post-install hook
├── src/                        # Source code
│   ├── cli/                    # CLI implementation
│   │   └── index.ts
│   ├── core/                   # Core functionality
│   │   ├── config.ts           # Configuration management
│   │   ├── embedding.ts        # Embedding service
│   │   ├── fork-detector.ts    # Session matching engine
│   │   ├── session-manager.ts  # Session operations
│   │   └── vector-store.ts     # Vector storage
│   ├── integrations/           # External integrations
│   │   └── claude-code.ts      # Claude Code slash commands
│   ├── types/                  # TypeScript types
│   │   └── index.ts
│   └── index.ts                # Entry point
├── dist/                       # Compiled JavaScript (generated)
├── .eslintrc.js               # ESLint configuration
├── .gitignore                 # Git ignore rules
├── .npmignore                 # NPM ignore rules
├── .prettierrc                # Prettier configuration
├── CHANGELOG.md               # Version history
├── CODE_OF_CONDUCT.md         # Community guidelines
├── CONTRIBUTING.md            # Contribution guide
├── jest.config.js             # Jest test configuration
├── LICENSE                    # MIT License
├── package.json               # Package manifest
├── README.md                  # English documentation
├── README.zh-CN.md            # Chinese documentation
├── SECURITY.md                # Security policy
└── tsconfig.json              # TypeScript configuration
```

## Key Components

### Core Modules

1. **Session Manager** (`src/core/session-manager.ts`)
   - Handles session indexing, storage, and retrieval
   - Manages session forking operations

2. **Fork Detector** (`src/core/fork-detector.ts`)
   - Semantic search engine
   - Context extraction
   - Session matching algorithm

3. **Vector Store** (`src/core/vector-store.ts`)
   - Abstracts vector storage backends
   - Supports local JSON, ChromaDB, Pinecone

4. **Embedding Service** (`src/core/embedding.ts`)
   - Generates vector embeddings
   - Supports OpenAI, Ollama, and local embeddings

5. **Configuration** (`src/core/config.ts`)
   - Manages user settings
   - Handles config file I/O

### CLI Layer

- **Commands** (`src/cli/index.ts`)
  - `detect` / `fork-detect`: Find relevant sessions
  - `fork-to`: Switch to a specific session
  - `index`: Index current session
  - `list`: List all sessions
  - `status`: Show status and suggestions
  - `config`: Manage configuration

### Integrations

- **Claude Code** (`src/integrations/claude-code.ts`)
  - Slash command handlers
  - Claude Code specific formatting

## Data Flow

1. **Indexing**: User runs `smart-fork index`
   - Extracts messages and context
   - Generates embeddings
   - Stores in vector store

2. **Searching**: User runs `smart-fork detect`
   - Extracts current context
   - Generates query embedding
   - Searches vector store
   - Returns ranked results

3. **Forking**: User runs `smart-fork fork-to <id>`
   - Loads session data
   - Changes to project directory
   - Displays session summary

## Configuration Files

- **User Config**: `~/.smart-fork/config.json`
- **Session Index**: `~/.smart-fork/index.json`
- **Session Data**: `~/.smart-fork/sessions/<id>.json`

## Testing

Tests are located in `src/**/__tests__/` directories.

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Generate coverage report
```

## Building

```bash
npm run build         # Compile TypeScript
npm run dev           # Watch mode
npm run clean         # Remove dist/
```

## Publishing

```bash
npm version patch     # Bump version
npm run build         # Build
npm test              # Run tests
npm publish           # Publish to npm
```
