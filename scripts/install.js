/**
 * Post-install script
 * Sets up Claude Code integration automatically
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

function installClaudeHooks() {
  console.log('🔧 Setting up Claude Code Smart Fork integration...\n');

  // Find Claude Code configuration directory
  const possiblePaths = [
    // Cross-platform: ~/.claude/settings.json (primary location for Claude Code)
    path.join(os.homedir(), '.claude', 'settings.json'),
    // macOS
    path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'settings.json'),
    // Linux
    path.join(os.homedir(), '.config', 'claude', 'settings.json'),
    // Windows
    path.join(os.homedir(), 'AppData', 'Roaming', 'Claude', 'settings.json'),
  ];

  // Check for CLAUDE_CONFIG environment variable
  if (process.env.CLAUDE_CONFIG) {
    possiblePaths.unshift(path.join(process.env.CLAUDE_CONFIG, 'settings.json'));
  }

  let claudeConfigPath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      claudeConfigPath = p;
      break;
    }
  }

  if (!claudeConfigPath) {
    console.log('⚠️  Claude Code configuration not found automatically.');
    console.log('To manually install slash commands, add the following to your Claude Code settings:\n');
    console.log(JSON.stringify({
      slashCommands: [
        {
          name: 'fork-detect',
          description: 'Find relevant historical sessions across all projects',
          entrypoint: 'npx smart-fork detect'
        },
        {
          name: 'fork-to',
          description: 'Switch to a specific historical session',
          entrypoint: 'npx smart-fork fork-to'
        },
        {
          name: 'index-session',
          description: 'Index current session for future searching',
          entrypoint: 'npx smart-fork index'
        },
        {
          name: 'list-sessions',
          description: 'List all indexed sessions',
          entrypoint: 'npx smart-fork list'
        }
      ]
    }, null, 2));
    return;
  }

  // Read existing config
  let config = {};
  try {
    config = JSON.parse(fs.readFileSync(claudeConfigPath, 'utf-8'));
  } catch {
    // File doesn't exist or is invalid, start fresh
  }

  // Add our slash commands
  config.slashCommands = config.slashCommands || [];

  const ourCommands = [
    {
      name: 'fork-detect',
      description: 'Find relevant historical sessions across all projects',
      entrypoint: 'npx smart-fork detect'
    },
    {
      name: 'fork-to',
      description: 'Switch to a specific historical session (usage: /fork-to <session-id>)',
      entrypoint: 'npx smart-fork fork-to'
    },
    {
      name: 'index-session',
      description: 'Index current session for future searching',
      entrypoint: 'npx smart-fork index'
    },
    {
      name: 'list-sessions',
      description: 'List all indexed sessions',
      entrypoint: 'npx smart-fork list'
    },
    {
      name: 'fork-status',
      description: 'Show current fork status and suggestions',
      entrypoint: 'npx smart-fork status'
    }
  ];

  // Remove existing commands with same names
  config.slashCommands = config.slashCommands.filter(
    cmd => !ourCommands.some(our => our.name === cmd.name)
  );

  // Add our commands
  config.slashCommands.push(...ourCommands);

  // Save config
  fs.mkdirSync(path.dirname(claudeConfigPath), { recursive: true });
  fs.writeFileSync(claudeConfigPath, JSON.stringify(config, null, 2));

  console.log('✅ Claude Code integration installed successfully!\n');
  console.log('Available slash commands:');
  ourCommands.forEach(cmd => {
    console.log(`  /${cmd.name} - ${cmd.description}`);
  });
  console.log('\nUsage:');
  console.log('  1. Index your current session: /index-session');
  console.log('  2. Later, find relevant sessions: /fork-detect');
  console.log('  3. Switch to a session: /fork-to <session-id>');
}

// Run installation
installClaudeHooks();
