import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { BaseTool } from '../../src/tools/BaseTool.js';

class MockTool extends BaseTool<{ path: string }, string> {
  name = 'MockTool';
  description = 'A mock tool for testing';
  destructive = false;
  inputSchema = z.object({ path: z.string().describe('File path to read') });

  async call(input: { path: string }): Promise<string> {
    return `Read: ${input.path}`;
  }
}

describe('BaseTool', () => {
  const tool = new MockTool();

  it('has a name and description', () => {
    expect(tool.name).toBe('MockTool');
    expect(tool.description).toBe('A mock tool for testing');
  });

  it('validates input with Zod schema', async () => {
    const result = await tool.execute({ path: '/tmp/test.txt' });
    expect(result).toBe('Read: /tmp/test.txt');
  });

  it('rejects invalid input', async () => {
    await expect(tool.execute({ wrong: 'field' } as any)).rejects.toThrow();
  });

  it('converts to OpenAI tool definition', () => {
    const def = tool.toToolDefinition();
    expect(def.type).toBe('function');
    expect(def.function.name).toBe('MockTool');
    expect(def.function.description).toBe('A mock tool for testing');
    expect(def.function.parameters).toHaveProperty('properties');
    expect((def.function.parameters as any).properties.path).toBeDefined();
  });
});
