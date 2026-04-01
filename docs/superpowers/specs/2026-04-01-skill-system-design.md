# Anver Code Skill System — Design Spec

**Date:** 2026-04-01
**Status:** Draft
**Author:** Anver Adikaev + Claude

## Overview

A skill system for Anver Code that lets users extend the CLI with custom prompt-based skills (markdown) and code-based skills (TypeScript). Skills are discovered from two locations (global and per-project), injected into the system prompt for model awareness, and triggered via slash commands or direct tool use.

## Goals

- Support two skill types: prompt-based (markdown) and code-based (TypeScript extending BaseTool)
- Two skill locations: global (`~/.anver-code/skills/`) and per-project (`.anver-code/skills/`), with project overriding global on name conflicts
- Model auto-discovers skills via system prompt injection
- Users trigger prompt skills via `/skill-name` slash commands
- Code skills register as tools and are called by the model directly
- CLI commands to list loaded skills and scaffold new ones
- Zero changes to QueryEngine, Provider, BaseTool, or Conversation core

## Non-Goals

- Skill marketplace or npm-based distribution
- Skill versioning or dependency management
- Hot-reloading skills during a session
- Skill-specific permissions beyond the existing destructive flag

## Skill File Formats

### Prompt Skills (`.md`)

Markdown files with YAML frontmatter. The body is the prompt template injected into the conversation when triggered.

```markdown
---
name: commit
description: Analyze changes and create a well-formatted git commit
---

Analyze all staged and unstaged changes in the current git repository.
Draft a concise commit message that focuses on the "why" rather than the "what".
Stage relevant files and create the commit.
```

**Frontmatter fields:**
- `name` (required) — skill identifier, used as the slash command (e.g., `/commit`)
- `description` (required) — one-line description shown in system prompt and `skill list`

**Body:** The prompt text. Injected as a user message when the skill is triggered.

### Code Skills (`.ts`)

TypeScript files that default-export a class extending BaseTool. They register as tools the model can call directly.

```typescript
import { z } from 'zod';
import { BaseTool } from '../../src/tools/BaseTool.js';

export default class DeployTool extends BaseTool<{ env: string }, string> {
  name = 'deploy';
  description = 'Deploy the application to a specified environment';
  destructive = true;
  inputSchema = z.object({
    env: z.string().describe('Target environment: staging or production'),
  });

  async call(input: { env: string }): Promise<string> {
    // custom deployment logic
    return `Deployed to ${input.env}`;
  }
}
```

Code skills follow the exact same interface as built-in tools: `name`, `description`, `inputSchema` (Zod), `destructive`, and `call()`. They inherit the same permission model — destructive code skills require user approval.

### Directory Layout

```
~/.anver-code/skills/           # Global skills
  commit.md                      # Prompt skill
  deploy.ts                      # Code skill

<project-root>/.anver-code/skills/  # Project skills (override global)
  review.md
  test-runner.ts
```

When both global and project directories contain a skill with the same name, the project version takes priority.

## Architecture

### Skill Types

```typescript
interface PromptSkill {
  name: string;
  description: string;
  prompt: string;
  source: 'global' | 'project';
}

interface LoadedSkills {
  promptSkills: PromptSkill[];
  codeSkills: BaseTool<any, any>[];
}
```

### Skill Loader (`src/skills/loader.ts`)

A single loader function that:

1. **Scans** the global directory (`~/.anver-code/skills/`) for `.md` and `.ts` files
2. **Scans** the project directory (`.anver-code/skills/` relative to cwd) for `.md` and `.ts` files
3. **Parses `.md` files** — extracts YAML frontmatter (`name`, `description`) and body (prompt text) using a simple frontmatter parser
4. **Loads `.ts` files** — uses `tsx` (TypeScript execute) via `import()` with a loader to handle TypeScript. Alternatively, code skills can be pre-compiled `.js` files. The loader attempts `import()` on the file path — Node.js with the `--import tsx` flag or a bundled `.js` file both work. Validates the default export has `name`, `execute`, and `toToolDefinition` methods
5. **Merges** — builds a name-keyed map. Global skills are added first, project skills overwrite on conflict
6. **Returns** `LoadedSkills` — separate arrays for prompt skills and code skills

```typescript
export async function loadSkills(cwd: string): Promise<LoadedSkills>;
```

**Error handling:** If a skill file fails to parse or load, log a warning and skip it. Never crash the CLI because of a broken skill.

### System Prompt Integration (`src/utils/systemPrompt.ts`)

`buildSystemPrompt()` gains an optional `skills` parameter:

```typescript
export function buildSystemPrompt(cwd: string, skills?: PromptSkill[]): string;
```

When skills are provided, an additional section is appended:

```
# Available Skills
You have access to these custom skills. Suggest them when relevant.
The user can trigger them with slash commands.

- /commit — Analyze changes and create a well-formatted git commit
- /review — Review code changes for quality and correctness
```

Code skills are not listed here — they appear in the tools list automatically since they're registered as tools.

### Slash Command Handling (`src/ui/App.tsx`)

The App component receives prompt skills and extends its slash command handling:

1. When user types `/commit`, App looks up the matching prompt skill
2. If found, injects the prompt as a user message: the skill's prompt text
3. Triggers the query engine as normal — the model sees the prompt and acts on it
4. If no skill matches, shows "Unknown command" (same as today for unknown slash commands)

App's props gain:

```typescript
interface AppProps {
  // ... existing props
  promptSkills: PromptSkill[];
}
```

### Tool Registry Integration (`src/commands/chat.ts`)

`launchChat()` calls the skill loader at startup, then:
- Merges code skills into the tool array: `[...getTools(), ...loadedSkills.codeSkills]`
- Passes prompt skills to both `buildSystemPrompt()` and `App`

### Files Changed

| File | Change |
|------|--------|
| `src/skills/loader.ts` | **New** — skill loader |
| `src/skills/types.ts` | **New** — PromptSkill and LoadedSkills types |
| `src/utils/systemPrompt.ts` | **Modified** — accept and render skills |
| `src/ui/App.tsx` | **Modified** — handle skill slash commands |
| `src/commands/chat.ts` | **Modified** — load skills, merge tools, pass to App |
| `src/commands/skill.ts` | **New** — `anver skill list` and `anver skill create` commands |
| `bin/anver.ts` | **Modified** — register `skill` subcommand |

### Files NOT Changed

- `src/core/query.ts` — no changes, already generic
- `src/core/provider.ts` — no changes
- `src/core/types.ts` — no changes
- `src/core/conversation.ts` — no changes
- `src/tools/BaseTool.ts` — no changes
- `src/tools/index.ts` — no changes (merging happens in chat.ts)

## CLI Commands

### `anver skill list`

Shows all loaded skills grouped by source:

```
Global skills (~/.anver-code/skills/):
  commit       (prompt)  Analyze changes and create a git commit
  deploy       (code)    Deploy to a specified environment

Project skills (.anver-code/skills/):
  review       (prompt)  Review code changes for quality
  test-runner  (code)    Run project test suite

4 skills loaded (2 global, 2 project)
```

### `anver skill create <name>`

Interactive scaffolding:

1. Prompts: "Prompt skill or code skill? [prompt/code]"
2. Prompts: "Global or project? [global/project]"
3. Creates the file from a template
4. Prints the file path

Prompt template:

```markdown
---
name: <name>
description: TODO — describe what this skill does
---

TODO — write the prompt for this skill
```

Code template:

```typescript
import { z } from 'zod';
import { BaseTool } from '../../src/tools/BaseTool.js';

export default class <Name>Tool extends BaseTool<{ input: string }, string> {
  name = '<name>';
  description = 'TODO — describe what this tool does';
  destructive = false;
  inputSchema = z.object({
    input: z.string().describe('TODO — describe this parameter'),
  });

  async call(input: { input: string }): Promise<string> {
    // TODO — implement
    return 'Not implemented yet';
  }
}
```

## Testing Strategy

- **Unit tests** for skill loader — mock filesystem with `.md` and `.ts` skill files, verify parsing, merging, and error handling
- **Unit tests** for system prompt integration — verify skills section is appended correctly
- **Unit tests** for skill CLI commands — verify list output format, create file generation
- **Integration test** — load skills, verify code skills appear in tool definitions, verify prompt skills respond to slash commands
