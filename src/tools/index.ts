import type { BaseTool } from './BaseTool.js';

// Tools will be imported and added here as they are implemented
const tools: BaseTool<any, any>[] = [];

export function getTools(): BaseTool<any, any>[] {
  return tools;
}

export function getToolByName(name: string): BaseTool<any, any> | undefined {
  return tools.find((t) => t.name === name);
}

export function getToolDefinitions() {
  return tools.map((t) => t.toToolDefinition());
}
