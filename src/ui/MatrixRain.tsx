import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { theme } from './theme.js';

// Katakana Unicode block: U+30A0–U+30FF
export function randomKatakana(): string {
  const code = Math.floor(Math.random() * (0x30ff - 0x30a0 + 1)) + 0x30a0;
  return String.fromCharCode(code);
}

export interface RainColumn {
  position: number; // head row index (can be negative for staggered start)
  speed: number;    // rows advanced per tick (1–3)
  chars: string[];  // current character set for this column
}

const TRAIL_LENGTH = 6;

function randomChars(count: number): string[] {
  return Array.from({ length: count }, () => randomKatakana());
}

export function createRainState(columns: number, rows: number): RainColumn[] {
  return Array.from({ length: columns }, () => ({
    position: -Math.floor(Math.random() * rows),  // staggered start
    speed: Math.floor(Math.random() * 3) + 1,      // 1–3
    chars: randomChars(TRAIL_LENGTH),
  }));
}

export function tickRain(state: RainColumn[], rows: number): RainColumn[] {
  return state.map((col) => {
    const nextPos = col.position + col.speed;
    // Wrap when the entire trail (head + trail) has passed the bottom
    if (nextPos - TRAIL_LENGTH > rows) {
      return {
        position: -Math.floor(Math.random() * rows),
        speed: Math.floor(Math.random() * 3) + 1,
        chars: randomChars(TRAIL_LENGTH),
      };
    }
    return {
      ...col,
      position: nextPos,
      chars: randomChars(TRAIL_LENGTH),
    };
  });
}

interface MatrixRainProps {
  columns: number;
  rows: number;
  active: boolean;
  onComplete?: () => void;
  duration?: number;
}

export function MatrixRain({ columns, rows, active, onComplete, duration }: MatrixRainProps) {
  const [rainState, setRainState] = useState<RainColumn[]>(() =>
    createRainState(columns, rows)
  );

  // Tick animation
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setRainState((prev) => tickRain(prev, rows));
    }, 100);
    return () => clearInterval(interval);
  }, [active, rows]);

  // Duration-based completion callback
  useEffect(() => {
    if (!active || !onComplete || duration === undefined) return;
    const timeout = setTimeout(() => {
      onComplete();
    }, duration);
    return () => clearTimeout(timeout);
  }, [active, onComplete, duration]);

  // Build a 2D grid: rows x columns
  const grid: string[][] = Array.from({ length: rows }, () =>
    Array.from({ length: columns }, () => ' ')
  );

  // Color grid: 'head' | 'near' | 'trail' | 'blank'
  const colorGrid: Array<Array<'head' | 'near' | 'trail' | 'blank'>> = Array.from(
    { length: rows },
    () => Array.from({ length: columns }, () => 'blank' as const)
  );

  for (let col = 0; col < columns; col++) {
    const column = rainState[col];
    if (!column) continue;
    const head = column.position;

    for (let t = 0; t < TRAIL_LENGTH; t++) {
      const row = head - t;
      if (row < 0 || row >= rows) continue;
      const ch = column.chars[t] ?? randomKatakana();
      grid[row][col] = ch;
      if (t === 0) {
        colorGrid[row][col] = 'head';
      } else if (t <= 2) {
        colorGrid[row][col] = 'near';
      } else {
        colorGrid[row][col] = 'trail';
      }
    }
  }

  return (
    <Box flexDirection="column">
      {grid.map((rowChars, rowIndex) => (
        <Text key={rowIndex}>
          {rowChars.map((ch, colIndex) => {
            const kind = colorGrid[rowIndex][colIndex];
            if (kind === 'head') return theme.primary(ch);
            if (kind === 'near') return theme.secondary(ch);
            if (kind === 'trail') return theme.dim(ch);
            return ' ';
          }).join('')}
        </Text>
      ))}
    </Box>
  );
}
