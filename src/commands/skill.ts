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

  const globalAll = [
    ...globalPrompt.map((s) => ({ name: s.name, type: 'prompt', desc: s.description })),
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
