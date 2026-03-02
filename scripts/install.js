/**
 * Post-install script
 * Sets up Claude Code integration automatically
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

function installClaudeSkills() {
  console.log('🔧 Setting up Claude Code Smart Fork integration...\n');

  // Claude Code commands directory
  const commandsDir = path.join(os.homedir(), '.claude', 'commands');

  // Ensure commands directory exists
  fs.mkdirSync(commandsDir, { recursive: true });

  // Define our skills
  const skills = [
    {
      name: 'fork-detect',
      description: 'Find relevant historical sessions across all projects',
      content: `# /fork-detect

Find relevant historical sessions across all projects using AI-powered semantic search.

\`\`\`bash
npx smart-fork detect "$@"
\`\`\`
`
    },
    {
      name: 'fork-to',
      description: 'Switch to a specific historical session (usage: /fork-to <session-id>)',
      content: `# /fork-to

Switch to a specific historical session.

Usage: /fork-to <session-id>

\`\`\`bash
npx smart-fork fork-to "$@"
\`\`\`
`
    },
    {
      name: 'index-session',
      description: 'Index current session for future searching',
      content: `# /index-session

Index current session for future searching.

\`\`\`bash
npx smart-fork index "$@"
\`\`\`
`
    },
    {
      name: 'list-sessions',
      description: 'List all indexed sessions',
      content: `# /list-sessions

List all indexed sessions.

\`\`\`bash
npx smart-fork list "$@"
\`\`\`
`
    },
    {
      name: 'fork-status',
      description: 'Show current fork status and suggestions',
      content: `# /fork-status

Show current fork status and suggestions.

\`\`\`bash
npx smart-fork status "$@"
\`\`\`
`
    }
  ];

  // Install each skill
  let installed = 0;
  for (const skill of skills) {
    const skillPath = path.join(commandsDir, `${skill.name}.md`);

    // Check if skill already exists
    if (fs.existsSync(skillPath)) {
      console.log(`⚠️  /${skill.name} already exists, skipping...`);
    } else {
      fs.writeFileSync(skillPath, skill.content);
      console.log(`✅ Created /${skill.name}`);
      installed++;
    }
  }

  if (installed === 0) {
    console.log('\n✅ All skills are already installed!\n');
  } else {
    console.log(`\n✅ Installed ${installed} new skill(s)!\n`);
  }

  console.log('Available slash commands:');
  skills.forEach(skill => {
    console.log(`  /${skill.name} - ${skill.description}`);
  });
  console.log('\nUsage:');
  console.log('  1. Index your current session: /index-session');
  console.log('  2. Later, find relevant sessions: /fork-detect');
  console.log('  3. Switch to a session: /fork-to <session-id>');
}

// Run installation
installClaudeSkills();
