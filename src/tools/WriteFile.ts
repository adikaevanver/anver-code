import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { BaseTool } from './BaseTool.js';

const WriteFileInput = z.object({
  file_path: z.string().describe('Absolute path where the file should be written'),
  content: z.string().describe('Content to write to the file'),
});

type WriteFileInputType = z.infer<typeof WriteFileInput>;

export class WriteFileTool extends BaseTool<WriteFileInputType, string> {
  name = 'write_file';
  description = 'Write content to a file, creating it (and any parent directories) if it does not exist, or overwriting it if it does.';
  destructive = true;
  inputSchema = WriteFileInput;

  async call(input: WriteFileInputType): Promise<string> {
    const dir = path.dirname(input.file_path);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(input.file_path, input.content, 'utf-8');
    return `Written ${input.file_path}`;
  }
}
