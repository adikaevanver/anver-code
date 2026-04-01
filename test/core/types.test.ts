import { describe, it, expect } from 'vitest';
import {
  type Message,
  type ToolCall,
  type ToolDefinition,
  type StreamChunk,
  type SessionData,
  isAssistantMessage,
  isToolMessage,
} from '../../src/core/types.js';

describe('types', () => {
  describe('isAssistantMessage', () => {
    it('returns true for assistant messages', () => {
      const msg: Message = { role: 'assistant', content: 'hello' };
      expect(isAssistantMessage(msg)).toBe(true);
    });

    it('returns false for user messages', () => {
      const msg: Message = { role: 'user', content: 'hello' };
      expect(isAssistantMessage(msg)).toBe(false);
    });

    it('detects tool_calls on assistant messages', () => {
      const msg: Message = {
        role: 'assistant',
        content: '',
        tool_calls: [{
          id: 'call_1',
          type: 'function',
          function: { name: 'ReadFile', arguments: '{"path":"/tmp/x"}' },
        }],
      };
      expect(isAssistantMessage(msg)).toBe(true);
      if (isAssistantMessage(msg)) {
        expect(msg.tool_calls).toHaveLength(1);
      }
    });
  });

  describe('isToolMessage', () => {
    it('returns true for tool messages', () => {
      const msg: Message = { role: 'tool', tool_call_id: 'call_1', content: 'result' };
      expect(isToolMessage(msg)).toBe(true);
    });

    it('returns false for system messages', () => {
      const msg: Message = { role: 'system', content: 'prompt' };
      expect(isToolMessage(msg)).toBe(false);
    });
  });
});
