import { execSync } from 'child_process';
import { z } from 'zod';
import { BaseTool } from './BaseTool.js';

const GitDiffInput = z.object({
  staged: z.boolean().optional().describe('Show staged diff (--staged flag)'),
  cwd: z.string().optional().describe('Working directory for the git command'),
});

type GitDiffInputType = z.infer<typeof GitDiffInput>;

export class GitDiffTool extends BaseTool<GitDiffInputType, string> {
  name = 'git_diff';
  description = 'Run git diff and return the output. Pass staged=true to diff staged changes.';
  destructive = false;
  inputSchema = GitDiffInput;

  async call(input: GitDiffInputType): Promise<string> {
    const cwd = input.cwd ?? process.cwd();
    const flag = input.staged ? '--staged' : '';
    const cmd = flag ? `git diff ${flag}` : 'git diff';
    const result = execSync(cmd, { cwd, encoding: 'utf-8' });
    return result;
  }
}
