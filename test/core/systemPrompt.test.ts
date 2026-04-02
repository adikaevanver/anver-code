import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { buildSystemPrompt } from '../../src/utils/systemPrompt.js';
import type { PromptSkill } from '../../src/skills/types.js';

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

  it('appends skills section when skills are provided', () => {
    const skills: PromptSkill[] = [
      { name: 'commit', description: 'Create a git commit', prompt: 'Do the commit.', source: 'global' },
      { name: 'review', description: 'Review code changes', prompt: 'Review the diff.', source: 'project' },
    ];
    const prompt = buildSystemPrompt(tmpDir, skills);
    expect(prompt).toContain('# Available Skills');
    expect(prompt).toContain('/commit');
    expect(prompt).toContain('Create a git commit');
    expect(prompt).toContain('/review');
    expect(prompt).toContain('Review code changes');
  });

  it('does not include skills section when no skills provided', () => {
    const prompt = buildSystemPrompt(tmpDir);
    expect(prompt).not.toContain('Available Skills');
  });

  it('does not include skills section when skills array is empty', () => {
    const prompt = buildSystemPrompt(tmpDir, []);
    expect(prompt).not.toContain('Available Skills');
  });
});
