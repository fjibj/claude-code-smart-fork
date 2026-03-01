/**
 * Fork Detector - Core matching engine
 * Finds relevant historical sessions based on current context
 */

import { configManager } from './config';
import { EmbeddingService } from './embedding';
import { VectorStore } from './vector-store';
import type { SearchQuery, SearchResult, SessionIndex } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';

export class ForkDetector {
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

    this.initialized = true;
  }

  /**
   * Extract context from current Claude Code session
   * Reads from environment variables and recent conversation history
   */
  async extractCurrentContext(): Promise<string> {
    const contexts: string[] = [];

    // 1. Try to get from Claude Code's context file (if available)
    const claudeContextPath = process.env.CLAUDE_CONTEXT_PATH ||
      path.join(process.cwd(), '.claude', 'context.json');

    try {
      const contextContent = await fs.readFile(claudeContextPath, 'utf-8');
      const context = JSON.parse(contextContent);

      if (context.recentMessages) {
        contexts.push(...context.recentMessages.map((m: any) => m.content));
      }

      if (context.currentTask) {
        contexts.push(context.currentTask);
      }
    } catch {
      // Context file not available, use alternative methods
    }

    // 2. Extract from current working directory
    contexts.push(`Current project: ${process.cwd()}`);

    // 3. Try to infer from git status
    try {
      const { execSync } = require('child_process');
      const gitBranch = execSync('git branch --show-current', {
        cwd: process.cwd(),
        encoding: 'utf-8'
      }).trim();
      contexts.push(`Git branch: ${gitBranch}`);
    } catch {
      // Not a git repository
    }

    // 4. Look for recent files
    try {
      const recentFiles = await this.getRecentFiles(process.cwd(), 5);
      if (recentFiles.length > 0) {
        contexts.push(`Recent files: ${recentFiles.join(', ')}`);
      }
    } catch {
      // Ignore errors
    }

    // 5. Use recent command history if available
    const historyPath = path.join(process.env.HOME || process.env.USERPROFILE || '', '.claude_history');
    try {
      const history = await fs.readFile(historyPath, 'utf-8');
      const recentCommands = history.split('\n').slice(-10).join(' ');
      contexts.push(`Recent activity: ${recentCommands}`);
    } catch {
      // History not available
    }

    return contexts.join('\n');
  }

  /**
   * Find sessions relevant to the given query
   */
  async findRelevantSessions(query: SearchQuery): Promise<SearchResult[]> {
    await this.initialize();

    // Generate embedding for the query
    const queryEmbedding = await this.embeddingService.embed(query.text);

    // Search vector store
    const results = await this.vectorStore.search({
      vector: queryEmbedding,
      limit: query.limit || 5,
      filter: query.projectPath ? { projectPath: query.projectPath } : undefined
    });

    // Filter by threshold and format results
    const threshold = query.threshold ?? 0.6;
    const filteredResults = results
      .filter(r => r.score >= threshold)
      .map(r => ({
        session: r.session,
        score: r.score,
        matchedMessage: this.findBestMatchingMessage(r.session, query.text)
      }));

    return filteredResults;
  }

  /**
   * Analyze current session and suggest relevant past sessions proactively
   */
  async suggestRelevantSessions(): Promise<SearchResult[]> {
    const context = await this.extractCurrentContext();

    // Extract key topics from context
    const keyTopics = this.extractKeyTopics(context);

    // Search with expanded query
    const expandedQuery = [
      context,
      ...keyTopics
    ].join(' ');

    return this.findRelevantSessions({
      text: expandedQuery,
      limit: 3,
      threshold: 0.5  // Lower threshold for proactive suggestions
    });
  }

  /**
   * Extract key topics from text using simple TF-IDF-like approach
   */
  private extractKeyTopics(text: string): string[] {
    // Remove common stop words
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
      'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
      'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between',
      'and', 'but', 'or', 'yet', 'so', 'if', 'because', 'although', 'though',
      'unless', 'while', 'where', 'when', 'that', 'which', 'who', 'whom', 'whose',
      'what', 'this', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they']);

    // Extract words and count frequency
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));

    const frequency: Record<string, number> = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    // Get top keywords
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Find the best matching message in a session
   */
  private findBestMatchingMessage(session: SessionIndex, query: string): string | undefined {
    // This would require loading the full session
    // For now, return the summary
    return session.summary;
  }

  /**
   * Get recently modified files in a directory
   */
  private async getRecentFiles(dir: string, limit: number): Promise<string[]> {
    const files: { path: string; mtime: number }[] = [];

    async function scan(directory: string) {
      try {
        const entries = await fs.readdir(directory, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(directory, entry.name);

          // Skip hidden files and common non-code directories
          if (entry.name.startsWith('.') ||
              ['node_modules', 'dist', 'build', '.git'].includes(entry.name)) {
            continue;
          }

          if (entry.isDirectory()) {
            await scan(fullPath);
          } else {
            const stat = await fs.stat(fullPath);
            files.push({ path: fullPath, mtime: stat.mtime.getTime() });
          }
        }
      } catch {
        // Ignore permission errors
      }
    }

    await scan(dir);

    return files
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, limit)
      .map(f => path.relative(dir, f.path));
  }
}
