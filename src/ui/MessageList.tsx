import React from 'react';
import { Box, Text } from 'ink';
import type { Message } from '../core/types.js';

const BOX_WIDTH = 40;

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1');
}

export function formatUserMessage(content: string): string {
  const label = '[YOU]';
  // top: ┌─[YOU]──── ... fill to BOX_WIDTH total
  const prefix = `\u250c\u2500${label}`;
  const dashes = '\u2500'.repeat(Math.max(0, BOX_WIDTH - prefix.length));
  const topLine = prefix + dashes;
  const bodyLine = `\u2502 ${content}`;
  const bottomLine = '\u2514' + '\u2500'.repeat(BOX_WIDTH - 1);
  return [topLine, bodyLine, bottomLine].join('\n');
}

export function formatAssistantMessage(content: string): string {
  const stripped = stripMarkdown(content);
  const label = '[ANVER]';
  const prefix = `\u250c\u2500${label}`;
  const dashes = '\u2500'.repeat(Math.max(0, BOX_WIDTH - prefix.length));
  const topLine = prefix + dashes;
  const bodyLine = `\u2502 ${stripped}`;
  const bottomLine = '\u2514' + '\u2500'.repeat(BOX_WIDTH - 1);
  return [topLine, bodyLine, bottomLine].join('\n');
}

export function formatToolResult(toolName: string, isError: boolean): string {
  const symbol = isError ? '\u2717' : '\u2713';
  return ` ${symbol} ${toolName}`;
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
          const label = '[YOU]';
          const prefix = `┌─${label}`;
          const dashes = '─'.repeat(Math.max(0, BOX_WIDTH - prefix.length));
          const bottomLine = '└' + '─'.repeat(BOX_WIDTH - 1);

          return (
            <Box key={index} flexDirection="column" marginBottom={1}>
              <Text dimColor color="green">
                {'┌─'}
                <Text color="#00ff41">{label}</Text>
                {dashes}
              </Text>
              <Text color="#00ff41">{'│ '}{message.content}</Text>
              <Text dimColor color="green">{bottomLine}</Text>
            </Box>
          );
        }

        if (message.role === 'assistant') {
          const label = '[ANVER]';
          const prefix = `┌─${label}`;
          const dashes = '─'.repeat(Math.max(0, BOX_WIDTH - prefix.length));
          const bottomLine = '└' + '─'.repeat(BOX_WIDTH - 1);
          const stripped = stripMarkdown(message.content);

          return (
            <Box key={index} flexDirection="column" marginBottom={1}>
              <Text dimColor>
                {'┌─'}
                <Text color="#00ff41">{label}</Text>
                {dashes}
              </Text>
              <Text color="#008f11">{'│ '}{stripped}</Text>
              <Text dimColor>{bottomLine}</Text>
            </Box>
          );
        }

        if (message.role === 'tool') {
          const truncated =
            message.content.length > 200
              ? message.content.slice(0, 200) + '…'
              : message.content;

          return (
            <Box key={index} marginBottom={1}>
              <Text color="#00ff41">{' ✓ '}</Text>
              <Text color="#008f11">{truncated}</Text>
            </Box>
          );
        }

        return null;
      })}

      {streamingContent !== undefined && streamingContent !== '' && (
        <Box flexDirection="column" marginBottom={1}>
          <Text dimColor>
            {'┌─'}
            <Text color="#00ff41">{'[ANVER]'}</Text>
            {'─'.repeat(Math.max(0, BOX_WIDTH - '┌─[ANVER]'.length))}
          </Text>
          <Text color="#008f11">{'│ '}{stripMarkdown(streamingContent)}</Text>
          <Text dimColor>{'└' + '─'.repeat(BOX_WIDTH - 1)}</Text>
        </Box>
      )}
    </Box>
  );
}
