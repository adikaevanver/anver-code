import { glob } from 'glob';
import { z } from 'zod';
import { BaseTool } from './BaseTool.js';

const FindFileInput = z.object({
  name: z.string().describe('Filename to search for (e.g. "index.ts")'),
  path: z.string().optional().describe('Directory to search in (defaults to cwd)'),
});

type FindFileInputType = z.infer<typeof FindFileInput>;

export class FindFileTool extends BaseTool<FindFileInputType, string> {
  name = 'FindFile';
  description = 'Find files by name recursively. Ignores node_modules. Returns matching paths as a newline-separated string.';
  destructive = false;
  inputSchema = FindFileInput;

  async call(input: FindFileInputType): Promise<string> {
    const cwd = input.path ?? process.cwd();
    const matches = await glob(`**/${input.name}`, {
      cwd,
      ignore: ['node_modules/**'],
      nodir: true,
    });
    if (matches.length === 0) {
      return '';
    }
    return matches.sort().join('\n');
  }
}
