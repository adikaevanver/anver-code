import { describe, it, expect } from 'vitest';
import { LOGO_LINES, decodeLogo } from '../../src/ui/StartupSplash.js';

describe('LOGO_LINES', () => {
  it('is an array of strings', () => {
    expect(Array.isArray(LOGO_LINES)).toBe(true);
    expect(LOGO_LINES.length).toBeGreaterThan(0);
    for (const line of LOGO_LINES) {
      expect(typeof line).toBe('string');
    }
  });
});

describe('decodeLogo', () => {
  it('returns fully decoded logo when progress is 1', () => {
    const result = decodeLogo(1.0);
    for (let row = 0; row < LOGO_LINES.length; row++) {
      expect(result[row]).toBe(LOGO_LINES[row]);
    }
  });

  it('returns all random characters when progress is 0', () => {
    const result = decodeLogo(0);
    let diffCount = 0;
    for (let row = 0; row < LOGO_LINES.length; row++) {
      for (let col = 0; col < LOGO_LINES[row].length; col++) {
        if (LOGO_LINES[row][col] !== ' ' && result[row][col] !== LOGO_LINES[row][col]) {
          diffCount++;
        }
      }
    }
    expect(diffCount).toBeGreaterThan(0);
  });

  it('preserves spaces at all progress levels', () => {
    const result = decodeLogo(0.5);
    for (let row = 0; row < LOGO_LINES.length; row++) {
      for (let col = 0; col < LOGO_LINES[row].length; col++) {
        if (LOGO_LINES[row][col] === ' ') {
          expect(result[row][col]).toBe(' ');
        }
      }
    }
  });
});
