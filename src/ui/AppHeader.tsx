import React from 'react';
import { Box, Text } from 'ink';
import { theme } from './theme.js';

// ── Pure formatting helper ─────────────────────────────────────────────────────

/**
 * Formats the header string for testing purposes.
 * Example: `╸ANVER CODE╺━━━━━━━━━━━━━━━━━━━━ qwen3.6-plus ━━ tokens: 1.5k`
 */
export function formatHeader(model: string, tokenCount: number): string {
  const tokens = tokenCount >= 1000
    ? `${(tokenCount / 1000).toFixed(1)}k`
    : String(tokenCount);

  return `╸ANVER CODE╺━━━━━━━━━━━━━━━━━━━━ ${model} ━━ tokens: ${tokens}`;
}

// ── Component ──────────────────────────────────────────────────────────────────

interface AppHeaderProps {
  model: string;
  tokenCount: number;
}

export function AppHeader({ model, tokenCount }: AppHeaderProps) {
  const tokens = tokenCount >= 1000
    ? `${(tokenCount / 1000).toFixed(1)}k`
    : String(tokenCount);

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
