import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { loadConfig, saveConfig, getConfigValue, setConfigValue, type Config } from '../../src/utils/config.js';

describe('config', () => {
  let tmpDir: string;
  let originalHome: string | undefined;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anver-test-'));
    originalHome = process.env.ANVER_CODE_HOME;
    process.env.ANVER_CODE_HOME = tmpDir;
  });

  afterEach(() => {
    if (originalHome !== undefined) {
      process.env.ANVER_CODE_HOME = originalHome;
    } else {
      delete process.env.ANVER_CODE_HOME;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns default config when no file exists', () => {
    const config = loadConfig();
    expect(config.model).toBe('qwen/qwen3.6-plus:free');
    expect(config.autoApprove).toContain('read_file');
  });

  it('saves and loads config', () => {
    const config: Config = {
      apiKey: 'sk-or-test',
      model: 'meta-llama/llama-4-maverick',
      theme: 'default',
      autoApprove: ['ReadFile'],
    };
    saveConfig(config);
    const loaded = loadConfig();
    expect(loaded.apiKey).toBe('sk-or-test');
    expect(loaded.model).toBe('meta-llama/llama-4-maverick');
  });

  it('gets a specific config value', () => {
    saveConfig({ apiKey: 'test-key', model: 'test-model', theme: 'default', autoApprove: [] });
    expect(getConfigValue('apiKey')).toBe('test-key');
  });

  it('sets a specific config value', () => {
    setConfigValue('model', 'new-model');
    const config = loadConfig();
    expect(config.model).toBe('new-model');
  });
});
