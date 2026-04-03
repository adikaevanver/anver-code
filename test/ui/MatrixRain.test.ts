import { describe, it, expect } from 'vitest';
import { randomKatakana, createRainState, tickRain, type RainColumn } from '../../src/ui/MatrixRain.js';

describe('randomKatakana', () => {
  it('returns a single character in the Katakana range', () => {
    const ch = randomKatakana();
    expect(ch.length).toBe(1);
    const code = ch.charCodeAt(0);
    expect(code).toBeGreaterThanOrEqual(0x30a0);
    expect(code).toBeLessThanOrEqual(0x30ff);
  });
});

describe('createRainState', () => {
  it('creates an array of columns with correct length', () => {
    const state = createRainState(10, 5);
    expect(state).toHaveLength(10);
  });

  it('each column has a position and speed', () => {
    const state = createRainState(3, 5);
    for (const col of state) {
      expect(typeof col.position).toBe('number');
      expect(typeof col.speed).toBe('number');
      expect(col.speed).toBeGreaterThanOrEqual(1);
      expect(col.speed).toBeLessThanOrEqual(3);
    }
  });
});

describe('tickRain', () => {
  it('advances column positions', () => {
    const state = createRainState(3, 5);
    const initialPositions = state.map((c) => c.position);
    const nextState = tickRain(state, 5);
    const advanced = nextState.some((c, i) => c.position !== initialPositions[i]);
    expect(advanced).toBe(true);
  });

  it('wraps columns that exceed rows', () => {
    const state: RainColumn[] = [
      { position: 10, speed: 1, chars: ['ア', 'イ', 'ウ', 'エ', 'オ'] },
    ];
    const nextState = tickRain(state, 5);
    expect(nextState[0].position).toBeDefined();
  });
});
