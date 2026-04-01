import { type ZodSchema } from 'zod';
import type { ToolDefinition } from '../core/types.js';

export abstract class BaseTool<TInput, TOutput> {
  abstract name: string;
  abstract description: string;
  abstract inputSchema: ZodSchema<TInput>;
  abstract destructive: boolean;

  abstract call(input: TInput): Promise<TOutput>;

  async execute(rawInput: unknown): Promise<TOutput> {
    const parsed = this.inputSchema.parse(rawInput);
    return this.call(parsed);
  }

  toToolDefinition(): ToolDefinition {
    const jsonSchema = (this.inputSchema as any).toJSONSchema();
    return {
      type: 'function',
      function: {
        name: this.name,
        description: this.description,
        parameters: jsonSchema as Record<string, unknown>,
      },
    };
  }
}
