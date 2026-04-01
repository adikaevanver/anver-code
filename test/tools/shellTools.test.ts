import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { BashTool } from '../../src/tools/Bash.js';
import { GlobTool } from '../../src/tools/Glob.js';
import { GrepTool } from '../../src/tools/Grep.js';

describe('Shell and Search Tools', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anver-test-'));
    fs.writeFileSync(path.join(tmpDir, 'hello.ts'), 'const greeting = "hello";\nconsole.log(greeting);\n');
    fs.writeFileSync(path.join(tmpDir, 'world.ts'), 'export const world = "world";\n');
    fs.writeFileSync(path.join(tmpDir, 'readme.md'), '# Test\n');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('BashTool', () => {
    const tool = new BashTool();

    it('executes a simple command', async () => {
      const result = await tool.execute({ command: 'echo hello' });
      expect(result.stdout.trim()).toBe('hello');
      expect(result.exitCode).toBe(0);
    });

    it('captures stderr', async () => {
      const result = await tool.execute({ command: 'echo err >&2' });
      expect(result.stderr.trim()).toBe('err');
    });

    it('returns non-zero exit code on failure', async () => {
      const result = await tool.execute({ command: 'exit 1' });
      expect(result.exitCode).toBe(1);
    });

    it('respects timeout', async () => {
      await expect(
        tool.execute({ command: 'sleep 10', timeout: 500 })
      ).rejects.toThrow();
    });
  });

  describe('GlobTool', () => {
    const tool = new GlobTool();

    it('finds files by pattern', async () => {
      const result = await tool.execute({ pattern: '*.ts', path: tmpDir });
      expect(result).toContain('hello.ts');
      expect(result).toContain('world.ts');
      expect(result).not.toContain('readme.md');
    });

    it('returns empty for no matches', async () => {
      const result = await tool.execute({ pattern: '*.py', path: tmpDir });
      expect(result).toBe('');
    });
  });

  describe('GrepTool', () => {
    const tool = new GrepTool();

    it('searches file contents', async () => {
      const result = await tool.execute({ pattern: 'greeting', path: tmpDir });
      expect(result).toContain('hello.ts');
      expect(result).toContain('greeting');
    });

    it('returns empty for no matches', async () => {
      const result = await tool.execute({ pattern: 'nonexistent_xyz', path: tmpDir });
      expect(result).toBe('');
    });
  });
});
