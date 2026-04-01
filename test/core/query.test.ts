import { describe, it, expect } from 'vitest';
import { QueryEngine } from '../../src/core/query.js';
import type { LLMProvider, ChatParams } from '../../src/core/provider.js';
import type { StreamChunk } from '../../src/core/types.js';
import { Conversation } from '../../src/core/conversation.js';
import { z } from 'zod';

// Mock provider that returns predetermined responses
function createMockProvider(responses: StreamChunk[][]): LLMProvider {
  let callIndex = 0;
  return {
    buildParams: (params: ChatParams) => params as any,
    async *chat(_params: ChatParams): AsyncIterable<StreamChunk> {
      const chunks = responses[callIndex] ?? [];
      callIndex++;
      for (const chunk of chunks) {
        yield chunk;
      }
    },
  };
}

// Minimal mock tool — must match what QueryEngine expects from BaseTool
// Read BaseTool.ts to see the actual interface
class EchoTool {
  name = 'Echo';
  description = 'Echoes input';
  destructive = false;
  inputSchema = z.object({ text: z.string() });
  async execute(input: unknown) {
    const parsed = this.inputSchema.parse(input);
    return parsed.text;
  }
  toToolDefinition() {
    return {
      type: 'function' as const,
      function: { name: 'Echo', description: 'Echoes input', parameters: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } },
    };
  }
}

describe('QueryEngine', () => {
  it('handles a simple text response', async () => {
    const provider = createMockProvider([
      [
        { type: 'text_delta', content: 'Hello ' },
        { type: 'text_delta', content: 'world' },
        { type: 'done' },
      ],
    ]);

    const engine = new QueryEngine(provider, [], 'test-model');
    const conv = new Conversation('system', 'test-model');
    conv.addUserMessage('hi');

    const events: string[] = [];
    for await (const event of engine.run(conv)) {
      events.push(event.type);
      if (event.type === 'text') events.push(event.content);
    }

    expect(events).toContain('text');
    expect(events).toContain('Hello ');
    expect(events).toContain('world');
  });

  it('handles a tool call and loops back', async () => {
    const provider = createMockProvider([
      // First response: tool call
      [
        {
          type: 'tool_call_delta',
          tool_call: {
            id: 'call_1',
            type: 'function',
            function: { name: 'Echo', arguments: '{"text":"hello"}' },
          },
        },
        { type: 'done' },
      ],
      // Second response after tool result: text
      [
        { type: 'text_delta', content: 'Done!' },
        { type: 'done' },
      ],
    ]);

    const tools = [new EchoTool()];
    const engine = new QueryEngine(provider, tools as any, 'test-model');
    const conv = new Conversation('system', 'test-model');
    conv.addUserMessage('echo hello');

    const events: Array<{ type: string; [key: string]: any }> = [];
    for await (const event of engine.run(conv)) {
      events.push(event);
      // Auto-approve tools in test
      if (event.type === 'tool_pending') {
        event.approve();
      }
    }

    const types = events.map((e) => e.type);
    expect(types).toContain('tool_pending');
    expect(types).toContain('tool_result');
    expect(types).toContain('text');
  });
});
