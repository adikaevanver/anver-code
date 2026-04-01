import React from 'react';
import { Box, Text } from 'ink';

interface ToolResultProps {
  toolName: string;
  result: string;
  isError?: boolean;
}

export function ToolResult({ toolName, result, isError }: ToolResultProps) {
  const maxLen = 200;
  const display = result.length > maxLen ? result.slice(0, maxLen) + '...' : result;
  const icon = isError ? '✗' : '✓';
  const iconColor = isError ? 'red' : 'green';

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text><Text color={iconColor}>{icon}</Text> <Text color="cyan" dimColor>{toolName}</Text></Text>
      <Text dimColor={!isError} color={isError ? 'red' : undefined}>{display}</Text>
    </Box>
  );
}
