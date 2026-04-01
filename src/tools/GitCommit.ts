import { execSync } from 'child_process';
import { z } from 'zod';
import { BaseTool } from './BaseTool.js';

const GitCommitInput = z.object({
  message: z.string().describe('Commit message'),
  cwd: z.string().optional().describe('Working directory for the git command'),
});

type GitCommitInputType = z.infer<typeof GitCommitInput>;

export class GitCommitTool extends BaseTool<GitCommitInputType, string> {
  name = 'git_commit';
  description = 'Run git commit -m <message> and return the output.';
  destructive = true;
  inputSchema = GitCommitInput;

  async call(input: GitCommitInputType): Promise<string> {
    const cwd = input.cwd ?? process.cwd();
    const result = execSync(`git commit -m ${JSON.stringify(input.message)}`, {
      cwd,
      encoding: 'utf-8',
    });
    return result;
  }
}
