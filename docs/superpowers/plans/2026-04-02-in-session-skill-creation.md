# In-Session Skill Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users create skills conversationally in the CLI — the model uses WriteFile, the app auto-reloads skills so `/name` works immediately.

**Architecture:** Two changes: (1) add a "Creating Skills" section to the system prompt so the model knows the format and directories, (2) in App.tsx, convert `promptSkills` to state and reload skills after any `write_file` tool result that targets a skills directory.

**Tech Stack:** TypeScript, React Ink, Vitest

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/utils/systemPrompt.ts` | Modify | Add "Creating Skills" section when skills param is provided |
| `test/core/systemPrompt.test.ts` | Modify | Test the new section appears/doesn't appear |
| `src/ui/App.tsx` | Modify | Convert `promptSkills` to state, reload after write_file to skills dir |
| `src/skills/loader.ts` | No change | Already has `loadSkills(cwd, globalSkillsDir?)` — reused as-is |

**Files NOT changed:** `src/core/query.ts`, `src/skills/types.ts`, `src/commands/chat.ts`, `src/commands/skill.ts`, `bin/anver.ts`

---

### Task 1: System Prompt — Skill Creation Instructions

**Files:**
- Modify: `src/utils/systemPrompt.ts:32-41`
- Test: `test/core/systemPrompt.test.ts`

- [ ] **Step 1: Write failing tests for the skill creation section**

Add to `test/core/systemPrompt.test.ts`, inside the existing `describe('systemPrompt')` block:

```typescript
it('includes skill creation instructions when skills are provided', () => {
  const skills: PromptSkill[] = [
    { name: 'commit', description: 'Create a git commit', prompt: 'Do it.', source: 'global' },
  ];
  const prompt = buildSystemPrompt(tmpDir, skills);
  expect(prompt).toContain('# Creating Skills');
  expect(prompt).toContain('.anver-code/skills/');
  expect(prompt).toContain('write_file');
});

it('does not include skill creation instructions when no skills provided', () => {
  const prompt = buildSystemPrompt(tmpDir);
  expect(prompt).not.toContain('Creating Skills');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/core/systemPrompt.test.ts`
Expected: FAIL — "Creating Skills" not found in output

- [ ] **Step 3: Add the Creating Skills section to buildSystemPrompt**

In `src/utils/systemPrompt.ts`, add this block after the existing "Available Skills" section (after line 41, before the `return`):

```typescript
  if (skills) {
    sections.push(`# Creating Skills
You can create new prompt skills for the user. A skill is a markdown file with YAML frontmatter.

Format:
\`\`\`
---
name: skill-name
description: One-line description
---

The prompt text that will be injected when the user runs /skill-name.
\`\`\`

Directories:
- Project-local (default): ${path.join(cwd, '.anver-code', 'skills')}/
- Global: ~/.anver-code/skills/

Use the write_file tool to create the .md file. Default to project-local unless the user asks for global.
After creating a skill, tell the user it is available via /skill-name.`);
  }
```

Note: this block uses `if (skills)` (not `skills.length > 0`) so the section appears even when no skills exist yet — the user might want to create their first skill. The "Available Skills" section above already checks `skills.length > 0` so it won't show an empty list.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/core/systemPrompt.test.ts`
Expected: PASS — all 9 tests green

- [ ] **Step 5: Commit**

```bash
git add src/utils/systemPrompt.ts test/core/systemPrompt.test.ts
git commit -m "feat(skills): add skill creation instructions to system prompt"
```

---

### Task 2: Auto-Reload Skills After WriteFile

**Files:**
- Modify: `src/ui/App.tsx:5,23,43,66-73,141-146`

- [ ] **Step 1: Import loadSkills and add helper to check skills path**

At the top of `src/ui/App.tsx`, add the import:

```typescript
import { loadSkills } from '../skills/loader.js';
```

Add a helper function before the `App` component (after the `PendingTool` interface, around line 33):

```typescript
function isSkillsPath(filePath: string, cwd: string): boolean {
  const projectSkillsDir = `${cwd}/.anver-code/skills/`;
  const globalSkillsDir = `${process.env.ANVER_CODE_HOME ?? `${process.env.HOME}/.anver-code`}/skills/`;
  return filePath.startsWith(projectSkillsDir) || filePath.startsWith(globalSkillsDir);
}
```

- [ ] **Step 2: Convert promptSkills from prop to state**

In the `App` component, add state for `currentSkills` initialized from the prop. Add this alongside the existing state declarations (after line 73):

```typescript
const [currentSkills, setCurrentSkills] = useState(promptSkills);
```

- [ ] **Step 3: Update all references from `promptSkills` to `currentSkills`**

Replace all usages of `promptSkills` in the component body with `currentSkills`:

1. The `skillCommandsHelp` computation (line 47): change `promptSkills.length` and `promptSkills.map` to `currentSkills.length` and `currentSkills.map`
2. The skill slash command lookup in `handleSubmit` (line 208): change `promptSkills.find` to `currentSkills.find`
3. The `handleSubmit` dependency array (line 229): change `promptSkills` to `currentSkills`

- [ ] **Step 4: Add skill reload logic to the tool_result handler**

In the `processQuery` callback, update the `tool_result` case (around line 141-146). Track the last tool's args using a variable in `processQuery` scope, and reload skills when a write to a skills directory is detected:

Replace the existing `tool_result` / `tool_error` case:

```typescript
            case 'tool_result':
            case 'tool_error': {
              setRunningToolName(null);
              syncMessages();
              setAppState('streaming');
              break;
            }
```

With:

```typescript
            case 'tool_result': {
              setRunningToolName(null);
              syncMessages();
              setAppState('streaming');

              // Reload skills if a file was written to a skills directory
              if (event.toolName === 'write_file' && event.result.startsWith('Written ')) {
                const writtenPath = event.result.slice('Written '.length);
                if (isSkillsPath(writtenPath, cwd)) {
                  loadSkills(cwd).then((loaded) => {
                    setCurrentSkills(loaded.promptSkills);
                  }).catch(() => {
                    // Non-fatal — skill reload failure shouldn't break the session
                  });
                }
              }
              break;
            }

            case 'tool_error': {
              setRunningToolName(null);
              syncMessages();
              setAppState('streaming');
              break;
            }
```

- [ ] **Step 5: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 6: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass (except the pre-existing config.test.ts model mismatch)

- [ ] **Step 7: Commit**

```bash
git add src/ui/App.tsx
git commit -m "feat(skills): auto-reload skills after writing to skills directory"
```

---

### Task 3: Verify End-to-End

- [ ] **Step 1: Build**

Run: `npx tsup`
Expected: Clean build

- [ ] **Step 2: Run full test suite one more time**

Run: `npx vitest run`
Expected: All tests pass (except pre-existing config model mismatch)

- [ ] **Step 3: Commit the spec and plan**

```bash
git add docs/superpowers/specs/2026-04-02-in-session-skill-creation.md docs/superpowers/plans/2026-04-02-in-session-skill-creation.md
git commit -m "docs: add in-session skill creation spec and plan"
```
