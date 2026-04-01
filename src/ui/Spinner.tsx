import React, { useState, useEffect } from 'react';
import { Text } from 'ink';
import { theme } from './theme.js';

const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

interface SpinnerProps {
  model: string;
  label?: string;
}

export function Spinner({ model, label }: SpinnerProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrameIndex((i) => (i + 1) % frames.length);
      setElapsed((e) => e + 80);
    }, 80);
    return () => clearInterval(interval);
  }, []);

  const seconds = (elapsed / 1000).toFixed(1);
  const displayLabel = label ?? 'Thinking';

  return (
    <Text>
      {theme.spinner(frames[frameIndex])} {theme.muted(`${displayLabel}...`)} {theme.accent(model)} {theme.muted(`(${seconds}s)`)}
    </Text>
  );
}
