import { describe, it, expect } from 'vitest';
import { formatUserMessage, formatAssistantMessage, formatToolResult } from '../../src/ui/MessageList.js';

describe('formatUserMessage', () => {
  it('wraps text in box-drawing with [YOU] label', () => {
    const result = formatUserMessage('hello world');
    expect(result).toContain('[YOU]');
    expect(result).toContain('hello world');
    expect(result).toContain('┌');
    expect(result).toContain('└');
  });
});

describe('formatAssistantMessage', () => {
  it('wraps text in box-drawing with [ANVER] label', () => {
    const result = formatAssistantMessage('I will help');
    expect(result).toContain('[ANVER]');
    expect(result).toContain('I will help');
    expect(result).toContain('┌');
    expect(result).toContain('└');
  });

  it('strips markdown', () => {
    const result = formatAssistantMessage('**bold** and *italic*');
    expect(result).toContain('bold and italic');
    expect(result).not.toContain('**');
    expect(result).not.toContain('*italic*');
  });
});

describe('formatToolResult', () => {
  it('formats success with checkmark', () => {
    const result = formatToolResult('read_file', false);
    expect(result).toContain('✓');
    expect(result).toContain('read_file');
  });

  it('formats error with X', () => {
    const result = formatToolResult('bash', true);
    expect(result).toContain('✗');
    expect(result).toContain('bash');
  });
});
