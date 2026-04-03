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

  useEffect(() => {
    const id = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 500);
    return () => clearInterval(id);
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
