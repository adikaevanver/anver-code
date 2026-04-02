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
