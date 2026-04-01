#!/usr/bin/env node
import { Command } from 'commander';
import { configCommand } from '../src/commands/config.js';
import { initCommand } from '../src/commands/init.js';
import { launchChat } from '../src/commands/chat.js';

const program = new Command()
  .name('anver')
  .description('Anver Code — AI coding assistant powered by free LLMs')
  .version('0.1.0')
  .option('-m, --model <model>', 'Override default model')
  .option('-r, --resume', 'Resume last session')
  .option('-s, --session <path>', 'Load a specific session')
  .option('-v, --verbose', 'Show debug output')
  .argument('[prompt...]', 'Initial prompt')
  .action((promptParts: string[], options) => {
    const prompt = promptParts.length > 0 ? promptParts.join(' ') : undefined;
    launchChat({ model: options.model, resume: options.resume, session: options.session }, prompt);
  });

program.addCommand(configCommand());
program.addCommand(initCommand());
program.parse();
