import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { Spinner } from '../../src/ui/Spinner.js';

describe('Spinner', () => {
  it('renders model name', () => {
    const { lastFrame } = render(<Spinner model="gemini-pro" />);
    expect(lastFrame()).toContain('gemini-pro');
  });

  it('renders label when provided', () => {
    const { lastFrame } = render(<Spinner model="gemini-pro" label="Thinking" />);
    expect(lastFrame()).toContain('Thinking');
  });
});
