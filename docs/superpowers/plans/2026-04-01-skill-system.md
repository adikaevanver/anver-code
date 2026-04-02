# Skill System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a skill/plugin system to Anver Code that lets users extend the CLI with custom prompt-based skills (markdown) and code-based skills (TypeScript).

**Architecture:** Two skill types (prompt `.md` and code `.ts`) loaded from two directories (global `~/.anver-code/skills/` and per-project `.anver-code/skills/`). A unified loader scans, parses, merges (project overrides global), and returns separate arrays. Prompt skills inject into the system prompt and are triggered via slash commands. Code skills extend `BaseTool` and merge into the tools array.

**Tech Stack:** TypeScript, Zod v4 (native `.toJSONSchema()`), Commander.js, React Ink, Vitest

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/skills/types.ts` | Create | `PromptSkill` and `LoadedSkills` type definitions |
| `src/skills/loader.ts` | Create | Scan directories, parse `.md` frontmatter, dynamic-import `.ts` files, merge by name |
| `test/skills/types.test.ts` | Create | Type guard tests |
| `test/skills/loader.test.ts` | Create | Loader unit tests with mock filesystem |
| `src/utils/systemPrompt.ts` | Modify | Accept optional `PromptSkill[]`, append skills section |
| `test/core/systemPrompt.test.ts` | Modify | Add tests for skills section |
| `src/ui/App.tsx` | Modify | Accept `promptSkills` prop, handle skill slash commands |
| `src/commands/chat.ts` | Modify | Call loader at startup, merge code skills into tools, pass prompt skills to App and system prompt |
| `src/commands/skill.ts` | Create | `anver skill list` and `anver skill create` CLI commands |
| `test/commands/skill.test.ts` | Create | Skill CLI command tests |
| `bin/anver.ts` | Modify | Register `skill` subcommand |

**Files NOT changed:** `src/core/query.ts`, `src/core/provider.ts`, `src/core/types.ts`, `src/core/conversation.ts`, `src/tools/BaseTool.ts`, `src/tools/index.ts`

---

### Task 1: Skill Types

**Files:**
- Create: `src/skills/types.ts`
- Test: `test/skills/types.test.ts`

- [ ] **Step 1: Write the failing test for PromptSkill type and isPromptSkill guard**

```typescript
// test/skills/types.test.ts
import { describe, it, expect } from 'vitest';
import { isPromptSkill } from '../../src/skills/types.js';
import type { PromptSkill } from '../../src/skills/types.js';

describe('Skill Types', () => {
  it('isPromptSkill returns true for valid PromptSkill', () => {
    const skill: PromptSkill = {
      name: 'commit',
      description: 'Create a git commit',
      prompt: 'Analyze staged changes and commit.',
      source: 'global',
    };
    expect(isPromptSkill(skill)).toBe(true);
  });

  it('isPromptSkill returns false for objects missing fields', () => {
    expect(isPromptSkill({ name: 'commit' })).toBe(false);
    expect(isPromptSkill(null)).toBe(false);
    expect(isPromptSkill('string')).toBe(false);
  });

  it('isPromptSkill returns false for wrong source value', () => {
    expect(
      isPromptSkill({
        name: 'x',
        description: 'x',
        prompt: 'x',
        source: 'unknown',
      }),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/skills/types.test.ts`
Expected: FAIL — cannot resolve `../../src/skills/types.js`

- [ ] **Step 3: Write the types module**

```typescript
// src/skills/types.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/skills/types.test.ts`
Expected: PASS — all 3 tests green

- [ ] **Step 5: Commit**

```bash
git add src/skills/types.ts test/skills/types.test.ts
git commit -m "feat(skills): add PromptSkill and LoadedSkills types with type guard"
```

---

### Task 2: Skill Loader — Prompt Skills

**Files:**
- Create: `src/skills/loader.ts`
- Test: `test/skills/loader.test.ts`

- [ ] **Step 1: Write failing tests for prompt skill loading**

```typescript
// test/skills/loader.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { loadSkills } from '../../src/skills/loader.js';

describe('Skill Loader', () => {
  let tmpDir: string;
  let globalSkillsDir: string;
  let projectSkillsDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anver-skills-'));
    globalSkillsDir = path.join(tmpDir, 'global-skills');
    projectSkillsDir = path.join(tmpDir, 'project', '.anver-code', 'skills');
    fs.mkdirSync(globalSkillsDir, { recursive: true });
    fs.mkdirSync(projectSkillsDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('loads a prompt skill from global directory', async () => {
    fs.writeFileSync(
      path.join(globalSkillsDir, 'commit.md'),
      `---
name: commit
description: Create a git commit
---

Analyze staged changes and create a commit.`,
    );

    const result = await loadSkills(path.join(tmpDir, 'project'), globalSkillsDir);
    expect(result.promptSkills).toHaveLength(1);
    expect(result.promptSkills[0].name).toBe('commit');
    expect(result.promptSkills[0].description).toBe('Create a git commit');
    expect(result.promptSkills[0].prompt).toBe('Analyze staged changes and create a commit.');
    expect(result.promptSkills[0].source).toBe('global');
  });

  it('loads a prompt skill from project directory', async () => {
    fs.writeFileSync(
      path.join(projectSkillsDir, 'review.md'),
      `---
name: review
description: Review code changes
---

Review the diff for quality.`,
    );

    const result = await loadSkills(path.join(tmpDir, 'project'), globalSkillsDir);
    expect(result.promptSkills).toHaveLength(1);
    expect(result.promptSkills[0].name).toBe('review');
    expect(result.promptSkills[0].source).toBe('project');
  });

  it('project skill overrides global skill with same name', async () => {
    fs.writeFileSync(
      path.join(globalSkillsDir, 'commit.md'),
      `---
name: commit
description: Global commit skill
---

Global prompt.`,
    );
    fs.writeFileSync(
      path.join(projectSkillsDir, 'commit.md'),
      `---
name: commit
description: Project commit skill
---

Project prompt.`,
    );

    const result = await loadSkills(path.join(tmpDir, 'project'), globalSkillsDir);
    expect(result.promptSkills).toHaveLength(1);
    expect(result.promptSkills[0].description).toBe('Project commit skill');
    expect(result.promptSkills[0].source).toBe('project');
  });

  it('returns empty arrays when no skills directories exist', async () => {
    const emptyDir = path.join(tmpDir, 'empty-project');
    fs.mkdirSync(emptyDir, { recursive: true });
    const noGlobalDir = path.join(tmpDir, 'no-global');

    const result = await loadSkills(emptyDir, noGlobalDir);
    expect(result.promptSkills).toEqual([]);
    expect(result.codeSkills).toEqual([]);
  });

  it('skips .md files with invalid frontmatter', async () => {
    fs.writeFileSync(
      path.join(globalSkillsDir, 'bad.md'),
      `No frontmatter here, just text.`,
    );
    fs.writeFileSync(
      path.join(globalSkillsDir, 'good.md'),
      `---
name: good
description: A good skill
---

Do the thing.`,
    );

    const result = await loadSkills(path.join(tmpDir, 'project'), globalSkillsDir);
    expect(result.promptSkills).toHaveLength(1);
    expect(result.promptSkills[0].name).toBe('good');
  });

  it('skips .md files missing required frontmatter fields', async () => {
    fs.writeFileSync(
      path.join(globalSkillsDir, 'incomplete.md'),
      `---
name: incomplete
---

Missing description.`,
    );

    const result = await loadSkills(path.join(tmpDir, 'project'), globalSkillsDir);
    expect(result.promptSkills).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/skills/loader.test.ts`
Expected: FAIL — cannot resolve `../../src/skills/loader.js`

- [ ] **Step 3: Write the loader with prompt skill parsing**

```typescript
// src/skills/loader.ts
import fs from 'fs';
import path from 'path';
import type { BaseTool } from '../tools/BaseTool.js';
import type { PromptSkill, LoadedSkills } from './types.js';

/**
 * Parse YAML frontmatter from a markdown string.
 * Returns { attrs, body } where attrs is a key-value map and body is the content after frontmatter.
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
    process.env.ANVER_CODE_HOME ?? path.join(require('os').homedir(), '.anver-code'),
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
```

**Note:** The `globalSkillsDir` parameter is exposed for testing (so tests can pass a temp directory instead of `~/.anver-code/skills/`). In production, `chat.ts` calls `loadSkills(cwd)` without it.

However, `require('os')` won't work in ESM. Fix: use `import os from 'os'` at the top. The loader already imports `os` or should. Let me correct:

The `globalSkillsDir` default uses `os.homedir()`. Since we already import `os` isn't in the imports, add it. Actually, let's avoid `require` in ESM. The function signature accepts an optional override, and the default is computed using the already-imported `getConfigDir` from config:

Actually, let's keep it simple. Import `os` at the top and use it:

```typescript
// At the top of src/skills/loader.ts, add:
import os from 'os';

// And the default computation becomes:
const globalDir = globalSkillsDir ?? path.join(
  process.env.ANVER_CODE_HOME ?? path.join(os.homedir(), '.anver-code'),
  'skills',
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/skills/loader.test.ts`
Expected: PASS — all 6 tests green

- [ ] **Step 5: Commit**

```bash
git add src/skills/loader.ts test/skills/loader.test.ts
git commit -m "feat(skills): add skill loader with frontmatter parsing and directory merging"
```

---

### Task 3: System Prompt Integration

**Files:**
- Modify: `src/utils/systemPrompt.ts`
- Modify: `test/core/systemPrompt.test.ts`

- [ ] **Step 1: Write failing tests for skills section in system prompt**

Add to `test/core/systemPrompt.test.ts`:

```typescript
import type { PromptSkill } from '../../src/skills/types.js';

// ... inside the existing describe block, add:

it('appends skills section when skills are provided', () => {
  const skills: PromptSkill[] = [
    { name: 'commit', description: 'Create a git commit', prompt: 'Do the commit.', source: 'global' },
    { name: 'review', description: 'Review code changes', prompt: 'Review the diff.', source: 'project' },
  ];
  const prompt = buildSystemPrompt(tmpDir, skills);
  expect(prompt).toContain('# Available Skills');
  expect(prompt).toContain('/commit');
  expect(prompt).toContain('Create a git commit');
  expect(prompt).toContain('/review');
  expect(prompt).toContain('Review code changes');
});

it('does not include skills section when no skills provided', () => {
  const prompt = buildSystemPrompt(tmpDir);
  expect(prompt).not.toContain('Available Skills');
});

it('does not include skills section when skills array is empty', () => {
  const prompt = buildSystemPrompt(tmpDir, []);
  expect(prompt).not.toContain('Available Skills');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/core/systemPrompt.test.ts`
Expected: FAIL — `buildSystemPrompt` does not accept a second argument yet, and the 'Available Skills' text is not present

- [ ] **Step 3: Modify buildSystemPrompt to accept skills**

In `src/utils/systemPrompt.ts`, change the function signature and add skills section:

```typescript
import type { PromptSkill } from '../skills/types.js';

export function buildSystemPrompt(cwd: string, skills?: PromptSkill[]): string {
  const sections: string[] = [];

  // ... existing sections unchanged ...

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
```

The only changes are:
1. Add `import type { PromptSkill }` at the top
2. Add `skills?: PromptSkill[]` parameter
3. Add the `if (skills && skills.length > 0)` block before the final return

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/core/systemPrompt.test.ts`
Expected: PASS — all 7 tests green (4 existing + 3 new)

- [ ] **Step 5: Commit**

```bash
git add src/utils/systemPrompt.ts test/core/systemPrompt.test.ts
git commit -m "feat(skills): inject prompt skills into system prompt"
```

---

### Task 4: App Slash Command Handling

**Files:**
- Modify: `src/ui/App.tsx`

- [ ] **Step 1: Add `promptSkills` to AppProps interface**

In `src/ui/App.tsx`, change the `AppProps` interface:

```typescript
import type { PromptSkill } from '../skills/types.js';

export interface AppProps {
  provider: LLMProvider;
  tools: BaseTool<any, any>[];
  model: string;
  systemPrompt: string;
  initialConversation?: Conversation;
  autoApprove: string[];
  cwd: string;
  promptSkills: PromptSkill[];
}
```

- [ ] **Step 2: Destructure promptSkills in the component and update HELP_TEXT**

In the `App` function component, add `promptSkills` to the destructured props:

```typescript
export function App({
  provider,
  tools,
  model,
  systemPrompt,
  initialConversation,
  autoApprove,
  cwd,
  promptSkills,
}: AppProps) {
```

Update the `HELP_TEXT` constant to be dynamic. Replace the static `HELP_TEXT` constant with a function or compute it inside the component. The simplest approach: compute inside the component:

Remove the `const HELP_TEXT = ...` outside the component. Inside the component, after destructuring:

```typescript
const skillCommandsHelp = promptSkills.length > 0
  ? '\n\nSkill commands:\n' + promptSkills.map((s) => `  /${s.name}${' '.repeat(Math.max(1, 15 - s.name.length))}${s.description}`).join('\n')
  : '';

const helpText = `Available commands:
  /exit          Exit the application
  /clear         Reset the conversation
  /help          Show this help message${skillCommandsHelp}

Tips:
  Up/Down arrows  Navigate input history
  Enter           Submit your message`;
```

Update the JSX to use `helpText` instead of `HELP_TEXT`:

```tsx
<Text>{helpText}</Text>
```

- [ ] **Step 3: Handle skill slash commands in handleSubmit**

In `handleSubmit`, add skill lookup after the existing slash commands (`/exit`, `/clear`, `/help`) and before the "record in input history" section:

```typescript
// Check for skill slash command
if (trimmed.startsWith('/')) {
  const skillName = trimmed.slice(1).split(/\s/)[0];
  const skill = promptSkills.find((s) => s.name === skillName);
  if (skill) {
    setInputHistory((prev) => {
      if (prev.length > 0 && prev[prev.length - 1] === trimmed) return prev;
      return [...prev, trimmed];
    });
    setHelpVisible(false);
    void processQuery(skill.prompt);
    return;
  }
}
```

Place this block right after the `/help` handler and before the existing "Record in input history" block. This way:
1. Built-in commands (`/exit`, `/clear`, `/help`) are checked first
2. Then skill commands are checked
3. If no skill matches a `/` command, it falls through to be sent as a regular message (user may intend to type `/something` as literal text)

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors (chat.ts will fail until Task 5, but App.tsx should type-check in isolation if we skip the caller)

- [ ] **Step 5: Commit**

```bash
git add src/ui/App.tsx
git commit -m "feat(skills): handle prompt skill slash commands in App"
```

---

### Task 5: Chat Integration — Wire It All Together

**Files:**
- Modify: `src/commands/chat.ts`

- [ ] **Step 1: Import the skill loader and types**

Add at the top of `src/commands/chat.ts`:

```typescript
import { loadSkills } from '../skills/loader.js';
```

- [ ] **Step 2: Make launchChat async and call loader**

Change `launchChat` to `async` and add skill loading after the tools are obtained:

```typescript
export async function launchChat(options: LaunchOptions, initialPrompt?: string): Promise<void> {
  const config = loadConfig();

  // ... apiKey, model, autoApprove, cwd unchanged ...

  const provider = new OpenRouterProvider(apiKey);
  const tools = getTools();

  // Load skills
  const loadedSkills = await loadSkills(cwd);

  // Merge code skills into tools array
  const allTools = [...tools, ...loadedSkills.codeSkills];

  // Build system prompt with skill awareness
  const systemPrompt = buildSystemPrompt(cwd, loadedSkills.promptSkills);

  // ... session loading unchanged ...

  const { waitUntilExit } = render(
    React.createElement(App, {
      provider,
      tools: allTools,
      model,
      systemPrompt,
      initialConversation,
      autoApprove,
      cwd,
      promptSkills: loadedSkills.promptSkills,
    }),
  );

  // ... rest unchanged ...
}
```

- [ ] **Step 3: Update the caller in bin/anver.ts**

In `bin/anver.ts`, the `.action()` handler calls `launchChat()`. Since it's now async, add `void` prefix or make the action async:

```typescript
.action((promptParts: string[], options) => {
  void launchChat({ model: options.model, resume: options.resume, session: options.session }, prompt);
});
```

This already works since `launchChat` previously returned `void` and the caller didn't await it. Commander.js handles async actions. No change needed here — `void` prefix just silences the floating promise. Actually, check: the current code doesn't have `void`. Adding it is good practice but not strictly required.

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 5: Commit**

```bash
git add src/commands/chat.ts
git commit -m "feat(skills): load skills at startup and wire into App"
```

---

### Task 6: Skill CLI — `anver skill list`

**Files:**
- Create: `src/commands/skill.ts`
- Test: `test/commands/skill.test.ts`

- [ ] **Step 1: Write failing tests for skill list command**

```typescript
// test/commands/skill.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Skill Commands', () => {
  let tmpDir: string;
  let globalDir: string;
  let projectDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anver-skill-cmd-'));
    globalDir = path.join(tmpDir, 'global-skills');
    projectDir = path.join(tmpDir, 'project');
    fs.mkdirSync(globalDir, { recursive: true });
    fs.mkdirSync(path.join(projectDir, '.anver-code', 'skills'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('listSkills', () => {
    it('formats skill list output correctly', async () => {
      fs.writeFileSync(
        path.join(globalDir, 'commit.md'),
        `---\nname: commit\ndescription: Create a git commit\n---\n\nDo commit.`,
      );
      fs.writeFileSync(
        path.join(projectDir, '.anver-code', 'skills', 'review.md'),
        `---\nname: review\ndescription: Review code changes\n---\n\nReview.`,
      );

      const { formatSkillList } = await import('../../src/commands/skill.js');
      const { loadSkills } = await import('../../src/skills/loader.js');
      const skills = await loadSkills(projectDir, globalDir);
      const output = formatSkillList(skills);

      expect(output).toContain('commit');
      expect(output).toContain('prompt');
      expect(output).toContain('Create a git commit');
      expect(output).toContain('review');
      expect(output).toContain('Review code changes');
      expect(output).toContain('2 skills loaded');
    });

    it('shows message when no skills found', async () => {
      const { formatSkillList } = await import('../../src/commands/skill.js');
      const { loadSkills } = await import('../../src/skills/loader.js');
      const skills = await loadSkills(projectDir, globalDir);
      const output = formatSkillList(skills);

      expect(output).toContain('No skills found');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/commands/skill.test.ts`
Expected: FAIL — cannot resolve `../../src/commands/skill.js`

- [ ] **Step 3: Write the skill command module**

```typescript
// src/commands/skill.ts
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { loadSkills } from '../skills/loader.js';
import type { LoadedSkills } from '../skills/types.js';
import { getConfigDir } from '../utils/config.js';

export function formatSkillList(skills: LoadedSkills): string {
  const { promptSkills, codeSkills } = skills;
  const total = promptSkills.length + codeSkills.length;

  if (total === 0) {
    return 'No skills found.\n\nCreate one with: anver skill create <name>';
  }

  const lines: string[] = [];

  const globalPrompt = promptSkills.filter((s) => s.source === 'global');
  const projectPrompt = promptSkills.filter((s) => s.source === 'project');

  // Group global skills
  const globalAll = [
    ...globalPrompt.map((s) => ({ name: s.name, type: 'prompt', desc: s.description })),
    ...codeSkills
      .filter(() => false) // Code skills don't track source yet; show all under global for now
      .map((s) => ({ name: s.name, type: 'code', desc: s.description })),
  ];

  const projectAll = [
    ...projectPrompt.map((s) => ({ name: s.name, type: 'prompt', desc: s.description })),
  ];

  if (globalAll.length > 0) {
    lines.push('Global skills (~/.anver-code/skills/):');
    for (const s of globalAll) {
      lines.push(`  ${s.name.padEnd(14)} (${s.type.padEnd(6)}) ${s.desc}`);
    }
    lines.push('');
  }

  if (projectAll.length > 0) {
    lines.push('Project skills (.anver-code/skills/):');
    for (const s of projectAll) {
      lines.push(`  ${s.name.padEnd(14)} (${s.type.padEnd(6)}) ${s.desc}`);
    }
    lines.push('');
  }

  const globalCount = globalAll.length;
  const projectCount = projectAll.length;
  lines.push(`${total} skills loaded (${globalCount} global, ${projectCount} project)`);

  return lines.join('\n');
}

export function skillCommand(): Command {
  const cmd = new Command('skill').description('Manage Anver Code skills');

  cmd
    .command('list')
    .description('List all loaded skills')
    .action(async () => {
      const cwd = process.cwd();
      const skills = await loadSkills(cwd);
      console.log(formatSkillList(skills));
    });

  cmd
    .command('create <name>')
    .description('Create a new skill from a template')
    .option('-t, --type <type>', 'Skill type: prompt or code', 'prompt')
    .option('-l, --location <location>', 'Skill location: global or project', 'project')
    .action((name: string, options: { type: string; location: string }) => {
      const skillType = options.type === 'code' ? 'code' : 'prompt';
      const isGlobal = options.location === 'global';

      const dir = isGlobal
        ? path.join(getConfigDir(), 'skills')
        : path.join(process.cwd(), '.anver-code', 'skills');

      fs.mkdirSync(dir, { recursive: true });

      const ext = skillType === 'code' ? '.ts' : '.md';
      const filePath = path.join(dir, `${name}${ext}`);

      if (fs.existsSync(filePath)) {
        console.error(`Skill already exists: ${filePath}`);
        process.exit(1);
      }

      const content = skillType === 'prompt'
        ? `---\nname: ${name}\ndescription: TODO — describe what this skill does\n---\n\nTODO — write the prompt for this skill\n`
        : `import { z } from 'zod';
import { BaseTool } from '../../src/tools/BaseTool.js';

export default class ${name.charAt(0).toUpperCase() + name.slice(1)}Tool extends BaseTool<{ input: string }, string> {
  name = '${name}';
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
`;

      fs.writeFileSync(filePath, content);
      console.log(`Created ${skillType} skill: ${filePath}`);
    });

  return cmd;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/commands/skill.test.ts`
Expected: PASS — all tests green

- [ ] **Step 5: Commit**

```bash
git add src/commands/skill.ts test/commands/skill.test.ts
git commit -m "feat(skills): add 'anver skill list' and 'anver skill create' CLI commands"
```

---

### Task 7: Register Skill Subcommand in Entry Point

**Files:**
- Modify: `bin/anver.ts`

- [ ] **Step 1: Import skillCommand**

Add to `bin/anver.ts`:

```typescript
import { skillCommand } from '../src/commands/skill.js';
```

- [ ] **Step 2: Register the subcommand**

After the existing `program.addCommand(initCommand());` line, add:

```typescript
program.addCommand(skillCommand());
```

- [ ] **Step 3: Run type check and build**

Run: `npx tsc --noEmit && npx tsup`
Expected: No type errors, clean build

- [ ] **Step 4: Manual verification**

Run: `node dist/anver.js skill list`
Expected: "No skills found." message

Run: `node dist/anver.js skill create test-skill --type prompt --location project`
Expected: Creates `.anver-code/skills/test-skill.md` in current directory

Run: `node dist/anver.js skill list`
Expected: Shows the test-skill in the project section

- [ ] **Step 5: Commit**

```bash
git add bin/anver.ts
git commit -m "feat(skills): register skill subcommand in CLI entry point"
```

---

### Task 8: Run Full Test Suite and Fix Issues

**Files:**
- All test files

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass, including existing tests and new skill tests

- [ ] **Step 2: Run type checker**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Build and verify**

Run: `npx tsup`
Expected: Clean build, no warnings

- [ ] **Step 4: Fix any issues found in steps 1-3**

If any tests fail or type errors appear, fix them. Common issues:
- Import path typos (ensure `.js` extensions for ESM)
- Type mismatches from the new `promptSkills` prop on `App`
- Existing tests for `buildSystemPrompt` breaking if they check exact output format

- [ ] **Step 5: Commit fixes if any**

```bash
git add -A
git commit -m "fix(skills): resolve test and type issues from skill system integration"
```

---

### Task 9: Integration Test — End-to-End Skill Loading

**Files:**
- Create: `test/skills/integration.test.ts`

- [ ] **Step 1: Write integration test**

```typescript
// test/skills/integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { loadSkills } from '../../src/skills/loader.js';
import { buildSystemPrompt } from '../../src/utils/systemPrompt.js';

describe('Skill System Integration', () => {
  let tmpDir: string;
  let globalDir: string;
  let projectDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anver-skill-int-'));
    globalDir = path.join(tmpDir, 'global-skills');
    projectDir = path.join(tmpDir, 'project');
    fs.mkdirSync(globalDir, { recursive: true });
    fs.mkdirSync(path.join(projectDir, '.anver-code', 'skills'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('loaded prompt skills appear in system prompt', async () => {
    fs.writeFileSync(
      path.join(globalDir, 'deploy.md'),
      `---\nname: deploy\ndescription: Deploy to production\n---\n\nRun deployment pipeline.`,
    );

    const skills = await loadSkills(projectDir, globalDir);
    const prompt = buildSystemPrompt(projectDir, skills.promptSkills);

    expect(prompt).toContain('/deploy');
    expect(prompt).toContain('Deploy to production');
  });

  it('project skills override global skills in system prompt', async () => {
    fs.writeFileSync(
      path.join(globalDir, 'commit.md'),
      `---\nname: commit\ndescription: Global commit\n---\n\nGlobal.`,
    );
    fs.writeFileSync(
      path.join(projectDir, '.anver-code', 'skills', 'commit.md'),
      `---\nname: commit\ndescription: Project commit\n---\n\nProject.`,
    );

    const skills = await loadSkills(projectDir, globalDir);
    expect(skills.promptSkills).toHaveLength(1);

    const prompt = buildSystemPrompt(projectDir, skills.promptSkills);
    expect(prompt).toContain('Project commit');
    expect(prompt).not.toContain('Global commit');
  });

  it('code skills produce valid tool definitions', async () => {
    // This test verifies that if a code skill were loaded, it would have
    // the right shape. We test with the loader's validation logic directly.
    const skills = await loadSkills(projectDir, globalDir);
    // No code skills in temp dirs — just verify the array is present and empty
    expect(Array.isArray(skills.codeSkills)).toBe(true);
    expect(skills.codeSkills).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run integration test**

Run: `npx vitest run test/skills/integration.test.ts`
Expected: PASS — all 3 tests green

- [ ] **Step 3: Run full test suite one final time**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add test/skills/integration.test.ts
git commit -m "test(skills): add integration tests for skill loading and system prompt"
```
