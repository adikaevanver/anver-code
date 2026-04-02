import { describe, it, expect } from 'vitest';
import { isPromptSkill } from '../../src/skills/types.js';
import type { PromptSkill } from '../../src/skills/types.js';

describe('Skill Types', () => {
  it('isPromptSkill returns true for valid PromptSkill', () => {
    const skill: PromptSkill = {
      name: 'commit',
      description: 'Create a git commit',
      prompt: 'Analyze staged changes and commit.',
      source: 'global',
    };
    expect(isPromptSkill(skill)).toBe(true);
  });

  it('isPromptSkill returns false for objects missing fields', () => {
    expect(isPromptSkill({ name: 'commit' })).toBe(false);
    expect(isPromptSkill(null)).toBe(false);
    expect(isPromptSkill('string')).toBe(false);
  });

  it('isPromptSkill returns false for wrong source value', () => {
    expect(
      isPromptSkill({
        name: 'x',
        description: 'x',
        prompt: 'x',
        source: 'unknown',
      }),
    ).toBe(false);
  });
});
