import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { PermissionPrompt } from '../../src/ui/PermissionPrompt.js';

describe('PermissionPrompt', () => {
  it('renders ACCESS REQUESTED', () => {
    const { lastFrame } = render(
      React.createElement(PermissionPrompt, {
        toolName: 'write_file',
        args: { file_path: 'test.ts' },
        onApprove: () => {},
        onDeny: () => {},
        onAlwaysApprove: () => {},
      }),
    );
    const output = lastFrame();
    expect(output).toContain('ACCESS REQUESTED');
    expect(output).toContain('write_file');
  });

  it('shows approve/deny/always options', () => {
    const { lastFrame } = render(
      React.createElement(PermissionPrompt, {
        toolName: 'bash',
        args: { command: 'ls' },
        onApprove: () => {},
        onDeny: () => {},
        onAlwaysApprove: () => {},
      }),
    );
    const output = lastFrame();
    expect(output).toContain('APPROVE');
    expect(output).toContain('DENY');
    expect(output).toContain('ALWAYS');
  });
});
