import fs from 'fs';
import { z } from 'zod';
import { BaseTool } from './BaseTool.js';

const ReadFileInput = z.object({
  file_path: z.string().describe('Absolute path to the file to read'),
  offset: z.number().int().min(0).optional().describe('Number of lines to skip from the start'),
  limit: z.number().int().min(1).optional().describe('Maximum number of lines to read'),
});

type ReadFileInputType = z.infer<typeof ReadFileInput>;

export class ReadFileTool extends BaseTool<ReadFileInputType, string> {
  name = 'read_file';
  description = 'Read a file and return its contents with line numbers. Supports offset and limit for partial reads.';
  destructive = false;
  inputSchema = ReadFileInput;

  async call(input: ReadFileInputType): Promise<string> {
    const raw = fs.readFileSync(input.file_path, 'utf-8');
    const lines = raw.split('\n');

    // Remove the trailing empty string caused by a trailing newline
    const hasTrailingNewline = raw.endsWith('\n');
    const contentLines = hasTrailingNewline ? lines.slice(0, -1) : lines;

    const startIndex = input.offset !== undefined ? input.offset : 0;
    const endIndex =
      input.limit !== undefined ? startIndex + input.limit : contentLines.length;

    const selected = contentLines.slice(startIndex, endIndex);

    return selected
      .map((line, i) => `${startIndex + i + 1}\t${line}`)
      .join('\n');
  }
}
