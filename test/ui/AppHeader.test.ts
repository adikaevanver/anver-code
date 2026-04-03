import { describe, it, expect } from 'vitest';
import { formatHeader } from '../../src/ui/AppHeader.js';

describe('formatHeader', () => {
  it('includes ANVER CODE', () => {
    const result = formatHeader('qwen3.6-plus', 0);
    expect(result).toContain('ANVER CODE');
  });

  it('includes model name', () => {
    const result = formatHeader('qwen3.6-plus', 0);
    expect(result).toContain('qwen3.6-plus');
  });

  it('formats token count in k', () => {
    const result = formatHeader('qwen3.6-plus', 1500);
    expect(result).toContain('1.5k');
  });

  it('shows raw count below 1000', () => {
    const result = formatHeader('qwen3.6-plus', 500);
    expect(result).toContain('500');
  });
});
