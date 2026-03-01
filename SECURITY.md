# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability within this project, please send an email to security@yourproject.com. All security vulnerabilities will be promptly addressed.

Please include the following information in your report:
- Type of vulnerability
- Full paths of source file(s) related to the vulnerability
- Location of affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

## Security Best Practices

This tool handles local data only. No data is sent to external servers unless:
- You explicitly configure OpenAI or Ollama embeddings
- You explicitly configure ChromaDB or Pinecone vector stores

All session data is stored locally in `~/.smart-fork/` by default.
