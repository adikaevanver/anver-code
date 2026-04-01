import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { MessageList } from '../../src/ui/MessageList.js';
import type { Message } from '../../src/core/types.js';

describe('MessageList', () => {
  it('renders user messages', () => {
    const messages: Message[] = [
      { role: 'user', content: 'Hello there' },
    ];
    const { lastFrame } = render(<MessageList messages={messages} />);
    expect(lastFrame()).toContain('Hello there');
  });

  it('renders assistant messages', () => {
    const messages: Message[] = [
      { role: 'assistant', content: 'Hi! How can I help?' },
    ];
    const { lastFrame } = render(<MessageList messages={messages} />);
    expect(lastFrame()).toContain('Hi! How can I help?');
  });

  it('renders tool result messages', () => {
    const messages: Message[] = [
      { role: 'tool', tool_call_id: 'call_1', content: 'file contents here' },
    ];
    const { lastFrame } = render(<MessageList messages={messages} />);
    expect(lastFrame()).toContain('file contents here');
  });

  it('skips system messages', () => {
    const messages: Message[] = [
      { role: 'system', content: 'secret system prompt' },
      { role: 'user', content: 'hello' },
    ];
    const { lastFrame } = render(<MessageList messages={messages} />);
    expect(lastFrame()).not.toContain('secret system prompt');
    expect(lastFrame()).toContain('hello');
  });
});
