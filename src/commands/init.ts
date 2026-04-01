import { Command } from 'commander';
import fs from 'fs';
import path from 'path';

export function initCommand() {
  return new Command('init')
    .description('Initialize a project with .anvercode config')
    .action(() => {
      const cwd = process.cwd();
      const filePath = path.join(cwd, '.anvercode');
      if (fs.existsSync(filePath)) {
        console.log('.anvercode already exists');
        return;
      }
      const template = `# Anver Code Project Instructions
# Add project-specific instructions here.
# These will be included in the system prompt.
`;
      fs.writeFileSync(filePath, template);
      console.log(`Created ${filePath}`);
    });
}
