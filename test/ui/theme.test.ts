import { describe, it, expect } from 'vitest';
import { theme } from '../../src/ui/theme.js';

describe('theme', () => {
  const sampleText = 'hello world';

  it('exports a primary function that returns a string containing the input', () => {
    expect(typeof theme.primary).toBe('function');
    expect(theme.primary(sampleText)).toContain(sampleText);
  });

  it('exports a secondary function that returns a string containing the input', () => {
    expect(typeof theme.secondary).toBe('function');
    expect(theme.secondary(sampleText)).toContain(sampleText);
  });

  it('exports a dim function that returns a string containing the input', () => {
    expect(typeof theme.dim).toBe('function');
    expect(theme.dim(sampleText)).toContain(sampleText);
  });

  it('exports an error function that returns a string containing the input', () => {
    expect(typeof theme.error).toBe('function');
    expect(theme.error(sampleText)).toContain(sampleText);
  });

  it('exports a warning function that returns a string containing the input', () => {
    expect(typeof theme.warning).toBe('function');
    expect(theme.warning(sampleText)).toContain(sampleText);
  });

  it('exports an accent function that returns a string containing the input', () => {
    expect(typeof theme.accent).toBe('function');
    expect(theme.accent(sampleText)).toContain(sampleText);
  });

  it('exports a muted function that returns a string containing the input', () => {
    expect(typeof theme.muted).toBe('function');
    expect(theme.muted(sampleText)).toContain(sampleText);
  });

  it('exports a spinner function that returns a string containing the input', () => {
    expect(typeof theme.spinner).toBe('function');
    expect(theme.spinner(sampleText)).toContain(sampleText);
  });
});
