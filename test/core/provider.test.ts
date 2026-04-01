import { describe, it, expect } from 'vitest';
import { OpenRouterProvider } from '../../src/core/provider.js';

describe('OpenRouterProvider', () => {
  it('constructs with API key and base URL', () => {
    const provider = new OpenRouterProvider('sk-or-test');
    expect(provider).toBeDefined();
  });

  it('throws if no API key provided', () => {
    expect(() => new OpenRouterProvider('')).toThrow('API key is required');
  });

  it('formats tool definitions correctly', () => {
    const provider = new OpenRouterProvider('sk-or-test');
    const tools = [{
      type: 'function' as const,
      function: {
        name: 'ReadFile',
        description: 'Read a file',
        parameters: {
          type: 'object',
          properties: { path: { type: 'string' } },
          required: ['path'],
        },
      },
    }];
    const params = provider.buildParams({
      model: 'test-model',
      messages: [{ role: 'user', content: 'hi' }],
      tools,
      stream: true,
    });
    expect(params.tools).toEqual(tools);
    expect(params.model).toBe('test-model');
    expect(params.stream).toBe(true);
  });
});
