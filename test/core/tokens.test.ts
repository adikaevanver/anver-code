import { describe, it, expect } from 'vitest';
import { estimateTokens, estimateMessagesTokens } from '../../src/utils/tokens.js';
import type { Message } from '../../src/core/types.js';

describe('tokens', () => {
  describe('estimateTokens', () => {
    it('estimates tokens from word count', () => {
      const text = 'hello world this is a test';
      // 6 words * 1.3 ≈ 8
      expect(estimateTokens(text)).toBeGreaterThanOrEqual(7);
      expect(estimateTokens(text)).toBeLessThanOrEqual(9);
    });

    it('returns 0 for empty string', () => {
      expect(estimateTokens('')).toBe(0);
    });

    it('handles code with special characters', () => {
      const code = 'const x = () => { return "hello"; };';
      expect(estimateTokens(code)).toBeGreaterThan(0);
    });
  });

  describe('estimateMessagesTokens', () => {
    it('sums tokens across messages', () => {
      const messages: Message[] = [
        { role: 'system', content: 'You are a helpful assistant' },
        { role: 'user', content: 'Hello world' },
      ];
      const total = estimateMessagesTokens(messages);
      expect(total).toBeGreaterThan(0);
      expect(total).toBe(
        estimateTokens('You are a helpful assistant') + estimateTokens('Hello world')
      );
    });
  });
});
