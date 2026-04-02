import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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
