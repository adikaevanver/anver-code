import fs from 'fs';
import path from 'path';
import { getConfigDir } from './config.js';
import type { SessionData } from '../core/types.js';

function getSessionsDir(): string {
  return path.join(getConfigDir(), 'sessions');
}

export function saveSession(session: SessionData): string {
  const dir = getSessionsDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const fileName = `${session.id}.json`;
  const filePath = path.join(dir, fileName);
  fs.writeFileSync(filePath, JSON.stringify(session, null, 2) + '\n');
  return filePath;
}

export function loadSession(filePath: string): SessionData {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as SessionData;
}

export function listSessions(): string[] {
  const dir = getSessionsDir();
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => path.join(dir, f))
    .sort();
}

export function getLastSession(): SessionData | undefined {
  const sessions = listSessions();
  if (sessions.length === 0) return undefined;
  return loadSession(sessions[sessions.length - 1]);
}
