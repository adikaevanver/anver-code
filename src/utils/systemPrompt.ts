import fs from 'fs';
import path from 'path';
import os from 'os';
import type { PromptSkill } from '../skills/types.js';

export function buildSystemPrompt(cwd: string, skills?: PromptSkill[]): string {
  const sections: string[] = [];

  sections.push(`You are Anver Code, an interactive coding assistant CLI. You help users with software engineering tasks by reading, writing, searching, and managing code.

You have access to tools for file operations, shell commands, git, and web search. Use them to accomplish tasks. When modifying code, read the file first. Prefer editing existing files over creating new ones. Be concise and direct.

# Tool Usage Rules
- Use ReadFile before editing a file you haven't seen
- Use EditFile for small changes, WriteFile for new files or full rewrites
- Use Bash for shell commands — always quote paths with spaces
- Destructive tools (WriteFile, EditFile, Bash, GitCommit) require user approval
- Prefer non-destructive tools (ReadFile, Glob, Grep) when just exploring`);

  sections.push(`# Environment
- Working directory: ${cwd}
- Platform: ${os.platform()}
- Shell: ${process.env.SHELL ?? '/bin/bash'}
- Date: ${new Date().toISOString().split('T')[0]}`);

  const anvercodePath = path.join(cwd, '.anvercode');
  if (fs.existsSync(anvercodePath)) {
    const content = fs.readFileSync(anvercodePath, 'utf-8').trim();
    sections.push(`# Project Instructions\n${content}`);
  }

  if (skills && skills.length > 0) {
    const skillLines = skills
      .map((s) => `  /${s.name} — ${s.description}`)
      .join('\n');
    sections.push(`# Available Skills
You have access to these custom skills. Suggest them when relevant.
The user can trigger them with slash commands.

${skillLines}`);
  }

  return sections.join('\n\n');
}
