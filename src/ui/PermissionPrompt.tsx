import React from 'react';
import { Box, Text, useInput } from 'ink';

interface PermissionPromptProps {
  toolName: string;
  args: Record<string, unknown>;
  onApprove: () => void;
  onDeny: () => void;
  onAlwaysApprove: () => void;
}

export function PermissionPrompt({ toolName, args, onApprove, onDeny, onAlwaysApprove }: PermissionPromptProps) {
  useInput((ch) => {
    if (ch === 'y' || ch === 'Y') onApprove();
    if (ch === 'n' || ch === 'N') onDeny();
    if (ch === 'a' || ch === 'A') onAlwaysApprove();
  });

  const argsStr = JSON.stringify(args, null, 2);
  const truncatedArgs = argsStr.length > 300 ? argsStr.slice(0, 300) + '...' : argsStr;

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1}>
      <Text color="yellow">{"⚠ "}<Text bold>Tool: {toolName}</Text></Text>
      <Text dimColor>{truncatedArgs}</Text>
      <Text><Text color="cyan">[y]</Text>es  <Text color="cyan">[n]</Text>o  <Text color="cyan">[a]</Text>lways</Text>
    </Box>
  );
}
