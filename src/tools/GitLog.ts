import { execSync } from 'child_process';
import { z } from 'zod';
import { BaseTool } from './BaseTool.js';

const GitLogInput = z.object({
  count: z.number().int().min(1).optional().describe('Number of commits to show (default: 10)'),
  cwd: z.string().optional().describe('Working directory for the git command'),
});

type GitLogInputType = z.infer<typeof GitLogInput>;

export class GitLogTool extends BaseTool<GitLogInputType, string> {
  name = 'git_log';
  description = 'Run git log --oneline and return the output.';
  destructive = false;
  inputSchema = GitLogInput;

  async call(input: GitLogInputType): Promise<string> {
    const cwd = input.cwd ?? process.cwd();
    const count = input.count ?? 10;
    const result = execSync(`git log --oneline -n ${count}`, { cwd, encoding: 'utf-8' });
    return result;
  }
}
