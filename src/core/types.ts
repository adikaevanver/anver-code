export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export type SystemMessage = { role: 'system'; content: string };
export type UserMessage = { role: 'user'; content: string };
export type AssistantMessage = {
  role: 'assistant';
  content: string;
  tool_calls?: ToolCall[];
};
export type ToolResultMessage = {
  role: 'tool';
  tool_call_id: string;
  content: string;
};

export type Message =
  | SystemMessage
  | UserMessage
  | AssistantMessage
  | ToolResultMessage;

export interface StreamChunk {
  type: 'text_delta' | 'tool_call_delta' | 'done';
  content?: string;
  tool_call?: Partial<ToolCall>;
}

export interface SessionData {
  id: string;
  messages: Message[];
  model: string;
  cwd: string;
  createdAt: string;
  updatedAt: string;
}

export function isAssistantMessage(msg: Message): msg is AssistantMessage {
  return msg.role === 'assistant';
}

export function isToolMessage(msg: Message): msg is ToolResultMessage {
  return msg.role === 'tool';
}
