import { randomUUID } from 'crypto';
import type { Message, ToolCall, SessionData } from './types.js';
import { estimateMessagesTokens } from '../utils/tokens.js';

export class Conversation {
  private messages: Message[] = [];
  private model: string;
  private id: string;

  constructor(systemPrompt: string, model: string, id?: string) {
    this.model = model;
    this.id = id ?? randomUUID();
    this.messages.push({ role: 'system', content: systemPrompt });
  }

  getMessages(): Message[] {
    return [...this.messages];
  }

  addUserMessage(content: string): void {
    this.messages.push({ role: 'user', content });
  }

  addAssistantMessage(content: string, toolCalls: ToolCall[] | undefined): void {
    const msg: Message = { role: 'assistant', content };
    if (toolCalls && toolCalls.length > 0) {
      (msg as any).tool_calls = toolCalls;
    }
    this.messages.push(msg);
  }

  addToolResult(toolCallId: string, content: string): void {
    this.messages.push({ role: 'tool', tool_call_id: toolCallId, content });
  }

  estimatedTokens(): number {
    return estimateMessagesTokens(this.messages);
  }

  toSessionData(cwd: string): SessionData {
    const now = new Date().toISOString();
    return {
      id: this.id,
      messages: this.getMessages(),
      model: this.model,
      cwd,
      createdAt: now,
      updatedAt: now,
    };
  }

  static fromSessionData(data: SessionData): Conversation {
    const systemMsg = data.messages.find((m) => m.role === 'system');
    const conv = new Conversation(systemMsg?.content ?? '', data.model, data.id);
    conv.messages = [...data.messages];
    return conv;
  }
}
