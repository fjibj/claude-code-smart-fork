/**
 * Session Manager - Handles session indexing, storage, and forking
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { Session, SessionIndex, SessionMessage, ConversationTurn } from '../types';
import { configManager } from './config';
import { EmbeddingService } from './embedding';
import { VectorStore } from './vector-store';
import { execSync } from 'child_process';

export class SessionManager {
  private embeddingService: EmbeddingService;
  private vectorStore: VectorStore;
  private initialized = false;

  constructor() {
    this.embeddingService = new EmbeddingService();
    this.vectorStore = new VectorStore();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const config = configManager.get();
    await this.embeddingService.initialize(config.embedding);
    await this.vectorStore.initialize(config.vectorStore);

    // Ensure sessions directory exists
    await fs.mkdir(config.storage.sessionsDir, { recursive: true });

    this.initialized = true;
  }

  /**
   * Index the current Claude Code session with full conversation history
   */
  async indexCurrentSession(options: {
    summary?: string;
    tags?: string[];
    /**
     * Complete conversation history including both user messages and assistant responses
     */
    conversationHistory?: ConversationTurn[];
  } = {}): Promise<Session> {
    await this.initialize();

    const sessionId = uuidv4();
    const projectPath = process.cwd();
    const projectName = path.basename(projectPath);

    // Use provided conversation history or extract from Claude Code context
    const conversationHistory = options.conversationHistory || await this.extractConversationHistory();

    // Convert conversation history to legacy message format for compatibility
    const messages = this.conversationToMessages(conversationHistory);

    // Generate summary if not provided
    const summary = options.summary || await this.generateSummaryFromConversation(conversationHistory);

    // Extract key topics
    const keyTopics = this.extractKeyTopicsFromConversation(conversationHistory);

    // Create session object
    const session: Session = {
      id: sessionId,
      projectPath,
      projectName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages,
      summary,
      tags: options.tags || [],
      conversationHistory
    };

    // Generate embedding for the session (include both user and assistant content)
    const sessionText = this.conversationToText(conversationHistory);
    session.embedding = await this.embeddingService.embed(sessionText);

    // Save full session
    await this.saveSession(session);

    // Index for searching
    const sessionIndex: SessionIndex = {
      id: sessionId,
      projectPath,
      projectName,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      messageCount: messages.length,
      summary,
      tags: options.tags || [],
      keyTopics,
      embedding: session.embedding
    };

    await this.vectorStore.upsert(sessionIndex);

    return session;
  }

  /**
   * Fork to a historical session
   */
  async forkToSession(sessionId: string): Promise<void> {
    await this.initialize();

    const session = await this.loadSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // 1. Change to the project directory
    if (session.projectPath !== process.cwd()) {
      console.log(`Changing directory to: ${session.projectPath}`);
      process.chdir(session.projectPath);
    }

    // 2. Restore git branch if possible
    try {
      const currentBranch = execSync('git branch --show-current', {
        encoding: 'utf-8',
        cwd: session.projectPath
      }) as string;

      // Store current context before switching
      const forkContext = {
        sourceSessionId: this.getCurrentSessionId(),
        targetSessionId: sessionId,
        preservedContext: {
          files: await this.getOpenFiles(),
          environment: { ...process.env },
          gitBranch: currentBranch.trim()
        }
      };

      // Save fork context
      await this.saveForkContext(forkContext);

    } catch {
      // Not a git repository or git not available
    }

    // 3. Open relevant files from the session
    const filesToOpen = this.extractFilesFromSession(session);
    for (const file of filesToOpen.slice(0, 5)) {
      const filePath = path.join(session.projectPath, file);
      try {
        await fs.access(filePath);
        console.log(`📄 ${file}`);
      } catch {
        // File doesn't exist
      }
    }

    // 4. Display session summary and conversation history
    console.log('\n📋 Session Summary:');
    console.log(session.summary);

    // Display full conversation history
    console.log('\n💬 Conversation History:');
    console.log('─'.repeat(60));

    const history = session.conversationHistory || this.messagesToConversation(session.messages);

    history.forEach((turn, index) => {
      console.log(`\n[${index + 1}] 👤 User:`);
      console.log(turn.userMessage.content);

      if (turn.assistantMessage) {
        console.log(`\n    🤖 Assistant:`);
        // Truncate long assistant responses for display
        const content = turn.assistantMessage.content;
        const displayContent = content.length > 500
          ? content.substring(0, 500) + '\n... (truncated)'
          : content;
        console.log(displayContent);
      }

      // Show tool calls if any
      if (turn.assistantMessage?.toolCalls && turn.assistantMessage.toolCalls.length > 0) {
        console.log(`    🔧 Tool calls: ${turn.assistantMessage.toolCalls.map(t => t.type).join(', ')}`);
      }

      console.log('─'.repeat(60));
    });

    console.log(`\n✨ Total turns: ${history.length}`);
    console.log('💡 You can continue the conversation from here.\n');

    // 5. Set environment variable to indicate forked session
    process.env.SMART_FORK_SESSION_ID = sessionId;
    process.env.SMART_FORK_ORIGINAL_CWD = process.cwd();
  }

  /**
   * List all indexed sessions
   */
  async listSessions(projectPath?: string): Promise<SessionIndex[]> {
    await this.initialize();

    const allSessions = await this.vectorStore.getAll();

    if (projectPath) {
      return allSessions.filter(s => s.projectPath === projectPath);
    }

    return allSessions;
  }

  /**
   * Export session to a file
   */
  async exportSession(sessionId: string, outputPath?: string): Promise<string> {
    const session = await this.loadSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const targetPath = outputPath || path.join(
      process.cwd(),
      `session-${sessionId.slice(0, 8)}.json`
    );

    await fs.writeFile(targetPath, JSON.stringify(session, null, 2));
    return targetPath;
  }

  /**
   * Import session from a file
   */
  async importSession(filePath: string): Promise<Session> {
    const content = await fs.readFile(filePath, 'utf-8');
    const session: Session = JSON.parse(content);

    // Re-index the session
    const summary = session.summary || `Session in ${session.projectName}`;
    await this.vectorStore.upsert({
      id: session.id,
      projectPath: session.projectPath,
      projectName: session.projectName,
      createdAt: session.createdAt,
      updatedAt: Date.now(),
      messageCount: session.messages.length,
      summary: summary,
      tags: session.tags,
      keyTopics: this.extractKeyTopics(session.messages),
      embedding: session.embedding || await this.embeddingService.embed(this.sessionToText(session))
    });

    await this.saveSession(session);

    return session;
  }

  // Private helper methods for conversation history

  /**
   * Extract conversation history from various sources
   */
  private async extractConversationHistory(): Promise<ConversationTurn[]> {
    const turns: ConversationTurn[] = [];
    const projectsDir = path.join(
      process.env.HOME || process.env.USERPROFILE || '',
      '.claude',
      'projects',
      this.sanitizePath(process.cwd())
    );

    // Try to find the most recent .jsonl file in the projects directory
    try {
      const files = await fs.readdir(projectsDir);
      const jsonlFiles = files
        .filter(f => f.endsWith('.jsonl'))
        .map(f => ({
          name: f,
          path: path.join(projectsDir, f),
        }));

      // Sort by modification time (most recent first)
      const filesWithMtime = await Promise.all(
        jsonlFiles.map(async (file) => {
          const stats = await fs.stat(file.path);
          return { ...file, mtime: stats.mtime };
        })
      );
      filesWithMtime.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      if (filesWithMtime.length > 0) {
        // Read the most recent .jsonl file
        const content = await fs.readFile(filesWithMtime[0].path, 'utf-8');
        const lines = content.trim().split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const entry = JSON.parse(line);

            // Skip non-message entries (file-history-snapshot, etc.)
            if (entry.type === 'file-history-snapshot') continue;

            // Extract user message (type: "user" or message.role: "user")
            if (entry.type === 'user' || entry.message?.role === 'user') {
              // Get content from various possible locations
              let userContent = '';
              if (typeof entry.message?.content === 'string') {
                userContent = entry.message.content;
              } else if (Array.isArray(entry.message?.content)) {
                userContent = entry.message.content
                  .filter((c: any) => c.type === 'text')
                  .map((c: any) => c.text)
                  .join(' ');
              } else if (typeof entry.content === 'string') {
                userContent = entry.content;
              }

              // Clean up common placeholders
              if (userContent &&
                  !userContent.startsWith('<local-command') &&
                  !userContent.startsWith('<command-') &&
                  userContent.trim() !== '') {
                turns.push({
                  id: entry.uuid || uuidv4(),
                  timestamp: new Date(entry.timestamp || Date.now()).getTime(),
                  userMessage: {
                    content: userContent,
                    metadata: entry.message?.metadata
                  }
                });
              }
            }

            // Extract assistant message and pair with last user message
            if (entry.type === 'assistant' || entry.message?.role === 'assistant') {
              const assistantContent = entry.message?.content
                ?.filter((c: any) => c.type === 'text')
                .map((c: any) => c.text)
                .join('\n') || '';

              const toolCalls = entry.message?.toolCalls || entry.assistantMessage?.toolCalls;

              // Pair with the last user message that doesn't have an assistant response
              if (turns.length > 0 && !turns[turns.length - 1].assistantMessage && assistantContent) {
                turns[turns.length - 1].assistantMessage = {
                  content: assistantContent,
                  toolCalls,
                  metadata: entry.message?.metadata
                };
              }
            }
          } catch {
            // Skip invalid JSON lines
          }
        }
      }
    } catch {
      // Directory not found or other error
    }

    // If no conversation found, fallback to legacy message format
    if (turns.length === 0) {
      const messages = await this.extractMessages();
      return this.messagesToConversation(messages);
    }

    return turns;
  }

  /**
   * Convert conversation turns to legacy message format
   */
  private conversationToMessages(turns: ConversationTurn[]): SessionMessage[] {
    const messages: SessionMessage[] = [];

    for (const turn of turns) {
      // Add user message
      messages.push({
        id: `${turn.id}-user`,
        role: 'user',
        content: turn.userMessage.content,
        timestamp: turn.timestamp,
        metadata: turn.userMessage.metadata as any
      });

      // Add assistant message if exists
      if (turn.assistantMessage) {
        messages.push({
          id: `${turn.id}-assistant`,
          role: 'assistant',
          content: turn.assistantMessage.content,
          timestamp: turn.timestamp + 1,
          metadata: turn.assistantMessage.metadata as any
        });
      }
    }

    return messages;
  }

  /**
   * Convert legacy messages to conversation turns
   */
  private messagesToConversation(messages: SessionMessage[]): ConversationTurn[] {
    const turns: ConversationTurn[] = [];
    let currentTurn: Partial<ConversationTurn> = {};

    for (const message of messages) {
      if (message.role === 'user') {
        // Save previous turn if exists
        if (currentTurn.id) {
          turns.push(currentTurn as ConversationTurn);
        }
        // Start new turn
        currentTurn = {
          id: message.id.replace('-user', ''),
          timestamp: message.timestamp,
          userMessage: {
            content: message.content,
            metadata: message.metadata as any
          }
        };
      } else if (message.role === 'assistant' && currentTurn.id) {
        currentTurn.assistantMessage = {
          content: message.content,
          metadata: message.metadata as any
        };
      }
    }

    // Don't forget the last turn
    if (currentTurn.id) {
      turns.push(currentTurn as ConversationTurn);
    }

    return turns;
  }

  /**
   * Convert conversation to text for embedding
   */
  private conversationToText(turns: ConversationTurn[]): string {
    const parts: string[] = [];

    for (const turn of turns) {
      parts.push(`User: ${turn.userMessage.content}`);
      if (turn.assistantMessage) {
        parts.push(`Assistant: ${turn.assistantMessage.content}`);
      }
    }

    return parts.join('\n\n');
  }

  /**
   * Generate summary from conversation
   */
  private async generateSummaryFromConversation(turns: ConversationTurn[]): Promise<string> {
    if (turns.length === 0) {
      return `Session in ${path.basename(process.cwd())}`;
    }

    // Use the first user message as summary basis
    const firstUserMessage = turns[0].userMessage.content;
    const summary = firstUserMessage.length > 200
      ? firstUserMessage.substring(0, 200) + '...'
      : firstUserMessage;

    return summary;
  }

  /**
   * Extract key topics from conversation
   */
  private extractKeyTopicsFromConversation(turns: ConversationTurn[]): string[] {
    const allText = turns
      .map(t => `${t.userMessage.content} ${t.assistantMessage?.content || ''}`)
      .join(' ');

    // Simple keyword extraction
    const words = allText.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3);

    const frequency: Record<string, number> = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Sanitize path for use in file names
   */
  private sanitizePath(filePath: string): string {
    return filePath.replace(/[:\/\\]/g, '_');
  }

  // Legacy helper methods

  private async extractMessages(): Promise<SessionMessage[]> {
    const messages: SessionMessage[] = [];

    // Try to read from Claude Code's message log
    const claudeLogPath = path.join(
      process.env.HOME || process.env.USERPROFILE || '',
      '.claude',
      'messages.json'
    );

    try {
      const content = await fs.readFile(claudeLogPath, 'utf-8');
      const logData = JSON.parse(content);

      if (Array.isArray(logData.messages)) {
        messages.push(...logData.messages.map((m: any) => ({
          id: m.id || uuidv4(),
          role: m.role,
          content: m.content,
          timestamp: m.timestamp || Date.now(),
          metadata: m.metadata
        })));
      }
    } catch {
      // Log file not available, try alternative methods
    }

    // If no messages found, create a placeholder
    if (messages.length === 0) {
      messages.push({
        id: uuidv4(),
        role: 'user',
        content: `Working in ${process.cwd()}`,
        timestamp: Date.now()
      });
    }

    return messages;
  }

  private async generateSummary(messages: SessionMessage[]): Promise<string> {
    // Use the first user message as summary, or combine recent messages
    const userMessages = messages.filter(m => m.role === 'user');

    if (userMessages.length > 0) {
      const firstMsg = userMessages[0].content;
      return firstMsg.length > 200
        ? firstMsg.substring(0, 200) + '...'
        : firstMsg;
    }

    return `Session in ${path.basename(process.cwd())}`;
  }

  private extractKeyTopics(messages: SessionMessage[]): string[] {
    const allText = messages.map(m => m.content).join(' ');

    // Simple keyword extraction
    const words = allText.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3);

    const frequency: Record<string, number> = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  private sessionToText(session: Session): string {
    const parts = [
      `Project: ${session.projectName}`,
      `Path: ${session.projectPath}`,
      `Summary: ${session.summary}`,
      `Tags: ${session.tags.join(', ')}`,
      `Messages:`,
      ...session.messages.map(m => `${m.role}: ${m.content}`)
    ];
    return parts.join('\n');
  }

  private async saveSession(session: Session): Promise<void> {
    const sessionsDir = configManager.getSessionsDir();
    const sessionPath = path.join(sessionsDir, `${session.id}.json`);
    await fs.writeFile(sessionPath, JSON.stringify(session, null, 2));
  }

  private async loadSession(sessionId: string): Promise<Session | null> {
    const sessionsDir = configManager.getSessionsDir();
    const sessionPath = path.join(sessionsDir, `${sessionId}.json`);

    try {
      const content = await fs.readFile(sessionPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private async saveForkContext(context: any): Promise<void> {
    const forkPath = path.join(
      configManager.getSessionsDir(),
      'fork-context.json'
    );
    await fs.writeFile(forkPath, JSON.stringify(context, null, 2));
  }

  private getCurrentSessionId(): string {
    return process.env.SMART_FORK_SESSION_ID || 'unknown';
  }

  private async getOpenFiles(): Promise<string[]> {
    // Try to detect currently open files
    // This could be integrated with VS Code, cursor, or other editors
    const openFiles: string[] = [];

    // Check for VS Code
    try {
      // VS Code state is in different locations depending on OS
      // This is a simplified version
      const vscodePath = path.join(
        process.env.HOME || process.env.USERPROFILE || '',
        '.config',
        'Code',
        'Global Storage',
        'state.vscdb'
      );
      // Actual implementation would parse the VS Code state
    } catch {
      // VS Code not detected
    }

    return openFiles;
  }

  private extractFilesFromSession(session: Session): string[] {
    const files = new Set<string>();

    session.messages.forEach(msg => {
      // Extract file paths from message content
      const fileMatches = msg.content.match(/[\w\-./]+\.(ts|js|tsx|jsx|py|go|rs|java|cpp|c|h|md|json|yaml|yml)/g);
      if (fileMatches) {
        fileMatches.forEach(f => files.add(f));
      }

      // Extract from metadata if available
      if (msg.metadata?.filePaths) {
        msg.metadata.filePaths.forEach(f => files.add(f));
      }
    });

    return Array.from(files);
  }
}
