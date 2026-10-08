// Runs when Claude is about to finish. If .ts or .prisma files changed, runs tsc
// (and prisma validate). On errors, exit 2 makes Claude keep working to fix them.
import { execSync } from 'node:child_process';

let raw = '';
for await (const chunk of process.stdin) raw += chunk;

const input = JSON.parse(raw);
const cwd = process.env.CLAUDE_PROJECT_DIR || input.cwd;

function run(command) {
  try {
    execSync(command, { cwd, stdio: 'pipe' });
    return '';
  } catch (error) {
    return `$ ${command}\n${error.stdout}${error.stderr}\n`;
  }
}

const changed = execSync('git status --porcelain --untracked-files=all', { cwd })
  .toString()
  .split('\n')
  .map((line) => line.slice(3).trim())
  .filter(Boolean);

const prismaChanged = changed.some((file) => file.endsWith('.prisma'));
const tsChanged = changed.some((file) => file.endsWith('.ts'));

if (!prismaChanged && !tsChanged) process.exit(0);

let errors = run('npx tsc --noEmit');
if (prismaChanged) errors += run('npx prisma validate');

if (!errors) process.exit(0);

// Already retried once: warn the user instead of blocking again (avoids an endless loop)
if (input.stop_hook_active) {
  console.log(JSON.stringify({ systemMessage: `Automatic validation still has errors:\n${errors}` }));
  process.exit(0);
}

process.stderr.write(`Automatic validation failed. Fix these errors before finishing:\n${errors}`);
process.exit(2);
