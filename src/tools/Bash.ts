import { spawnSync } from 'child_process';
import { z } from 'zod';
import { BaseTool } from './BaseTool.js';

const BashInput = z.object({
  command: z.string().describe('The shell command to execute'),
  timeout: z.number().int().min(1).optional().describe('Timeout in milliseconds'),
});

type BashInputType = z.infer<typeof BashInput>;

interface BashOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export class BashTool extends BaseTool<BashInputType, BashOutput> {
  name = 'bash';
  description = 'Execute a shell command and return stdout, stderr, and exit code.';
  destructive = true;
  inputSchema = BashInput;

  async call(input: BashInputType): Promise<BashOutput> {
    const result = spawnSync('/bin/sh', ['-c', input.command], {
      timeout: input.timeout,
      env: process.env,
      encoding: 'utf-8',
    });

    if (result.error) {
      throw new Error(
        result.error.message.includes('ETIMEDOUT') || (result.error as any).code === 'ETIMEDOUT'
          ? `Command timed out after ${input.timeout}ms: ${input.command}`
          : result.error.message
      );
    }

    if (result.signal === 'SIGTERM' || result.signal === 'SIGKILL') {
      throw new Error(`Command timed out after ${input.timeout}ms: ${input.command}`);
    }

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 0,
    };
  }
}
