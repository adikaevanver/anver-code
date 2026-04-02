import OpenAI from 'openai';
import type { Message, ToolDefinition, StreamChunk, ToolCall } from './types.js';

export interface ChatParams {
  model: string;
  messages: Message[];
  tools?: ToolDefinition[];
  stream: boolean;
}

export interface LLMProvider {
  chat(params: ChatParams): AsyncIterable<StreamChunk>;
  buildParams(params: ChatParams): Record<string, unknown>;
}

export class OpenRouterProvider implements LLMProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    if (!apiKey) throw new Error('API key is required');
    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey,
    });
  }

  buildParams(params: ChatParams): Record<string, unknown> {
    return {
      model: params.model,
      messages: params.messages,
      tools: params.tools,
      stream: params.stream,
    };
  }

  private async createStreamWithRetry(
    params: ChatParams,
    maxRetries = 3,
  ) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.client.chat.completions.create({
          model: params.model,
          messages: params.messages as OpenAI.ChatCompletionMessageParam[],
          tools: params.tools as OpenAI.ChatCompletionTool[],
          stream: true,
        });
      } catch (err: unknown) {
        const is429 =
          err instanceof Error &&
          ('status' in err && (err as any).status === 429);
        if (!is429 || attempt === maxRetries) throw err;
        const delay = Math.min(1000 * 2 ** attempt, 10000);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    throw new Error('Unreachable');
  }

  async *chat(params: ChatParams): AsyncIterable<StreamChunk> {
    const stream = await this.createStreamWithRetry(params);

    const toolCallAccumulators: Map<number, { id: string; name: string; arguments: string }> = new Map();

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;

      if (delta.content) {
        yield { type: 'text_delta', content: delta.content };
      }

      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index;
          if (!toolCallAccumulators.has(idx)) {
            toolCallAccumulators.set(idx, {
              id: tc.id || '',
              name: tc.function?.name || '',
              arguments: '',
            });
          }
          const acc = toolCallAccumulators.get(idx)!;
          if (tc.id) acc.id = tc.id;
          if (tc.function?.name) acc.name = tc.function.name;
          if (tc.function?.arguments) acc.arguments += tc.function.arguments;
        }
      }

      if (chunk.choices[0]?.finish_reason === 'tool_calls' || chunk.choices[0]?.finish_reason === 'stop') {
        for (const [, acc] of toolCallAccumulators) {
          yield {
            type: 'tool_call_delta',
            tool_call: {
              id: acc.id,
              type: 'function',
              function: { name: acc.name, arguments: acc.arguments },
            },
          };
        }
        yield { type: 'done' };
      }
    }
  }
}
