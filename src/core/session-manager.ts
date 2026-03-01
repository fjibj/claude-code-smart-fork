/**
 * Session Manager - Handles session indexing, storage, and forking
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { Session, SessionIndex, SessionMessage } from '../types';
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
   * Index the current Claude Code session
   */
  async indexCurrentSession(options: {
    summary?: string;
    tags?: string[];
  } = {}): Promise<Session> {
    await this.initialize();

    const sessionId = uuidv4();
    const projectPath = process.cwd();
    const projectName = path.basename(projectPath);

    // Extract messages from Claude Code context
    const messages = await this.extractMessages();

    // Generate summary if not provided
    const summary = options.summary || await this.generateSummary(messages);

    // Extract key topics
    const keyTopics = this.extractKeyTopics(messages);

    // Create session object
    const session: Session = {
      id: sessionId,
      projectPath,
      projectName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages,
      summary,
      tags: options.tags || []
    };

    // Generate embedding for the session
    const sessionText = this.sessionToText(session);
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

    // 4. Display session summary
    console.log('\n📋 Session Summary:');
    console.log(session.summary);
    console.log('\n💬 Recent Messages:');
    session.messages.slice(-5).forEach(msg => {
      const prefix = msg.role === 'user' ? '👤' : '🤖';
      console.log(`${prefix} ${msg.content.substring(0, 100)}...`);
    });

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

  // Private helper methods

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
