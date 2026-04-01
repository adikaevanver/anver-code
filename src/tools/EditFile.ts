import fs from 'fs';
import { z } from 'zod';
import { BaseTool } from './BaseTool.js';

const EditFileInput = z.object({
  file_path: z.string().describe('Absolute path to the file to edit'),
  old_string: z.string().describe('The exact string to find and replace (must appear exactly once)'),
  new_string: z.string().describe('The string to replace old_string with'),
});

type EditFileInputType = z.infer<typeof EditFileInput>;

export class EditFileTool extends BaseTool<EditFileInputType, string> {
  name = 'edit_file';
  description = 'Replace an exact string in a file. The old_string must appear exactly once in the file.';
  destructive = true;
  inputSchema = EditFileInput;

  async call(input: EditFileInputType): Promise<string> {
    const content = fs.readFileSync(input.file_path, 'utf-8');

    const occurrences = content.split(input.old_string).length - 1;

    if (occurrences === 0) {
      throw new Error(`old_string not found in ${input.file_path}`);
    }

    if (occurrences > 1) {
      throw new Error(
        `old_string matches multiple times (${occurrences}) in ${input.file_path}; provide more context to make it unique`
      );
    }

    const updated = content.replace(input.old_string, input.new_string);
    fs.writeFileSync(input.file_path, updated, 'utf-8');
    return `Edited ${input.file_path}`;
  }
}
