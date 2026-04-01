import { Command } from 'commander';
import { loadConfig, saveConfig, getConfigValue, setConfigValue } from '../utils/config.js';

export function configCommand() {
  const cmd = new Command('config').description('Manage Anver Code configuration');

  cmd.command('set <key> <value>')
    .description('Set a configuration value')
    .action((key: string, value: string) => {
      if (key === 'autoApprove') {
        setConfigValue(key as any, value.split(','));
      } else {
        setConfigValue(key as any, value);
      }
      console.log(`Set ${key} = ${value}`);
    });

  cmd.command('get <key>')
    .description('Get a configuration value')
    .action((key: string) => {
      const val = getConfigValue(key as any);
      if (val === undefined) {
        console.log(`${key} is not set`);
      } else {
        console.log(`${key} = ${Array.isArray(val) ? val.join(', ') : val}`);
      }
    });

  cmd.command('list')
    .description('Show all configuration')
    .action(() => {
      const config = loadConfig();
      const display = { ...config, apiKey: config.apiKey ? '***' : '(not set)' };
      console.log(JSON.stringify(display, null, 2));
    });

  return cmd;
}
