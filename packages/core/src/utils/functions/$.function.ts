import { exec } from 'node:child_process';
import { promisify } from 'node:util';

export async function $(command: string): Promise<string> {
  const { stdout, stderr } = await promisify(exec)(command);

  return stdout.trim() || stderr.trim();
}
