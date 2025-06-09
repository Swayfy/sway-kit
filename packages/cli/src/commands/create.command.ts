import { exec } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import util from 'node:util';
// @ts-ignore
import download from 'github-directory-downloader';
import { Command } from '../interfaces/command.interface.ts';

export class CreateCommand implements Command {
  public async handle(
    args: Record<string, unknown>,
    positionals: string[],
  ): Promise<number> {
    let name = positionals[1];

    const readlineApi = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    if (!name) {
      name =
        (await readlineApi.question(
          util.styleText('blue', 'What should this project be called? '),
        )) ?? 'untitled-project';
    }

    const packageManager =
      (await readlineApi.question(
        util.styleText(
          'blue',
          `What package manager do you use? (${util.styleText(['bold'], 'npm')} / yarn / pnpm) `,
        ),
      )) || 'npm';

    console.info(util.styleText('gray', 'Downloading files...'));

    await download(
      'https://github.com/Swayfy/sway-kit/tree/main/packages/skeleton',
      path.join(process.cwd(), ...(name === '.' ? [] : [name])),
      { muteLog: true },
    );

    console.info(util.styleText('gray', 'Preparing project...'));

    if (name !== '.') {
      process.chdir(name);
    }

    await util.promisify(exec)('cp .env.example .env');

    const env = await fs.readFile(path.join(process.cwd(), '.env'), 'utf8');

    await fs.writeFile(
      path.join(process.cwd(), '.env'),
      env.replace(
        'ENCRYPTION_KEY=',
        `ENCRYPTION_KEY=${crypto.randomUUID().replaceAll('-', '')}`,
      ),
      'utf8',
    );

    console.info(util.styleText('gray', 'Installing packages...'));

    await util.promisify(exec)(`${packageManager} install`);

    console.info(
      util.styleText(['bold', 'green'], `Created new project ${name}`),
    );

    console.info(
      util.styleText(
        ['white'],
        `[Run ${util.styleText(['bold'], `cd ${name}`)} and ${util.styleText(
          ['bold'],
          `${packageManager}${packageManager === 'npm' ? ' run' : ''} dev`,
        )} to start]`,
      ),
    );

    return 0;
  }
}
