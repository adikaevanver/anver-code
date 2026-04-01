import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { buildSystemPrompt } from '../../src/utils/systemPrompt.js';

describe('systemPrompt', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anver-prompt-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('includes base instructions', () => {
    const prompt = buildSystemPrompt(tmpDir);
    expect(prompt).toContain('coding assistant');
    expect(prompt).toContain('tool');
  });

  it('includes cwd', () => {
    const prompt = buildSystemPrompt(tmpDir);
    expect(prompt).toContain(tmpDir);
  });

  it('includes .anvercode if present', () => {
    fs.writeFileSync(path.join(tmpDir, '.anvercode'), 'Always use TypeScript.\n');
    const prompt = buildSystemPrompt(tmpDir);
    expect(prompt).toContain('Always use TypeScript');
  });

  it('works without .anvercode', () => {
    const prompt = buildSystemPrompt(tmpDir);
    expect(prompt).toBeTruthy();
    expect(prompt).not.toContain('.anvercode');
  });
});
