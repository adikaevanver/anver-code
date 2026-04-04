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
