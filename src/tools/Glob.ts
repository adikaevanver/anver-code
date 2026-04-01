import { glob } from 'glob';
import path from 'path';
import { z } from 'zod';
import { BaseTool } from './BaseTool.js';

const GlobInput = z.object({
  pattern: z.string().describe('Glob pattern to match files against'),
  path: z.string().optional().describe('Directory to search in (defaults to cwd)'),
});

type GlobInputType = z.infer<typeof GlobInput>;

export class GlobTool extends BaseTool<GlobInputType, string> {
  name = 'glob';
  description = 'Find files matching a glob pattern. Returns matched paths as a newline-separated string.';
  destructive = false;
  inputSchema = GlobInput;

  async call(input: GlobInputType): Promise<string> {
    const cwd = input.path ?? process.cwd();
    const matches = await glob(input.pattern, { cwd, nodir: true });
    if (matches.length === 0) {
      return '';
    }
    // Return just the filenames relative to the search directory
    return matches
      .map((m) => path.basename(m))
      .sort()
      .join('\n');
  }
}
