// Runs after Claude edits a file. If it is a Prisma schema, validates it right away
// so a broken schema is caught on the spot (exit 2 sends the error back to Claude).
import { execSync } from 'node:child_process';

let raw = '';
for await (const chunk of process.stdin) raw += chunk;

const input = JSON.parse(raw);
const file = input.tool_input?.file_path ?? '';

if (!file.endsWith('.prisma')) process.exit(0);

try {
  execSync('npx prisma validate', { cwd: process.env.CLAUDE_PROJECT_DIR || input.cwd, stdio: 'pipe' });
} catch (error) {
  process.stderr.write(`prisma validate failed after editing ${file}:\n${error.stdout}${error.stderr}`);
  process.exit(2);
}
