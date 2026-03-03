/**
 * CLI Tool for Smart Forking
 * Provides /fork-detect command and other utilities
 */

import { Command } from 'commander';
import { ForkDetector } from '../core/fork-detector';
import { SessionManager } from '../core/session-manager';
import { configManager } from '../core/config';
import chalk from 'chalk';
import * as readline from 'readline';
import * as packageJson from '../../package.json';

const program = new Command();

program
  .name('smart-fork')
  .description('Smart session forking for Claude Code')
  .version(packageJson.version);

// /fork-detect command
program
  .command('detect')
  .alias('fork-detect')
  .description('Detect and suggest relevant historical sessions')
  .option('-q, --query <text>', 'Search query (defaults to current context)')
  .option('-p, --project <path>', 'Limit search to specific project')
  .option('-a, --all', 'Search across all projects', false)
  .option('-n, --limit <number>', 'Number of results', '5')
  .option('--threshold <number>', 'Minimum similarity score', '0.15')
  .action(async (options) => {
    try {
      await configManager.load();

      const detector = new ForkDetector();
      const sessionManager = new SessionManager();

      // Get current query from context or use provided query
      const query = options.query || await detector.extractCurrentContext();

      console.log(chalk.blue('\n🔍 Analyzing current context...\n'));
      console.log(chalk.gray(`Query: ${query.substring(0, 100)}...`));

      // Search for relevant sessions
      const results = await detector.findRelevantSessions({
        text: query,
        projectPath: options.all ? undefined : options.project,
        limit: parseInt(options.limit),
        threshold: parseFloat(options.threshold)
      });

      if (results.length === 0) {
        console.log(chalk.yellow('\n❌ No relevant sessions found.\n'));
        console.log(chalk.gray('Tip: Try using --all to search across all projects, or increase the --threshold.'));
        return;
      }

      // Display results
      console.log(chalk.green(`\n✓ Found ${results.length} relevant session(s):\n`));

      results.forEach((result, index) => {
        const session = result.session;
        const score = Math.round(result.score * 100);

        console.log(chalk.cyan(`${index + 1}. ${session.projectName}`));
        console.log(chalk.gray(`   Path: ${session.projectPath}`));
        console.log(chalk.gray(`   Relevance: ${score}%`));
        console.log(chalk.gray(`   Summary: ${session.summary.substring(0, 80)}...`));
        console.log(chalk.gray(`   Last updated: ${new Date(session.updatedAt).toLocaleString()}`));
        console.log();
      });

      // Interactive selection
      const selected = await promptSelection(results.length);

      if (selected > 0) {
        const targetSession = results[selected - 1].session;
        console.log(chalk.blue(`\n🔄 Forking to session: ${targetSession.projectName}\n`));

        // Perform the fork
        await sessionManager.forkToSession(targetSession.id);

        console.log(chalk.green('\n✓ Successfully forked to session!\n'));
        console.log(chalk.gray(`Session ID: ${targetSession.id}`));
        console.log(chalk.gray(`Project: ${targetSession.projectPath}`));
      }

    } catch (error) {
      console.error(chalk.red('\nError:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Index current session
program
  .command('index')
  .description('Index current session for searching (reads conversation history from stdin if provided)')
  .option('-s, --summary <text>', 'Session summary')
  .option('-t, --tags <tags>', 'Comma-separated tags')
  .option('--conversation <file>', 'Path to conversation history JSON file')
  .action(async (options) => {
    try {
      await configManager.load();

      const sessionManager = new SessionManager();

      console.log(chalk.blue('\n📦 Indexing current session...\n'));

      // Read conversation history from file if provided, or stdin
      let conversationHistory;
      if (options.conversation) {
        const fs = await import('fs/promises');
        const content = await fs.readFile(options.conversation, 'utf-8');
        conversationHistory = JSON.parse(content);
      } else if (!process.stdin.isTTY) {
        // Read from stdin
        const chunks: Buffer[] = [];
        for await (const chunk of process.stdin) {
          chunks.push(chunk);
        }
        const stdinContent = Buffer.concat(chunks).toString('utf-8').trim();
        if (stdinContent) {
          try {
            conversationHistory = JSON.parse(stdinContent);
          } catch {
            // Not valid JSON, ignore
          }
        }
      }

      const session = await sessionManager.indexCurrentSession({
        summary: options.summary,
        tags: options.tags?.split(',').map((t: string) => t.trim()) || [],
        conversationHistory
      });

      console.log(chalk.green('\n✓ Session indexed successfully!\n'));
      console.log(chalk.gray(`Session ID: ${session.id}`));
      console.log(chalk.gray(`Conversation turns: ${session.conversationHistory?.length || Math.ceil(session.messages.length / 2)}`));
      if (session.conversationHistory) {
        console.log(chalk.gray(`Total messages: ${session.messages.length}`));
      }

    } catch (error) {
      console.error(chalk.red('\nError:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// List indexed sessions
program
  .command('list')
  .description('List all indexed sessions')
  .option('-p, --project <path>', 'Filter by project path')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      await configManager.load();

      const sessionManager = new SessionManager();
      const sessions = await sessionManager.listSessions(options.project);

      if (options.json) {
        console.log(JSON.stringify(sessions, null, 2));
        return;
      }

      if (sessions.length === 0) {
        console.log(chalk.yellow('\nNo indexed sessions found.\n'));
        return;
      }

      console.log(chalk.blue(`\n📋 ${sessions.length} Indexed Session(s):\n`));

      // Group by project
      const byProject = sessions.reduce((acc, s) => {
        acc[s.projectPath] = acc[s.projectPath] || [];
        acc[s.projectPath].push(s);
        return acc;
      }, {} as Record<string, typeof sessions>);

      Object.entries(byProject).forEach(([projectPath, projectSessions]) => {
        console.log(chalk.cyan(`\n${projectPath}:`));
        projectSessions.forEach(session => {
          console.log(chalk.gray(`  • ${session.summary.substring(0, 60)}...`));
          console.log(chalk.gray(`    ID: ${session.id} | ${new Date(session.updatedAt).toLocaleDateString()}`));
        });
      });

      console.log();

    } catch (error) {
      console.error(chalk.red('\nError:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Export session
program
  .command('export')
  .description('Export session to file')
  .argument('<session-id>', 'Session ID to export')
  .option('-o, --output <path>', 'Output file path')
  .action(async (sessionId, options) => {
    try {
      await configManager.load();

      const sessionManager = new SessionManager();
      const outputPath = await sessionManager.exportSession(sessionId, options.output);

      console.log(chalk.green('\n✓ Session exported to:'), outputPath);

    } catch (error) {
      console.error(chalk.red('\nError:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Fork back to previous session
program
  .command('fork-back')
  .alias('back')
  .description('Fork back to the session before the last fork')
  .action(async () => {
    try {
      await configManager.load();

      const sessionManager = new SessionManager();
      await sessionManager.forkBack();

      console.log(chalk.green('\n✓ Forked back to previous session!\n'));

    } catch (error) {
      console.error(chalk.red('\nError:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Config command
program
  .command('config')
  .description('Manage configuration')
  .option('--set-embedding <provider>', 'Set embedding provider (openai/local/ollama)')
  .option('--set-model <model>', 'Set embedding model')
  .option('--show', 'Show current configuration')
  .action(async (options) => {
    await configManager.load();

    if (options.show) {
      console.log(chalk.blue('\n⚙️  Current Configuration:\n'));
      console.log(JSON.stringify(configManager.get(), null, 2));
      console.log();
      return;
    }

    if (options.setEmbedding) {
      const currentConfig = configManager.get();
      configManager.update({
        embedding: { ...currentConfig.embedding, provider: options.setEmbedding }
      });
    }

    if (options.setModel) {
      const currentConfig = configManager.get();
      configManager.update({
        embedding: { ...currentConfig.embedding, model: options.setModel }
      });
    }

    await configManager.save();
    console.log(chalk.green('\n✓ Configuration updated\n'));
  });

// Fork to specific session
program
  .command('fork-to <session-id>')
  .description('Fork to a specific historical session')
  .action(async (sessionId) => {
    try {
      await configManager.load();

      const sessionManager = new SessionManager();

      console.log(chalk.blue(`\n🔄 Forking to session: ${sessionId}\n`));

      await sessionManager.forkToSession(sessionId);

      console.log(chalk.green('\n✓ Successfully forked!\n'));

    } catch (error) {
      console.error(chalk.red('\nError:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Show current fork status and suggestions')
  .action(async () => {
    try {
      await configManager.load();

      const detector = new ForkDetector();
      const sessionManager = new SessionManager();

      // Show current session info
      const currentSessionId = process.env.SMART_FORK_SESSION_ID;

      console.log(chalk.blue('\n🔀 Fork Status\n'));

      if (currentSessionId) {
        console.log(chalk.gray(`Current Session: ${currentSessionId}`));
        console.log(chalk.gray(`Original Directory: ${process.env.SMART_FORK_ORIGINAL_CWD || 'N/A'}`));
      } else {
        console.log(chalk.gray('Not currently forked'));
      }

      console.log(chalk.gray(`Working Directory: ${process.cwd()}`));

      // Show suggestions
      console.log(chalk.blue('\n💡 Suggested Sessions:\n'));

      const suggestions = await detector.suggestRelevantSessions();

      if (suggestions.length === 0) {
        console.log(chalk.yellow('No relevant sessions found.'));
      } else {
        suggestions.slice(0, 3).forEach((result, index) => {
          const session = result.session;
          const score = Math.round(result.score * 100);

          console.log(chalk.cyan(`${index + 1}. ${session.projectName} (${score}% match)`));
          console.log(chalk.gray(`   ${session.summary.substring(0, 70)}...`));
          console.log();
        });
      }

      // Show recent sessions
      console.log(chalk.blue('📁 Recent Sessions in This Project:\n'));

      const recentSessions = await sessionManager.listSessions(process.cwd());
      const sorted = recentSessions
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 5);

      if (sorted.length === 0) {
        console.log(chalk.yellow('No sessions indexed for this project yet.'));
        console.log(chalk.gray('Run: smart-fork index'));
      } else {
        sorted.forEach(session => {
          console.log(chalk.gray(`• ${session.summary.substring(0, 60)}...`));
          console.log(chalk.gray(`  ${new Date(session.updatedAt).toLocaleDateString()}`));
        });
      }

      console.log();

    } catch (error) {
      console.error(chalk.red('\nError:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Helper function for interactive selection
async function promptSelection(max: number): Promise<number> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(
      chalk.yellow(`\nSelect a session to fork (1-${max}, or 0 to cancel): `),
      (answer) => {
        rl.close();
        const selected = parseInt(answer.trim());
        if (isNaN(selected) || selected < 0 || selected > max) {
          console.log(chalk.red('Invalid selection'));
          resolve(0);
        } else {
          resolve(selected);
        }
      }
    );
  });
}

export { program };
