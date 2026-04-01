import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { GitStatusTool } from '../../src/tools/GitStatus.js';
import { GitDiffTool } from '../../src/tools/GitDiff.js';
import { GitLogTool } from '../../src/tools/GitLog.js';
import { GitCommitTool } from '../../src/tools/GitCommit.js';

describe('Git Tools', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anver-git-'));
    execSync('git init', { cwd: tmpDir });
    execSync('git config user.email "test@test.com"', { cwd: tmpDir });
    execSync('git config user.name "Test"', { cwd: tmpDir });
    fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'initial');
    execSync('git add . && git commit -m "init"', { cwd: tmpDir });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('GitStatusTool', () => {
    const tool = new GitStatusTool();
    it('shows clean status', async () => {
      const result = await tool.execute({ cwd: tmpDir });
      expect(result).toContain('nothing to commit');
    });
    it('shows modified files', async () => {
      fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'changed');
      const result = await tool.execute({ cwd: tmpDir });
      expect(result).toContain('file.txt');
    });
  });

  describe('GitDiffTool', () => {
    const tool = new GitDiffTool();
    it('shows diff of changes', async () => {
      fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'changed');
      const result = await tool.execute({ cwd: tmpDir });
      expect(result).toContain('-initial');
      expect(result).toContain('+changed');
    });
  });

  describe('GitLogTool', () => {
    const tool = new GitLogTool();
    it('shows commit history', async () => {
      const result = await tool.execute({ cwd: tmpDir });
      expect(result).toContain('init');
    });
    it('limits number of commits', async () => {
      fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'v2');
      execSync('git add . && git commit -m "second"', { cwd: tmpDir });
      const result = await tool.execute({ cwd: tmpDir, count: 1 });
      expect(result).toContain('second');
      expect(result).not.toContain('init');
    });
  });

  describe('GitCommitTool', () => {
    const tool = new GitCommitTool();
    it('creates a commit', async () => {
      fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'v2');
      execSync('git add .', { cwd: tmpDir });
      const result = await tool.execute({ cwd: tmpDir, message: 'update file' });
      expect(result).toContain('update file');
    });
  });
});
