import type { BaseTool } from './BaseTool.js';
import { ReadFileTool } from './ReadFile.js';
import { WriteFileTool } from './WriteFile.js';
import { EditFileTool } from './EditFile.js';
import { BashTool } from './Bash.js';
import { GlobTool } from './Glob.js';
import { GrepTool } from './Grep.js';
import { GitStatusTool } from './GitStatus.js';
import { GitDiffTool } from './GitDiff.js';
import { GitLogTool } from './GitLog.js';
import { GitCommitTool } from './GitCommit.js';
import { WebFetchTool } from './WebFetch.js';
import { WebSearchTool } from './WebSearch.js';
import { ListDirectoryTool } from './ListDirectory.js';
import { FindFileTool } from './FindFile.js';

const tools: BaseTool<any, any>[] = [
  new ReadFileTool(),
  new WriteFileTool(),
  new EditFileTool(),
  new BashTool(),
  new GlobTool(),
  new GrepTool(),
  new GitStatusTool(),
  new GitDiffTool(),
  new GitLogTool(),
  new GitCommitTool(),
  new WebFetchTool(),
  new WebSearchTool(),
  new ListDirectoryTool(),
  new FindFileTool(),
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
