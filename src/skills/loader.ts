import fs from 'fs';
import path from 'path';
import os from 'os';
import type { BaseTool } from '../tools/BaseTool.js';
import type { PromptSkill, LoadedSkills } from './types.js';

/**
 * Parse YAML frontmatter from a markdown string.
 * Returns { attrs, body } or null if no valid frontmatter found.
 */
function parseFrontmatter(content: string): { attrs: Record<string, string>; body: string } | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return null;

  const attrs: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    if (key) attrs[key] = value;
  }

  return { attrs, body: match[2].trim() };
}

function loadPromptSkillsFromDir(
  dirPath: string,
  source: 'global' | 'project',
): PromptSkill[] {
  if (!fs.existsSync(dirPath)) return [];

  const skills: PromptSkill[] = [];
  let entries: string[];
  try {
    entries = fs.readdirSync(dirPath);
  } catch {
    return [];
  }

  for (const entry of entries) {
    if (!entry.endsWith('.md')) continue;
    try {
      const content = fs.readFileSync(path.join(dirPath, entry), 'utf-8');
      const parsed = parseFrontmatter(content);
      if (!parsed) continue;

      const { attrs, body } = parsed;
      if (!attrs.name || !attrs.description) continue;

      skills.push({
        name: attrs.name,
        description: attrs.description,
        prompt: body,
        source,
      });
    } catch {
      // Skip files that fail to read/parse
    }
  }

  return skills;
}

async function loadCodeSkillsFromDir(
  dirPath: string,
): Promise<BaseTool<any, any>[]> {
  if (!fs.existsSync(dirPath)) return [];

  const skills: BaseTool<any, any>[] = [];
  let entries: string[];
  try {
    entries = fs.readdirSync(dirPath);
  } catch {
    return [];
  }

  for (const entry of entries) {
    if (!entry.endsWith('.ts') && !entry.endsWith('.js')) continue;
    try {
      const filePath = path.resolve(dirPath, entry);
      const mod = await import(filePath);
      const ToolClass = mod.default;
      if (typeof ToolClass !== 'function') continue;

      const instance = new ToolClass();
      if (
        typeof instance.name === 'string' &&
        typeof instance.description === 'string' &&
        typeof instance.execute === 'function' &&
        typeof instance.toToolDefinition === 'function'
      ) {
        skills.push(instance);
      }
    } catch {
      // Skip files that fail to load
    }
  }

  return skills;
}

export async function loadSkills(
  cwd: string,
  globalSkillsDir?: string,
): Promise<LoadedSkills> {
  const globalDir = globalSkillsDir ?? path.join(
    process.env.ANVER_CODE_HOME ?? path.join(os.homedir(), '.anver-code'),
    'skills',
  );
  const projectDir = path.join(cwd, '.anver-code', 'skills');

  // Load prompt skills — global first, then project overwrites on name conflict
  const globalPrompt = loadPromptSkillsFromDir(globalDir, 'global');
  const projectPrompt = loadPromptSkillsFromDir(projectDir, 'project');

  const promptMap = new Map<string, PromptSkill>();
  for (const skill of globalPrompt) {
    promptMap.set(skill.name, skill);
  }
  for (const skill of projectPrompt) {
    promptMap.set(skill.name, skill);
  }

  // Load code skills — global first, then project overwrites on name conflict
  const [globalCode, projectCode] = await Promise.all([
    loadCodeSkillsFromDir(globalDir),
    loadCodeSkillsFromDir(projectDir),
  ]);

  const codeMap = new Map<string, BaseTool<any, any>>();
  for (const tool of globalCode) {
    codeMap.set(tool.name, tool);
  }
  for (const tool of projectCode) {
    codeMap.set(tool.name, tool);
  }

  return {
    promptSkills: Array.from(promptMap.values()),
    codeSkills: Array.from(codeMap.values()),
  };
}
