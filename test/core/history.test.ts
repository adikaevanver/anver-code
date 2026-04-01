import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { saveSession, loadSession, getLastSession, listSessions } from '../../src/utils/history.js';
import type { SessionData } from '../../src/core/types.js';

describe('history', () => {
  let tmpDir: string;
  let originalHome: string | undefined;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anver-hist-'));
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

  const makeSession = (id: string): SessionData => ({
    id,
    messages: [{ role: 'system', content: 'test' }],
    model: 'test-model',
    cwd: '/tmp',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  it('saves and loads a session', () => {
    const session = makeSession('sess-1');
    const filePath = saveSession(session);
    expect(fs.existsSync(filePath)).toBe(true);
    const loaded = loadSession(filePath);
    expect(loaded.id).toBe('sess-1');
    expect(loaded.messages).toHaveLength(1);
  });

  it('lists sessions', () => {
    saveSession(makeSession('a'));
    saveSession(makeSession('b'));
    const sessions = listSessions();
    expect(sessions.length).toBe(2);
  });

  it('gets the last session', () => {
    saveSession(makeSession('first'));
    saveSession(makeSession('second'));
    const last = getLastSession();
    expect(last).toBeDefined();
    expect(last!.id).toBe('second');
  });

  it('returns undefined when no sessions exist', () => {
    expect(getLastSession()).toBeUndefined();
  });
});
