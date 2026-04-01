import { execSync } from 'child_process';
import { z } from 'zod';
import { BaseTool } from './BaseTool.js';

const GitStatusInput = z.object({
  cwd: z.string().optional().describe('Working directory for the git command'),
});

type GitStatusInputType = z.infer<typeof GitStatusInput>;

export class GitStatusTool extends BaseTool<GitStatusInputType, string> {
  name = 'git_status';
  description = 'Run git status and return the output.';
  destructive = false;
  inputSchema = GitStatusInput;

  async call(input: GitStatusInputType): Promise<string> {
    const cwd = input.cwd ?? process.cwd();
    const result = execSync('git status', { cwd, encoding: 'utf-8' });
    return result;
  }
}
