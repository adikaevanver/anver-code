import React, { useState, useEffect } from 'react';
import { Box, Text, useStdout } from 'ink';
import { MatrixRain } from './MatrixRain.js';
import { theme } from './theme.js';

interface SpinnerProps {
  model: string;
  label?: string;
}

export function Spinner({ model, label }: SpinnerProps) {
  const { stdout } = useStdout();
  const columns = stdout?.columns ?? 80;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((e) => e + 100);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const seconds = (elapsed / 1000).toFixed(1);
  const displayLabel = label ?? 'Thinking';

  return (
    <Box flexDirection="column">
      <MatrixRain columns={columns} rows={3} active={true} />
      <Text>
        {theme.primary('⟩ ')}
        {theme.dim(`${displayLabel}... `)}
        {theme.primary(model)}
        {theme.dim(` (${seconds}s)`)}
      </Text>
    </Box>
  );
}
