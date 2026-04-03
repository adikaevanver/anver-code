import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { InputPrompt } from '../../src/ui/InputPrompt.js';

describe('InputPrompt', () => {
  it('renders the [anver]>> prompt', () => {
    const { lastFrame } = render(
      React.createElement(InputPrompt, { onSubmit: () => {}, history: [] }),
    );
    const output = lastFrame();
    expect(output).toContain('[anver]');
    expect(output).toContain('>>');
  });
});
