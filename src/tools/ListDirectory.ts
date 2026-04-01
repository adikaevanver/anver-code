import fs from 'fs';
import { z } from 'zod';
import { BaseTool } from './BaseTool.js';

const ListDirectoryInput = z.object({
  path: z.string().describe('Absolute path to the directory to list'),
});

type ListDirectoryInputType = z.infer<typeof ListDirectoryInput>;

export class ListDirectoryTool extends BaseTool<ListDirectoryInputType, string> {
  name = 'ListDirectory';
  description = 'List the contents of a directory. Directories are shown with a trailing slash. Sorted alphabetically.';
  destructive = false;
  inputSchema = ListDirectoryInput;

  async call(input: ListDirectoryInputType): Promise<string> {
    const entries = fs.readdirSync(input.path, { withFileTypes: true });
    const names = entries
      .map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
      .sort();
    return names.join('\n');
  }
}
