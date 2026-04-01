import { describe, it, expect } from 'vitest';
import { Conversation } from '../../src/core/conversation.js';
import type { Message } from '../../src/core/types.js';

describe('Conversation', () => {
  it('starts with a system message', () => {
    const conv = new Conversation('You are helpful', 'test-model');
    const messages = conv.getMessages();
    expect(messages.length).toBe(1);
    expect(messages[0].role).toBe('system');
  });

  it('adds user messages', () => {
    const conv = new Conversation('system', 'model');
    conv.addUserMessage('hello');
    const messages = conv.getMessages();
    expect(messages.length).toBe(2);
    expect(messages[1]).toEqual({ role: 'user', content: 'hello' });
  });

  it('adds assistant messages', () => {
    const conv = new Conversation('system', 'model');
    conv.addAssistantMessage('hi there', undefined);
    expect(conv.getMessages().length).toBe(2);
    expect(conv.getMessages()[1].role).toBe('assistant');
  });

  it('adds tool results', () => {
    const conv = new Conversation('system', 'model');
    conv.addToolResult('call_1', 'result text');
    const last = conv.getMessages()[conv.getMessages().length - 1];
    expect(last.role).toBe('tool');
  });

  it('tracks estimated token count', () => {
    const conv = new Conversation('You are a helpful assistant', 'model');
    conv.addUserMessage('hello world');
    expect(conv.estimatedTokens()).toBeGreaterThan(0);
  });

  it('exports to SessionData', () => {
    const conv = new Conversation('system', 'test-model');
    conv.addUserMessage('hi');
    const session = conv.toSessionData('/tmp');
    expect(session.model).toBe('test-model');
    expect(session.messages.length).toBe(2);
    expect(session.cwd).toBe('/tmp');
    expect(session.id).toBeTruthy();
  });

  it('restores from SessionData', () => {
    const conv = new Conversation('system', 'test-model');
    conv.addUserMessage('hi');
    conv.addAssistantMessage('hello', undefined);
    const data = conv.toSessionData('/tmp');

    const restored = Conversation.fromSessionData(data);
    expect(restored.getMessages().length).toBe(3);
  });
});
