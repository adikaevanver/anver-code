import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { MatrixRain } from './MatrixRain.js';
import { randomKatakana } from './MatrixRain.js';
import { theme } from './theme.js';

// ── ASCII Logo ────────────────────────────────────────────────────────────────

export const LOGO_LINES: string[] = [
  ' █████╗ ███╗   ██╗██╗   ██╗███████╗██████╗ ',
  '██╔══██╗████╗  ██║██║   ██║██╔════╝██╔══██╗',
  '███████║██╔██╗ ██║██║   ██║█████╗  ██████╔╝',
  '██╔══██║██║╚██╗██║╚██╗ ██╔╝██╔══╝  ██╔══██╗',
  '██║  ██║██║ ╚████║ ╚████╔╝ ███████╗██║  ██║',
  '╚═╝  ╚═╝╚═╝  ╚═══╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝',
];

// ── Decode Logic ──────────────────────────────────────────────────────────────

/**
 * Returns logo lines where characters are decoded left-to-right based on
 * progress (0–1). At progress=0 all non-space chars are random Katakana.
 * At progress=1 the original logo is returned verbatim. Spaces are always
 * preserved.
 *
 * "Left-to-right" is computed across the flattened character stream of all
 * lines: a character at position i (out of total N non-space chars) is
 * decoded once `progress >= i / N`.
 */
export function decodeLogo(progress: number): string[] {
  // Count total non-space characters across all lines
  let totalNonSpace = 0;
  for (const line of LOGO_LINES) {
    for (const ch of line) {
      if (ch !== ' ') totalNonSpace++;
    }
  }

  const result: string[] = [];
  let charIndex = 0; // running index of non-space characters seen so far

  for (const line of LOGO_LINES) {
    let decoded = '';
    for (const ch of line) {
      if (ch === ' ') {
        decoded += ' ';
      } else {
        const threshold = totalNonSpace > 0 ? charIndex / totalNonSpace : 0;
        if (progress >= threshold) {
          decoded += ch;
        } else {
          decoded += randomKatakana();
        }
        charIndex++;
      }
    }
    result.push(decoded);
  }

  return result;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface StartupSplashProps {
  model: string;
  onComplete: () => void;
}

const LOGO_SHOW_DELAY = 1500;  // ms before logo starts appearing
const TOTAL_DURATION  = 3000;  // ms before auto-complete
const TICK_INTERVAL   = 100;   // ms between animation frames

export function StartupSplash({ model, onComplete }: StartupSplashProps) {
  const { stdout } = useStdout();
  const columns = stdout?.columns ?? 80;
  const rows    = stdout?.rows    ?? 24;

  const [elapsed, setElapsed]       = useState(0);   // ms since mount
  const [completed, setCompleted]   = useState(false);

  const finish = useCallback(() => {
    if (!completed) {
      setCompleted(true);
      onComplete();
    }
  }, [completed, onComplete]);

  // Tick every 100 ms
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + TICK_INTERVAL;
        if (next >= TOTAL_DURATION) {
          clearInterval(interval);
        }
        return next;
      });
    }, TICK_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Auto-complete after total duration
  useEffect(() => {
    if (elapsed >= TOTAL_DURATION && !completed) {
      finish();
    }
  }, [elapsed, completed, finish]);

  // Any keypress → complete
  useInput(() => {
    finish();
  });

  // Compute logo progress: 0 until LOGO_SHOW_DELAY, then ramps to 1 over the
  // remaining time window.
  const logoProgress = elapsed < LOGO_SHOW_DELAY
    ? 0
    : Math.min(1, (elapsed - LOGO_SHOW_DELAY) / (TOTAL_DURATION - LOGO_SHOW_DELAY));

  const decodedLines = decodeLogo(logoProgress);

  // Center the logo horizontally
  const logoWidth = LOGO_LINES.reduce((max, l) => Math.max(max, l.length), 0);
  const leftPad   = Math.max(0, Math.floor((columns - logoWidth) / 2));
  const padStr    = ' '.repeat(leftPad);

  // Vertical positioning: center-ish (logo block + 2 lines below)
  const logoBlockHeight = LOGO_LINES.length + 2; // logo + model + hint
  const topPad = Math.max(0, Math.floor((rows - logoBlockHeight) / 2));

  const showLogo = elapsed >= LOGO_SHOW_DELAY;

  return (
    <Box flexDirection="column" width={columns} height={rows} overflow="hidden">
      {/* Matrix rain background */}
      <MatrixRain columns={columns} rows={rows} active={true} />

      {/* Overlay logo in the center (absolute-ish via top padding) */}
      {showLogo && (
        <Box
          flexDirection="column"
          position="absolute"
          marginTop={topPad}
        >
          {decodedLines.map((line, i) => (
            <Text key={i}>{padStr}{theme.primary(line)}</Text>
          ))}
          <Text>{padStr}{theme.secondary(model)}</Text>
          <Text>{padStr}{theme.dim('press any key to continue...')}</Text>
        </Box>
      )}
    </Box>
  );
}
