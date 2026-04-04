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
