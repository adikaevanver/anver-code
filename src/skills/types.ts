import type { BaseTool } from '../tools/BaseTool.js';

export interface PromptSkill {
  name: string;
  description: string;
  prompt: string;
  source: 'global' | 'project';
}

export interface LoadedSkills {
  promptSkills: PromptSkill[];
  codeSkills: BaseTool<any, any>[];
}

export function isPromptSkill(value: unknown): value is PromptSkill {
  if (value === null || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.name === 'string' &&
    typeof obj.description === 'string' &&
    typeof obj.prompt === 'string' &&
    (obj.source === 'global' || obj.source === 'project')
  );
}
