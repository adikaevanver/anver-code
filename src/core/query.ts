import type { LLMProvider, ChatParams } from './provider.js';
import type { Conversation } from './conversation.js';
import type { ToolCall, ToolDefinition, StreamChunk } from './types.js';
import type { BaseTool } from '../tools/BaseTool.js';

export type QueryEvent =
  | { type: 'text'; content: string }
  | {
      type: 'tool_pending';
      toolName: string;
      args: Record<string, unknown>;
      toolCallId: string;
      approve: () => void;
      deny: () => void;
    }
  | { type: 'tool_running'; toolName: string; toolCallId: string }
  | { type: 'tool_result'; toolName: string; toolCallId: string; result: string }
  | { type: 'tool_error'; toolName: string; toolCallId: string; error: string }
  | { type: 'done' };

/**
 * A tool-like interface that the QueryEngine works with.
 * Compatible with both BaseTool instances and mock tools in tests.
 */
interface ToolLike {
  name: string;
  description: string;
  destructive: boolean;
  execute(rawInput: unknown): Promise<unknown>;
  toToolDefinition(): ToolDefinition;
}

export class QueryEngine {
  private provider: LLMProvider;
  private tools: ToolLike[];
  private toolMap: Map<string, ToolLike>;
  private model: string;
  private maxIterations: number;

  constructor(
    provider: LLMProvider,
    tools: ToolLike[],
    model: string,
    maxIterations = 20,
  ) {
    this.provider = provider;
    this.tools = tools;
    this.model = model;
    this.maxIterations = maxIterations;
    this.toolMap = new Map();
    for (const tool of tools) {
      this.toolMap.set(tool.name, tool);
    }
  }

  async *run(conversation: Conversation): AsyncGenerator<QueryEvent> {
    let iterations = 0;

    while (iterations < this.maxIterations) {
      iterations++;

      const toolDefinitions: ToolDefinition[] = this.tools.map((t) =>
        t.toToolDefinition(),
      );

      const params: ChatParams = {
        model: this.model,
        messages: conversation.getMessages(),
        tools: toolDefinitions.length > 0 ? toolDefinitions : undefined,
        stream: true,
      };

      // Accumulate text and tool calls from the stream
      let accumulatedText = '';
      const toolCalls: ToolCall[] = [];

      for await (const chunk of this.provider.chat(params)) {
        if (chunk.type === 'text_delta' && chunk.content) {
          accumulatedText += chunk.content;
          yield { type: 'text', content: chunk.content };
        } else if (chunk.type === 'tool_call_delta' && chunk.tool_call) {
          const tc = chunk.tool_call;
          if (tc.id && tc.function?.name && tc.function?.arguments) {
            toolCalls.push({
              id: tc.id,
              type: 'function',
              function: {
                name: tc.function.name,
                arguments: tc.function.arguments,
              },
            });
          }
        }
        // 'done' chunk signals end of this response
      }

      // Add assistant message to conversation
      conversation.addAssistantMessage(
        accumulatedText,
        toolCalls.length > 0 ? toolCalls : undefined,
      );

      // If no tool calls, we're done
      if (toolCalls.length === 0) {
        yield { type: 'done' };
        return;
      }

      // Process each tool call
      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name;
        const tool = this.toolMap.get(toolName);

        if (!tool) {
          const errorMsg = `Unknown tool: ${toolName}`;
          conversation.addToolResult(toolCall.id, errorMsg);
          yield {
            type: 'tool_error',
            toolName,
            toolCallId: toolCall.id,
            error: errorMsg,
          };
          continue;
        }

        let args: Record<string, unknown>;
        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch {
          const errorMsg = `Invalid JSON arguments: ${toolCall.function.arguments}`;
          conversation.addToolResult(toolCall.id, errorMsg);
          yield {
            type: 'tool_error',
            toolName,
            toolCallId: toolCall.id,
            error: errorMsg,
          };
          continue;
        }

        if (tool.destructive) {
          // For destructive tools, yield pending event and require explicit approval
          yield* this.handleDestructiveTool(tool, toolCall, args, conversation);
        } else {
          // For non-destructive tools, yield pending event with auto-approve default
          yield* this.handleNonDestructiveTool(tool, toolCall, args, conversation);
        }
      }

      // Loop back: the LLM will see the tool results and continue
    }

    // If we exhausted max iterations, yield done
    yield { type: 'done' };
  }

  private async *handleDestructiveTool(
    tool: ToolLike,
    toolCall: ToolCall,
    args: Record<string, unknown>,
    conversation: Conversation,
  ): AsyncGenerator<QueryEvent> {
    let approved = false;
    let denied = false;

    const pendingEvent: QueryEvent & { type: 'tool_pending' } = {
      type: 'tool_pending',
      toolName: tool.name,
      args,
      toolCallId: toolCall.id,
      approve: () => {
        approved = true;
      },
      deny: () => {
        denied = true;
      },
    };

    yield pendingEvent;

    if (denied) {
      const msg = 'Tool execution denied by user';
      conversation.addToolResult(toolCall.id, msg);
      yield {
        type: 'tool_error',
        toolName: tool.name,
        toolCallId: toolCall.id,
        error: msg,
      };
      return;
    }

    if (approved) {
      yield {
        type: 'tool_running',
        toolName: tool.name,
        toolCallId: toolCall.id,
      };
      yield* this.executeTool(tool, toolCall, args, conversation);
    } else {
      // Neither approved nor denied — treat as denied
      const msg = 'Tool execution not approved';
      conversation.addToolResult(toolCall.id, msg);
      yield {
        type: 'tool_error',
        toolName: tool.name,
        toolCallId: toolCall.id,
        error: msg,
      };
    }
  }

  private async *handleNonDestructiveTool(
    tool: ToolLike,
    toolCall: ToolCall,
    args: Record<string, unknown>,
    conversation: Conversation,
  ): AsyncGenerator<QueryEvent> {
    let approved = false;
    let denied = false;

    const pendingEvent: QueryEvent & { type: 'tool_pending' } = {
      type: 'tool_pending',
      toolName: tool.name,
      args,
      toolCallId: toolCall.id,
      approve: () => {
        approved = true;
      },
      deny: () => {
        denied = true;
      },
    };

    yield pendingEvent;

    if (denied) {
      const msg = 'Tool execution denied by user';
      conversation.addToolResult(toolCall.id, msg);
      yield {
        type: 'tool_error',
        toolName: tool.name,
        toolCallId: toolCall.id,
        error: msg,
      };
      return;
    }

    // Non-destructive: auto-approve if neither approved nor denied
    yield { type: 'tool_running', toolName: tool.name, toolCallId: toolCall.id };
    yield* this.executeTool(tool, toolCall, args, conversation);
  }

  private async *executeTool(
    tool: ToolLike,
    toolCall: ToolCall,
    args: Record<string, unknown>,
    conversation: Conversation,
  ): AsyncGenerator<QueryEvent> {
    try {
      const result = await tool.execute(args);
      const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
      conversation.addToolResult(toolCall.id, resultStr);
      yield {
        type: 'tool_result',
        toolName: tool.name,
        toolCallId: toolCall.id,
        result: resultStr,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      conversation.addToolResult(toolCall.id, `Error: ${errorMsg}`);
      yield {
        type: 'tool_error',
        toolName: tool.name,
        toolCallId: toolCall.id,
        error: errorMsg,
      };
    }
  }
}
