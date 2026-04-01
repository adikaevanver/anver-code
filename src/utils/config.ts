import fs from 'fs';
import path from 'path';
import os from 'os';

export interface Config {
  apiKey?: string;
  model: string;
  theme: string;
  autoApprove: string[];
}

const DEFAULT_CONFIG: Config = {
  model: 'google/gemini-2.5-pro-exp-03-25',
  theme: 'default',
  autoApprove: ['ReadFile', 'Glob', 'Grep', 'ListDirectory', 'GitStatus', 'GitDiff', 'GitLog'],
};

export function getConfigDir(): string {
  const override = process.env.ANVER_CODE_HOME;
  if (override) return override;
  return path.join(os.homedir(), '.anver-code');
}

function getConfigPath(): string {
  return path.join(getConfigDir(), 'config.json');
}

export function loadConfig(): Config {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }
  const raw = fs.readFileSync(configPath, 'utf-8');
  const parsed = JSON.parse(raw);
  return { ...DEFAULT_CONFIG, ...parsed };
}

export function saveConfig(config: Config): void {
  const dir = getConfigDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2) + '\n');
}

export function getConfigValue(key: keyof Config): string | string[] | undefined {
  const config = loadConfig();
  return config[key];
}

export function setConfigValue(key: keyof Config, value: string | string[]): void {
  const config = loadConfig();
  (config as unknown as Record<string, unknown>)[key] = value;
  saveConfig(config);
}
