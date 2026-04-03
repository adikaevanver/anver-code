# Matrix UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Anver Code's terminal UI into a full Matrix-themed experience with falling Katakana rain, cinematic startup splash, green-on-black palette, and box-drawing borders on every component.

**Architecture:** Pure React Ink — all animation via state updates and `setInterval`, no raw ANSI. A shared `MatrixRain` component powers both the full-screen startup splash and the compact thinking indicator. Every existing UI component gets restyled with the Matrix green palette and box-drawing characters.

**Tech Stack:** React 19, Ink 6, chalk 5 (already installed — no new dependencies)

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/ui/theme.ts` | Modify | Matrix green color palette (chalk hex colors) |
| `src/ui/MatrixRain.tsx` | Create | Shared Katakana rain engine component |
| `src/ui/StartupSplash.tsx` | Create | Cinematic splash with logo decode effect |
| `src/ui/AppHeader.tsx` | Create | Persistent header bar with model name + token count |
| `src/ui/MessageList.tsx` | Modify | Box-drawing borders, role labels `[YOU]`/`[ANVER]`, green colors |
| `src/ui/InputPrompt.tsx` | Modify | `[anver]>>` prompt with blinking cursor |
| `src/ui/Spinner.tsx` | Modify | Compact MatrixRain + status line (replaces braille spinner) |
| `src/ui/PermissionPrompt.tsx` | Modify | Double-line box `ACCESS REQUESTED` styling |
| `src/ui/ToolResult.tsx` | Modify | Animated execution bar + compact completion line |
| `src/ui/App.tsx` | Modify | Splash state, header, skip logic, wire new components |
| `src/commands/chat.ts` | Modify | Pass `initialPrompt` and `resume` flags to App for splash skip |
| `test/ui/theme.test.ts` | Create | Tests for theme palette |
| `test/ui/MatrixRain.test.ts` | Create | Tests for rain engine logic |
| `test/ui/StartupSplash.test.ts` | Create | Tests for splash lifecycle |
| `test/ui/AppHeader.test.ts` | Create | Tests for header rendering |
| `test/ui/MessageList.test.ts` | Create | Tests for message box rendering |
| `test/ui/InputPrompt.test.ts` | Create | Tests for prompt rendering + blink |
| `test/ui/PermissionPrompt.test.ts` | Create | Tests for permission box rendering |

---

### Task 1: Matrix Color Theme

**Files:**
- Modify: `src/ui/theme.ts`
- Create: `test/ui/theme.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/ui/theme.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { theme } from '../../src/ui/theme.js';

describe('theme', () => {
  it('exports all required color functions', () => {
    expect(typeof theme.primary).toBe('function');
    expect(typeof theme.secondary).toBe('function');
    expect(typeof theme.dim).toBe('function');
    expect(typeof theme.error).toBe('function');
    expect(typeof theme.warning).toBe('function');
    expect(typeof theme.accent).toBe('function');
    expect(typeof theme.muted).toBe('function');
    expect(typeof theme.spinner).toBe('function');
  });

  it('primary returns a string', () => {
    const result = theme.primary('test');
    expect(typeof result).toBe('string');
    expect(result).toContain('test');
  });

  it('error returns a string', () => {
    const result = theme.error('fail');
    expect(typeof result).toBe('string');
    expect(result).toContain('fail');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/ui/theme.test.ts`
Expected: FAIL — `theme.primary` is not a function (current theme has `theme.user`, `theme.assistant`, etc.)

- [ ] **Step 3: Replace theme with Matrix palette**

Replace the entire content of `src/ui/theme.ts`:

```typescript
import chalk from 'chalk';

export const theme = {
  // Matrix green spectrum
  primary: chalk.hex('#00ff41'),        // Bright green — main text, accents
  secondary: chalk.hex('#008f11'),      // Medium green — assistant text, tool names
  dim: chalk.hex('#003b00'),            // Dark green — borders, muted
  muted: chalk.hex('#003b00'),          // Alias for dim

  // Semantic colors
  error: chalk.hex('#ff0000'),          // Red — errors
  warning: chalk.hex('#adff2f'),        // Yellow-green — permissions
  accent: chalk.hex('#00ff41'),         // Same as primary — labels, highlights
  success: chalk.hex('#00ff41'),        // Bright green — checkmarks

  // Component-specific (kept for backward compat during migration)
  user: chalk.hex('#00ff41').bold,      // User message text
  assistant: chalk.hex('#008f11'),      // Assistant message text
  toolName: chalk.hex('#008f11'),       // Tool name in results
  toolResult: chalk.hex('#003b00'),     // Tool result text
  spinner: chalk.hex('#00ff41'),        // Spinner character
  border: chalk.hex('#003b00'),         // Box-drawing borders
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/ui/theme.test.ts`
Expected: PASS

- [ ] **Step 5: Run all existing tests to verify no regressions**

Run: `npx vitest run`
Expected: All existing tests still pass (theme is only imported by UI components which have no tests yet)

- [ ] **Step 6: Commit**

```bash
git add src/ui/theme.ts test/ui/theme.test.ts
git commit -m "feat(ui): replace color theme with Matrix green palette"
```

---

### Task 2: Matrix Rain Engine

**Files:**
- Create: `src/ui/MatrixRain.tsx`
- Create: `test/ui/MatrixRain.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/ui/MatrixRain.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  randomKatakana,
  createRainState,
  tickRain,
  type RainColumn,
} from '../../src/ui/MatrixRain.js';

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
    // At least one column should have advanced
    const advanced = nextState.some(
      (c, i) => c.position !== initialPositions[i],
    );
    expect(advanced).toBe(true);
  });

  it('wraps columns that exceed rows', () => {
    const state: RainColumn[] = [
      { position: 10, speed: 1, chars: ['ア', 'イ', 'ウ', 'エ', 'オ'] },
    ];
    const nextState = tickRain(state, 5);
    // Position should wrap or reset since 10 > 5 + trail
    expect(nextState[0].position).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/ui/MatrixRain.test.ts`
Expected: FAIL — module `../../src/ui/MatrixRain.js` not found

- [ ] **Step 3: Implement MatrixRain**

Create `src/ui/MatrixRain.tsx`:

```tsx
import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { theme } from './theme.js';

// Katakana Unicode range: U+30A0 to U+30FF
const KATAKANA_START = 0x30a0;
const KATAKANA_END = 0x30ff;
const TRAIL_LENGTH = 6;

export function randomKatakana(): string {
  const code =
    KATAKANA_START + Math.floor(Math.random() * (KATAKANA_END - KATAKANA_START + 1));
  return String.fromCharCode(code);
}

export interface RainColumn {
  position: number;
  speed: number;
  chars: string[];
}

export function createRainState(columns: number, rows: number): RainColumn[] {
  return Array.from({ length: columns }, () => ({
    position: -Math.floor(Math.random() * rows * 2), // Stagger start
    speed: 1 + Math.floor(Math.random() * 3),        // 1-3 rows per tick
    chars: Array.from({ length: TRAIL_LENGTH }, () => randomKatakana()),
  }));
}

export function tickRain(state: RainColumn[], rows: number): RainColumn[] {
  return state.map((col) => {
    const newPosition = col.position + col.speed;
    // Wrap around when the entire trail has gone past the bottom
    const resetPosition =
      newPosition > rows + TRAIL_LENGTH
        ? -Math.floor(Math.random() * rows)
        : newPosition;
    return {
      position: resetPosition,
      speed: col.speed,
      chars: col.chars.map(() => randomKatakana()), // Refresh chars each tick
    };
  });
}

/**
 * Build a 2D grid of characters + color intensities for rendering.
 * Returns rows × columns array of { char, intensity } where intensity
 * 0 = blank, 1 = dim, 2 = medium, 3 = bright (head).
 */
function buildGrid(
  state: RainColumn[],
  columns: number,
  rows: number,
): { char: string; intensity: number }[][] {
  const grid: { char: string; intensity: number }[][] = Array.from(
    { length: rows },
    () => Array.from({ length: columns }, () => ({ char: ' ', intensity: 0 })),
  );

  for (let col = 0; col < state.length && col < columns; col++) {
    const { position, chars } = state[col];
    for (let t = 0; t < TRAIL_LENGTH; t++) {
      const row = position - t;
      if (row >= 0 && row < rows) {
        const intensity = t === 0 ? 3 : t <= 2 ? 2 : 1;
        grid[row][col] = { char: chars[t % chars.length], intensity };
      }
    }
  }

  return grid;
}

interface MatrixRainProps {
  columns: number;
  rows: number;
  active: boolean;
  onComplete?: () => void;
  /** Duration in ms after which onComplete fires (optional) */
  duration?: number;
}

export function MatrixRain({
  columns,
  rows,
  active,
  onComplete,
  duration,
}: MatrixRainProps) {
  const [state, setState] = useState(() => createRainState(columns, rows));

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setState((prev) => tickRain(prev, rows));
    }, 100);
    return () => clearInterval(interval);
  }, [active, rows]);

  useEffect(() => {
    if (!active || !duration || !onComplete) return;
    const timer = setTimeout(onComplete, duration);
    return () => clearTimeout(timer);
  }, [active, duration, onComplete]);

  const grid = buildGrid(state, columns, rows);

  return (
    <Box flexDirection="column">
      {grid.map((row, rowIdx) => (
        <Text key={rowIdx}>
          {row.map((cell, colIdx) => {
            if (cell.intensity === 0) return ' ';
            const color =
              cell.intensity === 3
                ? theme.primary
                : cell.intensity === 2
                  ? theme.secondary
                  : theme.dim;
            return (
              <Text key={colIdx}>
                {color(cell.char)}
              </Text>
            );
          })}
        </Text>
      ))}
    </Box>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/ui/MatrixRain.test.ts`
Expected: PASS

- [ ] **Step 5: Run all tests**

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add src/ui/MatrixRain.tsx test/ui/MatrixRain.test.ts
git commit -m "feat(ui): add Matrix rain engine component with Katakana characters"
```

---

### Task 3: Startup Splash Screen

**Files:**
- Create: `src/ui/StartupSplash.tsx`
- Create: `test/ui/StartupSplash.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/ui/StartupSplash.test.ts`:

```typescript
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
    // At progress 1, every character should match the original
    for (let row = 0; row < LOGO_LINES.length; row++) {
      expect(result[row]).toBe(LOGO_LINES[row]);
    }
  });

  it('returns all random characters when progress is 0', () => {
    const result = decodeLogo(0);
    // At progress 0, non-space characters should differ from original
    // (probabilistically — run a few times to be sure)
    let diffCount = 0;
    for (let row = 0; row < LOGO_LINES.length; row++) {
      for (let col = 0; col < LOGO_LINES[row].length; col++) {
        if (LOGO_LINES[row][col] !== ' ' && result[row][col] !== LOGO_LINES[row][col]) {
          diffCount++;
        }
      }
    }
    // With random katakana, virtually all non-space chars should differ
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/ui/StartupSplash.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement StartupSplash**

Create `src/ui/StartupSplash.tsx`:

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { MatrixRain } from './MatrixRain.js';
import { randomKatakana } from './MatrixRain.js';
import { theme } from './theme.js';

export const LOGO_LINES: string[] = [
  ' █████╗ ███╗   ██╗██╗   ██╗███████╗██████╗ ',
  '██╔══██╗████╗  ██║██║   ██║██╔════╝██╔══██╗',
  '███████║██╔██╗ ██║██║   ██║█████╗  ██████╔╝',
  '██╔══██║██║╚██╗██║╚██╗ ██╔╝██╔══╝  ██╔══██╗',
  '██║  ██║██║ ╚████║ ╚████╔╝ ███████╗██║  ██║',
  '╚═╝  ╚═╝╚═╝  ╚═══╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝',
];

/**
 * Decode the logo at a given progress (0 = all random katakana, 1 = fully decoded).
 * Characters are decoded left-to-right with stagger based on column position.
 * Spaces are always preserved.
 */
export function decodeLogo(progress: number): string[] {
  const maxCol = Math.max(...LOGO_LINES.map((l) => l.length));
  const decodedUpTo = Math.floor(progress * maxCol);

  return LOGO_LINES.map((line) => {
    let result = '';
    for (let col = 0; col < line.length; col++) {
      if (line[col] === ' ') {
        result += ' ';
      } else if (col <= decodedUpTo) {
        result += line[col];
      } else {
        result += randomKatakana();
      }
    }
    return result;
  });
}

interface StartupSplashProps {
  model: string;
  onComplete: () => void;
}

export function StartupSplash({ model, onComplete }: StartupSplashProps) {
  const { stdout } = useStdout();
  const columns = stdout?.columns ?? 80;
  const rows = stdout?.rows ?? 24;

  const [elapsed, setElapsed] = useState(0);
  const [skipped, setSkipped] = useState(false);

  // Tick every 100ms
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 100);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Auto-complete after 3 seconds
  useEffect(() => {
    if (elapsed >= 3000 && !skipped) {
      onComplete();
    }
  }, [elapsed, skipped, onComplete]);

  // Any key skips
  useInput(
    useCallback(() => {
      if (!skipped) {
        setSkipped(true);
        onComplete();
      }
    }, [skipped, onComplete]),
  );

  // Phases: 0-2000ms = rain only, 2000-3000ms = logo decode
  const logoProgress = elapsed < 2000 ? 0 : Math.min((elapsed - 2000) / 1000, 1);
  const showLogo = elapsed >= 1500; // Start fading in at 1.5s
  const decodedLines = showLogo ? decodeLogo(logoProgress) : [];

  // Center the logo vertically and horizontally
  const logoWidth = Math.max(...LOGO_LINES.map((l) => l.length));
  const leftPad = Math.max(0, Math.floor((columns - logoWidth) / 2));
  const topPad = Math.max(0, Math.floor((rows - LOGO_LINES.length - 4) / 2));

  return (
    <Box flexDirection="column" height={rows}>
      {/* Background rain */}
      <Box position="absolute" width={columns} height={rows}>
        <MatrixRain columns={columns} rows={rows} active={!skipped} />
      </Box>

      {/* Logo overlay */}
      {showLogo && (
        <Box flexDirection="column" marginTop={topPad} marginLeft={leftPad}>
          {decodedLines.map((line, idx) => (
            <Text key={idx}>{theme.primary(line)}</Text>
          ))}
          <Text> </Text>
          <Text>{theme.secondary(`  ${model}`)}</Text>
          <Text> </Text>
          <Text>{theme.dim('  press any key to continue...')}</Text>
        </Box>
      )}
    </Box>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/ui/StartupSplash.test.ts`
Expected: PASS

- [ ] **Step 5: Run all tests**

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add src/ui/StartupSplash.tsx test/ui/StartupSplash.test.ts
git commit -m "feat(ui): add cinematic Matrix startup splash with logo decode"
```

---

### Task 4: App Header

**Files:**
- Create: `src/ui/AppHeader.tsx`
- Create: `test/ui/AppHeader.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/ui/AppHeader.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/ui/AppHeader.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement AppHeader**

Create `src/ui/AppHeader.tsx`:

```tsx
import React from 'react';
import { Box, Text } from 'ink';
import { theme } from './theme.js';

function formatTokens(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return String(count);
}

/**
 * Pure function for testing — builds the header string.
 */
export function formatHeader(model: string, tokenCount: number): string {
  const tokens = formatTokens(tokenCount);
  return `╸ANVER CODE╺━━━━━━━━━━━━━━━━━━━━ ${model} ━━ tokens: ${tokens}`;
}

interface AppHeaderProps {
  model: string;
  tokenCount: number;
}

export function AppHeader({ model, tokenCount }: AppHeaderProps) {
  const tokens = formatTokens(tokenCount);

  return (
    <Box marginBottom={1}>
      <Text>
        {theme.primary('╸ANVER CODE╺')}
        {theme.dim('━━━━━━━━━━━━━━━━━━━━ ')}
        {theme.secondary(model)}
        {theme.dim(' ━━ tokens: ')}
        {theme.secondary(tokens)}
      </Text>
    </Box>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/ui/AppHeader.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/AppHeader.tsx test/ui/AppHeader.test.ts
git commit -m "feat(ui): add persistent Matrix-styled app header with token count"
```

---

### Task 5: Redesign MessageList

**Files:**
- Modify: `src/ui/MessageList.tsx`
- Create: `test/ui/MessageList.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/ui/MessageList.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/ui/MessageList.test.ts`
Expected: FAIL — named exports `formatUserMessage` etc. not found

- [ ] **Step 3: Rewrite MessageList with Matrix styling**

Replace the entire content of `src/ui/MessageList.tsx`:

```tsx
import React from 'react';
import { Box, Text } from 'ink';
import type { Message } from '../core/types.js';
import { theme } from './theme.js';

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1');
}

const BOX_WIDTH = 40;

/**
 * Format a user message with box-drawing and [YOU] label.
 * Exported for testing.
 */
export function formatUserMessage(content: string): string {
  const lines = content.split('\n');
  const topLine = `┌─[YOU]${'─'.repeat(Math.max(0, BOX_WIDTH - 7))}`;
  const bottomLine = `└${'─'.repeat(BOX_WIDTH - 1)}`;
  const bodyLines = lines.map((l) => `│ ${l}`);
  return [topLine, ...bodyLines, bottomLine].join('\n');
}

/**
 * Format an assistant message with box-drawing and [ANVER] label.
 * Exported for testing.
 */
export function formatAssistantMessage(content: string): string {
  const stripped = stripMarkdown(content);
  const lines = stripped.split('\n');
  const topLine = `┌─[ANVER]${'─'.repeat(Math.max(0, BOX_WIDTH - 9))}`;
  const bottomLine = `└${'─'.repeat(BOX_WIDTH - 1)}`;
  const bodyLines = lines.map((l) => `│ ${l}`);
  return [topLine, ...bodyLines, bottomLine].join('\n');
}

/**
 * Format a tool result as a compact one-liner.
 * Exported for testing.
 */
export function formatToolResult(toolName: string, isError: boolean): string {
  const icon = isError ? '✗' : '✓';
  return ` ${icon} ${toolName}`;
}

interface MessageListProps {
  messages: Message[];
  streamingContent?: string;
}

export function MessageList({ messages, streamingContent }: MessageListProps) {
  const visible = messages.filter((m) => m.role !== 'system');

  return (
    <Box flexDirection="column">
      {visible.map((message, index) => {
        if (message.role === 'user') {
          const formatted = formatUserMessage(message.content);
          const lines = formatted.split('\n');
          return (
            <Box key={index} flexDirection="column" marginBottom={1}>
              {lines.map((line, i) => {
                if (i === 0) {
                  // Top border with label
                  const labelEnd = line.indexOf(']') + 1;
                  return (
                    <Text key={i}>
                      {theme.dim(line.slice(0, 2))}
                      {theme.primary(line.slice(2, labelEnd))}
                      {theme.dim(line.slice(labelEnd))}
                    </Text>
                  );
                }
                if (line.startsWith('└')) {
                  return <Text key={i}>{theme.dim(line)}</Text>;
                }
                return (
                  <Text key={i}>
                    {theme.dim('│ ')}
                    {theme.user(line.slice(2))}
                  </Text>
                );
              })}
            </Box>
          );
        }

        if (message.role === 'assistant') {
          const formatted = formatAssistantMessage(message.content);
          const lines = formatted.split('\n');
          return (
            <Box key={index} flexDirection="column" marginBottom={1}>
              {lines.map((line, i) => {
                if (i === 0) {
                  const labelEnd = line.indexOf(']') + 1;
                  return (
                    <Text key={i}>
                      {theme.dim(line.slice(0, 2))}
                      {theme.primary(line.slice(2, labelEnd))}
                      {theme.dim(line.slice(labelEnd))}
                    </Text>
                  );
                }
                if (line.startsWith('└')) {
                  return <Text key={i}>{theme.dim(line)}</Text>;
                }
                return (
                  <Text key={i}>
                    {theme.dim('│ ')}
                    {theme.assistant(line.slice(2))}
                  </Text>
                );
              })}
            </Box>
          );
        }

        if (message.role === 'tool') {
          const truncated =
            message.content.length > 200
              ? message.content.slice(0, 200) + '…'
              : message.content;
          const isError = message.content.startsWith('Error:');
          return (
            <Box key={index}>
              <Text>
                {isError ? theme.error(' ✗ ') : theme.success(' ✓ ')}
                {theme.toolName(truncated)}
              </Text>
            </Box>
          );
        }

        return null;
      })}

      {streamingContent !== undefined && streamingContent !== '' && (
        <Box flexDirection="column" marginBottom={1}>
          {(() => {
            const formatted = formatAssistantMessage(streamingContent);
            const lines = formatted.split('\n');
            return lines.map((line, i) => {
              if (i === 0) {
                const labelEnd = line.indexOf(']') + 1;
                return (
                  <Text key={i}>
                    {theme.dim(line.slice(0, 2))}
                    {theme.primary(line.slice(2, labelEnd))}
                    {theme.dim(line.slice(labelEnd))}
                  </Text>
                );
              }
              if (line.startsWith('└')) {
                return <Text key={i}>{theme.dim(line)}</Text>;
              }
              return (
                <Text key={i}>
                  {theme.dim('│ ')}
                  {theme.assistant(line.slice(2))}
                </Text>
              );
            });
          })()}
        </Box>
      )}
    </Box>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/ui/MessageList.test.ts`
Expected: PASS

- [ ] **Step 5: Run all tests**

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add src/ui/MessageList.tsx test/ui/MessageList.test.ts
git commit -m "feat(ui): restyle MessageList with Matrix box-drawing borders and role labels"
```

---

### Task 6: Redesign InputPrompt

**Files:**
- Modify: `src/ui/InputPrompt.tsx`
- Create: `test/ui/InputPrompt.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/ui/InputPrompt.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { InputPrompt } from '../../src/ui/InputPrompt.js';

describe('InputPrompt', () => {
  it('renders the [anver]>> prompt', () => {
    const { lastFrame } = render(
      React.createElement(InputPrompt, { onSubmit: () => {}, history: [] }),
    );
    const output = lastFrame();
    expect(output).toContain('[anver]');
    expect(output).toContain('>>');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/ui/InputPrompt.test.ts`
Expected: FAIL — output contains `> ` not `[anver]>>`

- [ ] **Step 3: Rewrite InputPrompt with Matrix styling**

Replace the entire content of `src/ui/InputPrompt.tsx`:

```tsx
import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { theme } from './theme.js';

interface InputPromptProps {
  onSubmit: (text: string) => void;
  history: string[];
}

export function InputPrompt({ onSubmit, history }: InputPromptProps) {
  const [input, setInput] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [cursorVisible, setCursorVisible] = useState(true);

  // Blink cursor every 500ms
  useEffect(() => {
    const interval = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useInput((ch, key) => {
    if (key.return) {
      if (input.trim()) {
        onSubmit(input.trim());
        setInput('');
        setHistoryIndex(-1);
      }
      return;
    }
    if (key.backspace || key.delete) {
      setInput((prev) => prev.slice(0, -1));
      return;
    }
    if (key.upArrow) {
      const newIndex = Math.min(historyIndex + 1, history.length - 1);
      setHistoryIndex(newIndex);
      if (newIndex >= 0 && newIndex < history.length) {
        setInput(history[history.length - 1 - newIndex]);
      }
      return;
    }
    if (key.downArrow) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      if (newIndex < 0) {
        setInput('');
      } else {
        setInput(history[history.length - 1 - newIndex]);
      }
      return;
    }
    if (ch && !key.ctrl && !key.meta) {
      setInput((prev) => prev + ch);
    }
  });

  return (
    <Box>
      <Text>
        {theme.dim('[anver]')}
        {theme.primary('>> ')}
        {theme.primary(input)}
        {cursorVisible ? theme.primary('█') : ' '}
      </Text>
    </Box>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/ui/InputPrompt.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/InputPrompt.tsx test/ui/InputPrompt.test.ts
git commit -m "feat(ui): restyle InputPrompt with [anver]>> prompt and blinking cursor"
```

---

### Task 7: Redesign Spinner (Thinking Indicator)

**Files:**
- Modify: `src/ui/Spinner.tsx`

- [ ] **Step 1: Rewrite Spinner with compact MatrixRain**

Replace the entire content of `src/ui/Spinner.tsx`:

```tsx
import React, { useState, useEffect } from 'react';
import { Box, Text, useStdout } from 'ink';
import { MatrixRain } from './MatrixRain.js';
import { theme } from './theme.js';

interface SpinnerProps {
  model: string;
  label?: string;
}

export function Spinner({ model, label }: SpinnerProps) {
  const { stdout } = useStdout();
  const columns = stdout?.columns ?? 80;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((e) => e + 100);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const seconds = (elapsed / 1000).toFixed(1);
  const displayLabel = label ?? 'Thinking';

  return (
    <Box flexDirection="column">
      <MatrixRain columns={columns} rows={3} active={true} />
      <Text>
        {theme.primary('⟩ ')}
        {theme.dim(`${displayLabel}... `)}
        {theme.primary(model)}
        {theme.dim(` (${seconds}s)`)}
      </Text>
    </Box>
  );
}
```

- [ ] **Step 2: Run all tests to verify no regressions**

Run: `npx vitest run`
Expected: All pass (Spinner has no dedicated tests, but theme imports must work)

- [ ] **Step 3: Commit**

```bash
git add src/ui/Spinner.tsx
git commit -m "feat(ui): replace braille spinner with compact Matrix rain thinking indicator"
```

---

### Task 8: Redesign PermissionPrompt

**Files:**
- Modify: `src/ui/PermissionPrompt.tsx`
- Create: `test/ui/PermissionPrompt.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/ui/PermissionPrompt.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { PermissionPrompt } from '../../src/ui/PermissionPrompt.js';

describe('PermissionPrompt', () => {
  it('renders ACCESS REQUESTED', () => {
    const { lastFrame } = render(
      React.createElement(PermissionPrompt, {
        toolName: 'write_file',
        args: { file_path: 'test.ts' },
        onApprove: () => {},
        onDeny: () => {},
        onAlwaysApprove: () => {},
      }),
    );
    const output = lastFrame();
    expect(output).toContain('ACCESS REQUESTED');
    expect(output).toContain('write_file');
  });

  it('shows approve/deny/always options', () => {
    const { lastFrame } = render(
      React.createElement(PermissionPrompt, {
        toolName: 'bash',
        args: { command: 'ls' },
        onApprove: () => {},
        onDeny: () => {},
        onAlwaysApprove: () => {},
      }),
    );
    const output = lastFrame();
    expect(output).toContain('APPROVE');
    expect(output).toContain('DENY');
    expect(output).toContain('ALWAYS');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/ui/PermissionPrompt.test.ts`
Expected: FAIL — output contains `⚠ Tool:` not `ACCESS REQUESTED`

- [ ] **Step 3: Rewrite PermissionPrompt with Matrix styling**

Replace the entire content of `src/ui/PermissionPrompt.tsx`:

```tsx
import React from 'react';
import { Box, Text, useInput } from 'ink';
import { theme } from './theme.js';

interface PermissionPromptProps {
  toolName: string;
  args: Record<string, unknown>;
  onApprove: () => void;
  onDeny: () => void;
  onAlwaysApprove: () => void;
}

export function PermissionPrompt({
  toolName,
  args,
  onApprove,
  onDeny,
  onAlwaysApprove,
}: PermissionPromptProps) {
  useInput((ch) => {
    if (ch === 'y' || ch === 'Y') onApprove();
    if (ch === 'n' || ch === 'N') onDeny();
    if (ch === 'a' || ch === 'A') onAlwaysApprove();
  });

  const argsStr = JSON.stringify(args, null, 2);
  const truncatedArgs =
    argsStr.length > 300 ? argsStr.slice(0, 300) + '...' : argsStr;
  const argLines = truncatedArgs.split('\n');

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text>{theme.warning('╔══[ACCESS REQUESTED]════════════════════╗')}</Text>
      <Text>
        {theme.warning('║')}
        {' Tool: '}
        {theme.primary(toolName)}
        {' '.repeat(Math.max(1, 32 - toolName.length))}
        {theme.warning('║')}
      </Text>
      {argLines.map((line, i) => (
        <Text key={i}>
          {theme.warning('║')}
          {' '}
          {theme.dim(line)}
          {' '.repeat(Math.max(1, 38 - line.length))}
          {theme.warning('║')}
        </Text>
      ))}
      <Text>{theme.warning('║                                        ║')}</Text>
      <Text>
        {theme.warning('║')}
        {'  '}
        {theme.primary('[Y]')}
        {' APPROVE  '}
        {theme.primary('[N]')}
        {' DENY  '}
        {theme.primary('[A]')}
        {' ALWAYS  '}
        {theme.warning('║')}
      </Text>
      <Text>{theme.warning('╚════════════════════════════════════════╝')}</Text>
    </Box>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/ui/PermissionPrompt.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/PermissionPrompt.tsx test/ui/PermissionPrompt.test.ts
git commit -m "feat(ui): restyle PermissionPrompt with Matrix ACCESS REQUESTED box"
```

---

### Task 9: Redesign ToolResult

**Files:**
- Modify: `src/ui/ToolResult.tsx`

- [ ] **Step 1: Rewrite ToolResult with animated execution bar**

Replace the entire content of `src/ui/ToolResult.tsx`:

```tsx
import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { theme } from './theme.js';

interface ToolResultProps {
  toolName: string;
  result: string;
  isError?: boolean;
}

/**
 * Compact tool result line (shown after tool completes).
 */
export function ToolResult({ toolName, result, isError }: ToolResultProps) {
  const maxLen = 60;
  const display =
    result.length > maxLen ? result.slice(0, maxLen) + '...' : result;
  const icon = isError ? '✗' : '✓';

  return (
    <Box marginBottom={0}>
      <Text>
        {isError ? theme.error(` ${icon} `) : theme.success(` ${icon} `)}
        {theme.toolName(toolName)}
        {' '}
        {theme.toolResult(display)}
      </Text>
    </Box>
  );
}

interface ToolRunningProps {
  toolName: string;
  args: Record<string, unknown>;
}

/**
 * Animated execution display (shown while tool is running).
 */
export function ToolRunning({ toolName, args }: ToolRunningProps) {
  const [barPos, setBarPos] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setBarPos((prev) => (prev + 1) % 7);
    }, 150);
    return () => clearInterval(interval);
  }, []);

  // Build indeterminate progress bar
  const barWidth = 10;
  const bar = Array.from({ length: barWidth }, (_, i) => {
    return i >= barPos && i < barPos + 3 ? '█' : '░';
  }).join('');

  // Extract a useful arg to display (file_path, command, pattern, etc.)
  const displayArg =
    (args.file_path as string) ??
    (args.command as string) ??
    (args.pattern as string) ??
    '';
  const truncArg =
    displayArg.length > 40 ? displayArg.slice(0, 40) + '...' : displayArg;

  return (
    <Box>
      <Text>
        {theme.primary(' ▶ ')}
        {theme.primary('EXECUTING ')}
        {theme.secondary(toolName)}
        {' '}
        {theme.primary(bar)}
        {' '}
        {theme.dim(truncArg)}
      </Text>
    </Box>
  );
}
```

- [ ] **Step 2: Run all tests to verify no regressions**

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 3: Commit**

```bash
git add src/ui/ToolResult.tsx
git commit -m "feat(ui): add animated Matrix tool execution bar and compact result display"
```

---

### Task 10: Wire Everything in App.tsx and chat.ts

**Files:**
- Modify: `src/ui/App.tsx`
- Modify: `src/commands/chat.ts`

- [ ] **Step 1: Update AppProps to include splash control flags**

In `src/commands/chat.ts`, pass `initialPrompt` and `resume` to `App`:

```typescript
// In chat.ts, update the render call to pass new props:
const { waitUntilExit } = render(
  React.createElement(App, {
    provider,
    tools: allTools,
    model,
    systemPrompt,
    initialConversation,
    autoApprove,
    cwd,
    promptSkills: loadedSkills.promptSkills,
    initialPrompt: initialPrompt,
    skipSplash: !!(options.resume || options.session || initialPrompt),
  }),
);

// Remove the ANVER_INITIAL_PROMPT env var hack:
// Delete these lines:
// if (initialPrompt) {
//   process.env.ANVER_INITIAL_PROMPT = initialPrompt;
// }
```

- [ ] **Step 2: Rewrite App.tsx with splash, header, ToolRunning, and token count**

Update `src/ui/App.tsx` — the changes are:

1. Add `skipSplash` and `initialPrompt` to `AppProps`
2. Add `showSplash` state (default: `!skipSplash`)
3. Add `tokenCount` state (incremented based on message content length as a rough estimate)
4. Import and render `StartupSplash`, `AppHeader`, `ToolRunning`
5. When `showSplash` is true, render `<StartupSplash>` instead of the main UI
6. Use `ToolRunning` in the `tool_running` state instead of Spinner
7. If `initialPrompt` is provided and splash is skipped, auto-submit it on mount

Full replacement for `src/ui/App.tsx`:

```tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import type { LLMProvider } from '../core/provider.js';
import type { BaseTool } from '../tools/BaseTool.js';
import type { PromptSkill } from '../skills/types.js';
import { Conversation } from '../core/conversation.js';
import { QueryEngine, type QueryEvent } from '../core/query.js';
import { MessageList } from './MessageList.js';
import { InputPrompt } from './InputPrompt.js';
import { PermissionPrompt } from './PermissionPrompt.js';
import { Spinner } from './Spinner.js';
import { StartupSplash } from './StartupSplash.js';
import { AppHeader } from './AppHeader.js';
import { ToolRunning } from './ToolResult.js';
import { saveSession } from '../utils/history.js';
import { loadSkills } from '../skills/loader.js';
import { WRITE_FILE_RESULT_PREFIX } from '../tools/WriteFile.js';
import { theme } from './theme.js';
import path from 'path';
import os from 'os';

export interface AppProps {
  provider: LLMProvider;
  tools: BaseTool<any, any>[];
  model: string;
  systemPrompt: string;
  initialConversation?: Conversation;
  autoApprove: string[];
  cwd: string;
  promptSkills: PromptSkill[];
  initialPrompt?: string;
  skipSplash?: boolean;
}

type AppState = 'idle' | 'streaming' | 'tool_pending' | 'tool_running';

interface PendingTool {
  toolName: string;
  args: Record<string, unknown>;
  toolCallId: string;
  approve: () => void;
  deny: () => void;
}

function isSkillsPath(filePath: string, cwd: string): boolean {
  const projectSkillsDir = path.join(cwd, '.anver-code', 'skills') + path.sep;
  const globalSkillsDir =
    path.join(
      process.env.ANVER_CODE_HOME ?? path.join(os.homedir(), '.anver-code'),
      'skills',
    ) + path.sep;
  return (
    filePath.startsWith(projectSkillsDir) ||
    filePath.startsWith(globalSkillsDir)
  );
}

export function App({
  provider,
  tools,
  model,
  systemPrompt,
  initialConversation,
  autoApprove,
  cwd,
  promptSkills,
  initialPrompt,
  skipSplash,
}: AppProps) {
  const { exit } = useApp();

  const conversationRef = useRef<Conversation>(
    initialConversation ?? new Conversation(systemPrompt, model),
  );

  const [showSplash, setShowSplash] = useState(!skipSplash);
  const [appState, setAppState] = useState<AppState>('idle');
  const [messages, setMessages] = useState(() =>
    conversationRef.current.getMessages(),
  );
  const [streamingContent, setStreamingContent] = useState('');
  const [pendingTool, setPendingTool] = useState<PendingTool | null>(null);
  const [runningToolName, setRunningToolName] = useState<string | null>(null);
  const [runningToolArgs, setRunningToolArgs] = useState<Record<string, unknown>>({});
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [helpVisible, setHelpVisible] = useState(false);
  const [currentSkills, setCurrentSkills] = useState(promptSkills);
  const [tokenCount, setTokenCount] = useState(0);

  const skillCommandsHelp =
    currentSkills.length > 0
      ? '\n\nSkill commands:\n' +
        currentSkills
          .map(
            (s) =>
              `  /${s.name}${' '.repeat(Math.max(1, 15 - s.name.length))}${s.description}`,
          )
          .join('\n')
      : '';

  const helpText = `Available commands:
  /exit          Exit the application
  /clear         Reset the conversation
  /help          Show this help message${skillCommandsHelp}

Tips:
  Up/Down arrows  Navigate input history
  Enter           Submit your message`;

  const permissionResolveRef = useRef<((approved: boolean) => void) | null>(
    null,
  );

  const syncMessages = useCallback(() => {
    setMessages(conversationRef.current.getMessages());
  }, []);

  // Rough token estimate: ~4 chars per token
  const estimateTokens = useCallback(() => {
    const msgs = conversationRef.current.getMessages();
    let chars = 0;
    for (const m of msgs) {
      chars += m.content.length;
    }
    setTokenCount(Math.round(chars / 4));
  }, []);

  const processQuery = useCallback(
    async (userText: string) => {
      const conversation = conversationRef.current;
      conversation.addUserMessage(userText);
      syncMessages();
      estimateTokens();

      setAppState('streaming');
      setStreamingContent('');

      const engine = new QueryEngine(provider, tools, model);
      let accumulatedStreaming = '';

      try {
        for await (const event of engine.run(conversation)) {
          switch (event.type) {
            case 'text': {
              accumulatedStreaming += event.content;
              setStreamingContent(accumulatedStreaming);
              break;
            }

            case 'tool_pending': {
              const isAutoApproved = autoApprove.includes(event.toolName);

              if (isAutoApproved) {
                event.approve();
              } else {
                await new Promise<void>((resolve) => {
                  setPendingTool({
                    toolName: event.toolName,
                    args: event.args,
                    toolCallId: event.toolCallId,
                    approve: () => {
                      event.approve();
                      resolve();
                    },
                    deny: () => {
                      event.deny();
                      resolve();
                    },
                  });
                  setAppState('tool_pending');
                });
                setPendingTool(null);
              }
              break;
            }

            case 'tool_running': {
              setStreamingContent('');
              accumulatedStreaming = '';
              setRunningToolName(event.toolName);
              // Store args from pending tool if available
              setAppState('tool_running');
              break;
            }

            case 'tool_result': {
              setRunningToolName(null);
              setRunningToolArgs({});
              syncMessages();
              estimateTokens();
              setAppState('streaming');

              if (
                event.toolName === 'write_file' &&
                event.result.startsWith(WRITE_FILE_RESULT_PREFIX)
              ) {
                const writtenPath = event.result.slice(
                  WRITE_FILE_RESULT_PREFIX.length,
                );
                if (isSkillsPath(writtenPath, cwd)) {
                  loadSkills(cwd)
                    .then((loaded) => {
                      setCurrentSkills(loaded.promptSkills);
                    })
                    .catch(() => {});
                }
              }
              break;
            }

            case 'tool_error': {
              setRunningToolName(null);
              setRunningToolArgs({});
              syncMessages();
              estimateTokens();
              setAppState('streaming');
              break;
            }

            case 'done': {
              setStreamingContent('');
              syncMessages();
              estimateTokens();
              setAppState('idle');

              try {
                saveSession(conversation.toSessionData(cwd));
              } catch {
                // Non-fatal
              }
              break;
            }
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setStreamingContent('');
        syncMessages();
        setAppState('idle');
        conversationRef.current.addAssistantMessage(`Error: ${msg}`, undefined);
        syncMessages();
        estimateTokens();
      }
    },
    [provider, tools, model, autoApprove, cwd, syncMessages, estimateTokens],
  );

  // Auto-submit initial prompt after splash completes (or immediately if skipped)
  const initialPromptSent = useRef(false);
  useEffect(() => {
    if (
      !showSplash &&
      initialPrompt &&
      !initialPromptSent.current &&
      appState === 'idle'
    ) {
      initialPromptSent.current = true;
      setInputHistory((prev) => [...prev, initialPrompt]);
      void processQuery(initialPrompt);
    }
  }, [showSplash, initialPrompt, appState, processQuery]);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  const handleSubmit = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      if (trimmed === '/exit' || trimmed === 'exit') {
        exit();
        return;
      }

      if (trimmed === '/clear') {
        conversationRef.current = new Conversation(systemPrompt, model);
        setMessages(conversationRef.current.getMessages());
        setStreamingContent('');
        setHelpVisible(false);
        setTokenCount(0);
        setAppState('idle');
        return;
      }

      if (trimmed === '/help') {
        setHelpVisible((prev) => !prev);
        return;
      }

      if (trimmed.startsWith('/')) {
        const skillName = trimmed.slice(1).split(/\s/)[0];
        const skill = currentSkills.find((s) => s.name === skillName);
        if (skill) {
          setInputHistory((prev) => {
            if (prev.length > 0 && prev[prev.length - 1] === trimmed)
              return prev;
            return [...prev, trimmed];
          });
          setHelpVisible(false);
          void processQuery(skill.prompt);
          return;
        }
      }

      setInputHistory((prev) => {
        if (prev.length > 0 && prev[prev.length - 1] === trimmed) return prev;
        return [...prev, trimmed];
      });

      setHelpVisible(false);
      void processQuery(trimmed);
    },
    [exit, systemPrompt, model, processQuery, currentSkills],
  );

  const handleApprove = useCallback(() => {
    if (pendingTool) {
      pendingTool.approve();
      setPendingTool(null);
    }
  }, [pendingTool]);

  const handleDeny = useCallback(() => {
    if (pendingTool) {
      pendingTool.deny();
      setPendingTool(null);
    }
  }, [pendingTool]);

  const handleAlwaysApprove = useCallback(() => {
    if (pendingTool) {
      pendingTool.approve();
      setPendingTool(null);
    }
  }, [pendingTool]);

  // Show splash screen
  if (showSplash) {
    return (
      <StartupSplash model={model} onComplete={handleSplashComplete} />
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Header */}
      <AppHeader model={model} tokenCount={tokenCount} />

      {/* Message history + live streaming */}
      <MessageList messages={messages} streamingContent={streamingContent} />

      {/* Help overlay */}
      {helpVisible && (
        <Box
          borderStyle="round"
          borderColor="green"
          paddingX={1}
          marginBottom={1}
          flexDirection="column"
        >
          <Text color="green" bold>
            Anver Code — Help
          </Text>
          <Text>{theme.secondary(helpText)}</Text>
        </Box>
      )}

      {/* State-specific UI */}
      {appState === 'streaming' && <Spinner model={model} label="Thinking" />}

      {appState === 'tool_running' && runningToolName !== null && (
        <Spinner model={model} label={`Running: ${runningToolName}`} />
      )}

      {appState === 'tool_pending' && pendingTool !== null && (
        <PermissionPrompt
          toolName={pendingTool.toolName}
          args={pendingTool.args}
          onApprove={handleApprove}
          onDeny={handleDeny}
          onAlwaysApprove={handleAlwaysApprove}
        />
      )}

      {/* Input only when idle */}
      {appState === 'idle' && (
        <InputPrompt onSubmit={handleSubmit} history={inputHistory} />
      )}
    </Box>
  );
}
```

- [ ] **Step 3: Update chat.ts to pass new props**

In `src/commands/chat.ts`, update the render call:

```typescript
import React from 'react';
import { render } from 'ink';
import { loadConfig } from '../utils/config.js';
import { OpenRouterProvider } from '../core/provider.js';
import { getTools } from '../tools/index.js';
import { buildSystemPrompt } from '../utils/systemPrompt.js';
import { getLastSession, loadSession } from '../utils/history.js';
import { Conversation } from '../core/conversation.js';
import { App } from '../ui/App.js';
import { loadSkills } from '../skills/loader.js';

export interface LaunchOptions {
  model?: string;
  resume?: boolean;
  session?: string;
}

export async function launchChat(options: LaunchOptions, initialPrompt?: string): Promise<void> {
  const config = loadConfig();

  const apiKey = config.apiKey ?? process.env.OPENROUTER_API_KEY ?? process.env.ANVER_API_KEY ?? '';
  if (!apiKey) {
    console.error('Error: No API key found. Set apiKey via `anver config set apiKey <key>` or the OPENROUTER_API_KEY environment variable.');
    process.exit(1);
  }

  const model = options.model ?? config.model;
  const autoApprove = config.autoApprove;
  const cwd = process.cwd();

  const provider = new OpenRouterProvider(apiKey);
  const tools = getTools();

  const loadedSkills = await loadSkills(cwd);
  const allTools = [...tools, ...loadedSkills.codeSkills];
  const systemPrompt = buildSystemPrompt(cwd, loadedSkills.promptSkills);

  let initialConversation: Conversation | undefined;

  if (options.session) {
    try {
      const sessionData = loadSession(options.session);
      initialConversation = Conversation.fromSessionData(sessionData);
    } catch (err) {
      console.error(`Error loading session from ${options.session}:`, err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  } else if (options.resume) {
    const lastSession = getLastSession();
    if (lastSession) {
      initialConversation = Conversation.fromSessionData(lastSession);
    } else {
      console.log('No previous session found. Starting a fresh conversation.');
    }
  }

  const skipSplash = !!(options.resume || options.session || initialPrompt);

  const { waitUntilExit } = render(
    React.createElement(App, {
      provider,
      tools: allTools,
      model,
      systemPrompt,
      initialConversation,
      autoApprove,
      cwd,
      promptSkills: loadedSkills.promptSkills,
      initialPrompt,
      skipSplash,
    }),
  );

  waitUntilExit().then(() => {
    process.exit(0);
  }).catch(() => {
    process.exit(1);
  });
}
```

- [ ] **Step 4: Run all tests to verify nothing is broken**

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 5: Build to verify TypeScript compiles**

Run: `npx tsup`
Expected: Build succeeds with no type errors

- [ ] **Step 6: Commit**

```bash
git add src/ui/App.tsx src/commands/chat.ts
git commit -m "feat(ui): wire startup splash, header, and Matrix theme into App"
```

---

### Task 11: Manual Smoke Test & Polish

**Files:**
- Possibly tweak any file from Tasks 1-10

- [ ] **Step 1: Build the project**

Run: `npm run build`
Expected: Clean build, no errors

- [ ] **Step 2: Launch and verify startup splash**

Run: `./dist/anver.js`
Expected:
- Matrix rain fills the screen with falling Katakana characters
- After ~1.5s the ASCII "ANVER" logo starts decoding (Katakana → correct characters)
- Model name appears below logo
- "press any key to continue..." appears
- Pressing any key immediately shows the chat UI

- [ ] **Step 3: Verify splash skip with prompt**

Run: `./dist/anver.js "hello"`
Expected: No splash, goes straight to chat, auto-submits "hello"

- [ ] **Step 4: Verify chat UI elements**

In the running session:
- Header shows `╸ANVER CODE╺━━━ model ━━ tokens: 0`
- Input shows `[anver]>> █` with blinking cursor
- Type a message → user message appears in `┌─[YOU]─...` box
- AI response appears in `┌─[ANVER]─...` box
- Tool results show `✓ tool_name ...` compact lines
- Permission prompts show `╔══[ACCESS REQUESTED]═...╗` box
- Thinking shows compact Matrix rain with `⟩ Thinking...` line
- All colors are green spectrum (no cyan, no white)

- [ ] **Step 5: Fix any visual issues found**

Adjust spacing, alignment, or colors as needed. Common issues:
- Box-drawing alignment off by one character
- Rain columns too wide for narrow terminals
- Logo wider than terminal

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix(ui): polish Matrix UI alignment and edge cases"
```

- [ ] **Step 7: Run full test suite one final time**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 8: Final commit if any test fixes needed**

```bash
git add -A
git commit -m "fix: resolve test issues from Matrix UI integration"
```
