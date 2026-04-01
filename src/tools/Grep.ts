import { spawnSync } from 'child_process';
import { z } from 'zod';
import { BaseTool } from './BaseTool.js';

const GrepInput = z.object({
  pattern: z.string().describe('Regular expression pattern to search for'),
  path: z.string().optional().describe('File or directory to search in (defaults to cwd)'),
  glob: z.string().optional().describe('Glob to filter files (e.g. "*.ts")'),
});

type GrepInputType = z.infer<typeof GrepInput>;

export class GrepTool extends BaseTool<GrepInputType, string> {
  name = 'grep';
  description = 'Search file contents using grep. Returns matching lines or empty string for no matches.';
  destructive = false;
  inputSchema = GrepInput;

  async call(input: GrepInputType): Promise<string> {
    const searchPath = input.path ?? process.cwd();
    const args = ['-rn', '--color=never', input.pattern, searchPath];

    if (input.glob) {
      args.unshift('--include', input.glob);
    }

    const result = spawnSync('/opt/homebrew/bin/grep', args, {
      encoding: 'utf-8',
      env: process.env,
    });

    // grep exit code: 0 = found, 1 = not found, 2 = error
    if (result.status === 2 || result.error) {
      // Fall back to system grep
      const fallback = spawnSync('grep', args, {
        encoding: 'utf-8',
        env: process.env,
      });
      if (fallback.status === 2 || fallback.error) {
        throw new Error(fallback.stderr || 'grep failed');
      }
      return fallback.status === 1 ? '' : (fallback.stdout ?? '').trimEnd();
    }

    if (result.status === 1) {
      return '';
    }

    return (result.stdout ?? '').trimEnd();
  }
}
