import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ReadFileTool } from '../../src/tools/ReadFile.js';
import { WriteFileTool } from '../../src/tools/WriteFile.js';
import { EditFileTool } from '../../src/tools/EditFile.js';

describe('File Tools', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anver-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('ReadFileTool', () => {
    const tool = new ReadFileTool();

    it('reads a file with line numbers', async () => {
      const filePath = path.join(tmpDir, 'test.txt');
      fs.writeFileSync(filePath, 'line one\nline two\nline three\n');
      const result = await tool.execute({ file_path: filePath });
      expect(result).toContain('1\tline one');
      expect(result).toContain('2\tline two');
      expect(result).toContain('3\tline three');
    });

    it('reads with offset and limit', async () => {
      const filePath = path.join(tmpDir, 'test.txt');
      fs.writeFileSync(filePath, 'a\nb\nc\nd\ne\n');
      const result = await tool.execute({ file_path: filePath, offset: 2, limit: 2 });
      expect(result).toContain('3\tc');
      expect(result).toContain('4\td');
      expect(result).not.toContain('1\ta');
    });

    it('throws for nonexistent file', async () => {
      await expect(tool.execute({ file_path: '/nonexistent/file' })).rejects.toThrow();
    });
  });

  describe('WriteFileTool', () => {
    const tool = new WriteFileTool();

    it('creates a new file', async () => {
      const filePath = path.join(tmpDir, 'new.txt');
      const result = await tool.execute({ file_path: filePath, content: 'hello world' });
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('hello world');
      expect(result).toContain('Written');
    });

    it('overwrites an existing file', async () => {
      const filePath = path.join(tmpDir, 'existing.txt');
      fs.writeFileSync(filePath, 'old content');
      await tool.execute({ file_path: filePath, content: 'new content' });
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('new content');
    });

    it('creates parent directories', async () => {
      const filePath = path.join(tmpDir, 'sub', 'dir', 'file.txt');
      await tool.execute({ file_path: filePath, content: 'nested' });
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('nested');
    });
  });

  describe('EditFileTool', () => {
    const tool = new EditFileTool();

    it('replaces a string in a file', async () => {
      const filePath = path.join(tmpDir, 'edit.txt');
      fs.writeFileSync(filePath, 'hello world\nfoo bar\n');
      const result = await tool.execute({
        file_path: filePath,
        old_string: 'foo bar',
        new_string: 'baz qux',
      });
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('hello world\nbaz qux\n');
      expect(result).toContain('Edited');
    });

    it('throws if old_string not found', async () => {
      const filePath = path.join(tmpDir, 'edit2.txt');
      fs.writeFileSync(filePath, 'hello world');
      await expect(
        tool.execute({ file_path: filePath, old_string: 'not here', new_string: 'x' })
      ).rejects.toThrow('not found');
    });

    it('throws if old_string matches multiple times', async () => {
      const filePath = path.join(tmpDir, 'edit3.txt');
      fs.writeFileSync(filePath, 'aaa\naaa\n');
      await expect(
        tool.execute({ file_path: filePath, old_string: 'aaa', new_string: 'bbb' })
      ).rejects.toThrow('multiple');
    });
  });
});
