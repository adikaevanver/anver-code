import React from 'react';
import { Box, Text } from 'ink';
import type { Message } from '../core/types.js';

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
          return (
            <Box key={index} marginBottom={1}>
              <Text bold color="white">
                {'> '}
                {message.content}
              </Text>
            </Box>
          );
        }

        if (message.role === 'assistant') {
          return (
            <Box key={index} marginBottom={1}>
              <Text>{message.content}</Text>
            </Box>
          );
        }

        if (message.role === 'tool') {
          const truncated =
            message.content.length > 500
              ? message.content.slice(0, 500) + '…'
              : message.content;
          return (
            <Box key={index} marginBottom={1}>
              <Text dimColor>{truncated}</Text>
            </Box>
          );
        }

        return null;
      })}

      {streamingContent !== undefined && streamingContent !== '' && (
        <Box marginBottom={1}>
          <Text>{streamingContent}</Text>
        </Box>
      )}
    </Box>
  );
}
