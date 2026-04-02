import { z } from 'zod';
import { BaseTool } from './BaseTool.js';

const WebFetchInput = z.object({
  url: z.string().describe('URL to fetch'),
});

type WebFetchInputType = z.infer<typeof WebFetchInput>;

const MAX_LENGTH = 50000;

export class WebFetchTool extends BaseTool<WebFetchInputType, string> {
  name = 'web_fetch';
  description = 'Fetch the content of a URL and return it as text. Truncates at 50000 characters.';
  destructive = false;
  inputSchema = WebFetchInput;

  async call(input: WebFetchInputType): Promise<string> {
    const response = await fetch(input.url);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }
    const text = await response.text();
    return text.length > MAX_LENGTH ? text.slice(0, MAX_LENGTH) : text;
  }
}
