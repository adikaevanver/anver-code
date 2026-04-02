import { z } from 'zod';
import { BaseTool } from './BaseTool.js';

const WebSearchInput = z.object({
  query: z.string().describe('Search query'),
});

type WebSearchInputType = z.infer<typeof WebSearchInput>;

const MAX_RESULTS = 8;

export class WebSearchTool extends BaseTool<WebSearchInputType, string> {
  name = 'web_search';
  description = 'Search the web via DuckDuckGo and return up to 8 results with titles and snippets.';
  destructive = false;
  inputSchema = WebSearchInput;

  async call(input: WebSearchInputType): Promise<string> {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(input.query)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; anver-code/1.0)',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }
    const html = await response.text();

    const results: { title: string; snippet: string }[] = [];

    // Extract result blocks: each result has a title and snippet
    const resultBlockRegex = /<a[^>]+class="result__a"[^>]*>([\s\S]*?)<\/a>/g;
    const snippetRegex = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;

    const titles: string[] = [];
    const snippets: string[] = [];

    let m: RegExpExecArray | null;

    while ((m = resultBlockRegex.exec(html)) !== null && titles.length < MAX_RESULTS) {
      const raw = m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').trim();
      if (raw) titles.push(raw);
    }

    while ((m = snippetRegex.exec(html)) !== null && snippets.length < MAX_RESULTS) {
      const raw = m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').trim();
      if (raw) snippets.push(raw);
    }

    const count = Math.min(titles.length, snippets.length, MAX_RESULTS);
    for (let i = 0; i < count; i++) {
      results.push({ title: titles[i], snippet: snippets[i] });
    }

    if (results.length === 0) {
      return 'No results found.';
    }

    return results
      .map((r, i) => `${i + 1}. ${r.title}\n   ${r.snippet}`)
      .join('\n\n');
  }
}
