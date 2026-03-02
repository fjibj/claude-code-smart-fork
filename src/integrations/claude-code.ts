/**
 * Claude Code Integration
 * Provides /fork-detect as a slash command within Claude Code
 */

import { ForkDetector } from '../core/fork-detector';
import { SessionManager } from '../core/session-manager';
import { configManager } from '../core/config';

interface SlashCommandContext {
  query?: string;
  project?: string;
  all?: boolean;
  limit?: number;
}

export class ClaudeCodeIntegration {
  private detector: ForkDetector;
  private sessionManager: SessionManager;
  private initialized = false;

  constructor() {
    this.detector = new ForkDetector();
    this.sessionManager = new SessionManager();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await configManager.load();
    await this.detector.initialize();
    await this.sessionManager.initialize();

    this.initialized = true;
  }

  /**
   * Handle /fork-detect slash command
   * This is the main entry point for Claude Code integration
   */
  async handleForkDetect(args: string, context: SlashCommandContext = {}): Promise<string> {
    await this.initialize();

    // Parse arguments
    const parsed = this.parseArgs(args);

    // Extract current context from the conversation
    const query = context.query ||
                  parsed.query ||
                  await this.detector.extractCurrentContext();

    console.log('🔍 Searching for relevant sessions...\n');

    // Search for relevant sessions
    const results = await this.detector.findRelevantSessions({
      text: query,
      projectPath: parsed.all ? undefined : (context.project || parsed.project),
      limit: parsed.limit || 5,
      threshold: 0.6
    });

    if (results.length === 0) {
      return `## No Relevant Sessions Found

I couldn't find any historical sessions that match your current context.

**Suggestions:**
- Try running with \`--all\` to search across all projects
- Lower the similarity threshold
- Start a new session and index it with \`/index-session\`

**Current context:**
\`\`\`
${query.substring(0, 200)}...
\`\`\``;
    }

    // Format results for Claude Code display
    let output = `## 🔀 Found ${results.length} Relevant Session(s)\n\n`;

    results.forEach((result, index) => {
      const session = result.session;
      const score = Math.round(result.score * 100);

      output += `### ${index + 1}. ${session.projectName} (${score}% match)\n\n`;
      output += `- **Project:** \`${session.projectPath}\`\n`;
      output += `- **Last Active:** ${new Date(session.updatedAt).toLocaleString()}\n`;
      output += `- **Messages:** ${session.messageCount}\n`;
      output += `- **Summary:** ${session.summary}\n`;

      if (session.tags.length > 0) {
        output += `- **Tags:** ${session.tags.map(t => `\`${t}\``).join(', ')}\n`;
      }

      output += `\n**Action:** Use \`/fork-to ${session.id}\` to switch to this session\n\n`;
      output += `---\n\n`;
    });

    output += `## Next Steps\n\n`;
    output += `1. Choose a session from above\n`;
    output += `2. Run \`/fork-to <session-id>\` to switch\n`;
    output += `3. Or run \`/fork-detect --all\` to search across all projects\n`;

    return output;
  }

  /**
   * Handle /fork-to slash command
   * Switches to a specific historical session with full conversation context
   */
  async handleForkTo(sessionId: string): Promise<string> {
    await this.initialize();

    try {
      // Load session to show preview before forking
      const session = await this.sessionManager['loadSession'](sessionId);
      if (!session) {
        return `## ❌ Session Not Found

Session \`${sessionId}\` not found.

Use \`/list-sessions\` to see available sessions.`;
      }

      // Show session preview
      let preview = `## 🔀 Forking to Session

**Session ID:** \`${sessionId}\`
**Project:** ${session.projectName}
**Summary:** ${session.summary}

`;

      // Show conversation preview (last 3 turns)
      const history = session.conversationHistory || [];
      if (history.length > 0) {
        preview += `### 💬 Conversation Preview (last ${Math.min(3, history.length)} of ${history.length} turns):\n\n`;

        const previewTurns = history.slice(-3);
        previewTurns.forEach((turn, idx) => {
          const turnNum = history.length - 3 + idx + 1;
          preview += `**Turn ${turnNum}:**\n`;
          preview += `- 👤 **You:** ${turn.userMessage.content.substring(0, 100)}${turn.userMessage.content.length > 100 ? '...' : ''}\n`;
          if (turn.assistantMessage) {
            preview += `- 🤖 **Claude:** ${turn.assistantMessage.content.substring(0, 100)}${turn.assistantMessage.content.length > 100 ? '...' : ''}\n`;
          }
          preview += '\n';
        });
      }

      preview += `Click below to complete the fork and continue the conversation:\n`;
      preview += `[✅ Complete Fork](/fork-to-confirm ${sessionId})\n\n`;
      preview += `Or run \`/fork-to ${sessionId}\` to switch directly.`;

      return preview;
    } catch (error) {
      return `## ❌ Fork Failed

Error: ${error instanceof Error ? error.message : 'Unknown error'}

Use \`/list-sessions\` to see available sessions.`;
    }
  }

  /**
   * Handle /index-session slash command
   * Indexes the current session with full conversation history for future searching
   */
  async handleIndexSession(summary?: string, tags?: string[], conversationHistory?: any[]): Promise<string> {
    await this.initialize();

    try {
      // If no conversation history provided, try to extract from current Claude Code context
      if (!conversationHistory) {
        conversationHistory = await this.extractCurrentConversation();
      }

      const session = await this.sessionManager.indexCurrentSession({
        summary,
        tags,
        conversationHistory
      });

      const turns = session.conversationHistory?.length || 0;

      return `## ✅ Session Indexed Successfully

**Session ID:** \`${session.id}\`
**Project:** ${session.projectName}
**Conversation Turns:** ${turns}
**Summary:** ${session.summary}

This session is now searchable with full conversation history. When you have a similar task in the future, use \`/fork-detect\` to find and resume this session.

The forked session will include both your questions and Claude's responses.`;
    } catch (error) {
      return `## ❌ Indexing Failed

Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Extract current conversation from Claude Code context
   * This would be called by Claude Code with the actual conversation data
   */
  private async extractCurrentConversation(): Promise<any[]> {
    // In a real implementation, this would receive data from Claude Code
    // For now, return empty array and let session-manager use fallback
    return [];
  }

  /**
   * Handle /list-sessions slash command
   */
  async handleListSessions(projectPath?: string): Promise<string> {
    await this.initialize();

    const sessions = await this.sessionManager.listSessions(projectPath);

    if (sessions.length === 0) {
      return `## No Indexed Sessions

No sessions have been indexed yet.

Use \`/index-session\` to index the current session.`;
    }

    // Group by project
    const byProject = sessions.reduce((acc, s) => {
      acc[s.projectPath] = acc[s.projectPath] || [];
      acc[s.projectPath].push(s);
      return acc;
    }, {} as Record<string, typeof sessions>);

    let output = `## 📋 Indexed Sessions (${sessions.length} total)\n\n`;

    Object.entries(byProject).forEach(([projectPath, projectSessions]) => {
      output += `### ${projectPath}\n\n`;

      projectSessions.forEach(session => {
        output += `- **${session.summary.substring(0, 60)}**...\n`;
        output += `  ID: \`${session.id}\` | ${new Date(session.updatedAt).toLocaleDateString()} | ${session.messageCount} messages\n`;
        output += `  [Fork](/fork-to ${session.id})\n\n`;
      });
    });

    return output;
  }

  /**
   * Handle /fork-status slash command
   * Shows current fork status and recent sessions
   */
  async handleForkStatus(): Promise<string> {
    await this.initialize();

    const currentSessionId = process.env.SMART_FORK_SESSION_ID;
    const sessions = await this.sessionManager.listSessions(process.cwd());

    let output = `## 🔀 Fork Status\n\n`;

    if (currentSessionId) {
      output += `**Current Session:** \`${currentSessionId}\`\n`;
      output += `**Forked From:** ${process.env.SMART_FORK_ORIGINAL_CWD || 'Unknown'}\n\n`;
    } else {
      output += `**Current Session:** New session (not forked)\n\n`;
    }

    // Show suggestions
    const suggestions = await this.detector.suggestRelevantSessions();

    if (suggestions.length > 0) {
      output += `### 💡 Suggested Sessions\n\n`;
      suggestions.slice(0, 3).forEach((s, i) => {
        output += `${i + 1}. **${s.session.projectName}** (${Math.round(s.score * 100)}% relevant)\n`;
        output += `   ${s.session.summary.substring(0, 80)}...\n`;
        output += `   [Fork Now](/fork-to ${s.session.id})\n\n`;
      });
    }

    // Show recent sessions from current project
    const recentSessions = sessions
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 5);

    if (recentSessions.length > 0) {
      output += `### 📁 Recent Sessions in This Project\n\n`;
      recentSessions.forEach(session => {
        output += `- ${session.summary.substring(0, 60)}...\n`;
        output += `  ${new Date(session.updatedAt).toLocaleDateString()} | [Fork](/fork-to ${session.id})\n\n`;
      });
    }

    return output;
  }

  /**
   * Parse command arguments
   */
  private parseArgs(args: string): {
    query?: string;
    project?: string;
    all?: boolean;
    limit?: number;
  } {
    const result: ReturnType<typeof this.parseArgs> = {};

    // Parse --flags
    const allMatch = args.match(/--all/);
    if (allMatch) result.all = true;

    const projectMatch = args.match(/--project\s+(\S+)/);
    if (projectMatch) result.project = projectMatch[1];

    const limitMatch = args.match(/--limit\s+(\d+)/);
    if (limitMatch) result.limit = parseInt(limitMatch[1]);

    // Everything else is the query
    const query = args
      .replace(/--all/g, '')
      .replace(/--project\s+\S+/g, '')
      .replace(/--limit\s+\d+/g, '')
      .trim();

    if (query) result.query = query;

    return result;
  }
}

// Export singleton instance
export const claudeCodeIntegration = new ClaudeCodeIntegration();
