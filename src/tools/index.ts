import type { BaseTool } from './BaseTool.js';
import { ReadFileTool } from './ReadFile.js';
import { WriteFileTool } from './WriteFile.js';
import { EditFileTool } from './EditFile.js';
import { BashTool } from './Bash.js';
import { GlobTool } from './Glob.js';
import { GrepTool } from './Grep.js';

const tools: BaseTool<any, any>[] = [
  new ReadFileTool(),
  new WriteFileTool(),
  new EditFileTool(),
  new BashTool(),
  new GlobTool(),
  new GrepTool(),
];

export function getTools(): BaseTool<any, any>[] {
  return tools;
}

export function getToolByName(name: string): BaseTool<any, any> | undefined {
  return tools.find((t) => t.name === name);
}

export function getToolDefinitions() {
  return tools.map((t) => t.toToolDefinition());
}
