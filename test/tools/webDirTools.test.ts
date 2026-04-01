import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { WebFetchTool } from '../../src/tools/WebFetch.js';
import { ListDirectoryTool } from '../../src/tools/ListDirectory.js';
import { FindFileTool } from '../../src/tools/FindFile.js';

describe('Web and Directory Tools', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anver-test-'));
    fs.mkdirSync(path.join(tmpDir, 'sub'));
    fs.writeFileSync(path.join(tmpDir, 'hello.ts'), 'hello');
    fs.writeFileSync(path.join(tmpDir, 'sub', 'nested.ts'), 'nested');
    fs.writeFileSync(path.join(tmpDir, 'readme.md'), '# readme');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('WebFetchTool', () => {
    const tool = new WebFetchTool();
    it('has correct metadata', () => {
      expect(tool.name).toBe('WebFetch');
      expect(tool.destructive).toBe(false);
    });
  });

  describe('ListDirectoryTool', () => {
    const tool = new ListDirectoryTool();
    it('lists directory contents', async () => {
      const result = await tool.execute({ path: tmpDir });
      expect(result).toContain('hello.ts');
      expect(result).toContain('sub/');
      expect(result).toContain('readme.md');
    });
    it('throws for nonexistent directory', async () => {
      await expect(tool.execute({ path: '/nonexistent/dir' })).rejects.toThrow();
    });
  });

  describe('FindFileTool', () => {
    const tool = new FindFileTool();
    it('finds files by name', async () => {
      const result = await tool.execute({ name: 'nested.ts', path: tmpDir });
      expect(result).toContain('nested.ts');
    });
    it('returns empty for no matches', async () => {
      const result = await tool.execute({ name: 'nonexistent.py', path: tmpDir });
      expect(result).toBe('');
    });
  });
});
