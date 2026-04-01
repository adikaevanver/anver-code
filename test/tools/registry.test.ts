import { describe, it, expect } from 'vitest';
import { getTools, getToolByName, getToolDefinitions } from '../../src/tools/index.js';

describe('Tool Registry', () => {
  it('returns all 14 tools', () => {
    const tools = getTools();
    expect(tools.length).toBe(14);
  });

  it('finds a tool by name', () => {
    const tool = getToolByName('read_file');
    expect(tool).toBeDefined();
    expect(tool!.name).toBe('read_file');
  });

  it('returns undefined for unknown tool', () => {
    expect(getToolByName('NonExistent')).toBeUndefined();
  });

  it('generates tool definitions for all tools', () => {
    const defs = getToolDefinitions();
    expect(defs.length).toBe(14);
    for (const def of defs) {
      expect(def.type).toBe('function');
      expect(def.function.name).toBeTruthy();
      expect(def.function.description).toBeTruthy();
    }
  });

  it('has no duplicate tool names', () => {
    const names = getTools().map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
