import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import util from 'node:util';
import { pluralize, singularize } from 'inflection';
import { capitalCase, kebabCase, pascalCase } from 'case-anything';
import { Command } from '../interfaces/command.interface.ts';

interface Flags {}

export class NewCommand implements Command {
  private readonly readlineApi: readline.Interface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  public async handle(flags: Flags, [, type, name]: string[]): Promise<number> {
    if (!['channel', 'controller', 'module'].includes(type)) {
      throw new Error(`Invalid file type`);
    }

    if (!name) {
      name =
        (await this.readlineApi.question(
          util.styleText('blue', `Enter ${type} name: `),
        )) || `empty-${type}`;
    }

    const splittedFileModule = name.split('/');

    name =
      splittedFileModule.length > 1
        ? splittedFileModule[1]
        : singularize(splittedFileModule[0]);

    const directory = kebabCase(splittedFileModule[0]);

    if (!fs.existsSync(path.join('src', directory))) {
      await fsp.mkdir(path.join('src', directory), { recursive: true });
    }

    const filePath = path.join(
      process.cwd(),
      'src',
      directory,
      `${name}.${type}.ts`,
    );

    if (fs.existsSync(filePath)) {
      throw new Error(`${capitalCase(type)} named '${name}' already exists`);
    }

    switch (type) {
      case 'channel': {
        await fsp.writeFile(
          filePath,
          `import { Channel, ChannelName } from '@sway-kit/core';

@ChannelName('${kebabCase(pluralize(name))}/:id')
export class ${pascalCase(name)}Channel extends Channel {
  public override authorize(): boolean {
    return true;
  }

  public sendMessage() {
    this.broadcast({
      message: 'Hello from ${pascalCase(name)}Channel',
    });
  }
}
`,
          'utf8',
        );

        break;
      }

      case 'controller': {
        await fsp.writeFile(
          filePath,
          `import { Controller, Route } from '@sway-kit/core';

export class ${pascalCase(name)}Controller extends Controller {
  @Route.Get('/${kebabCase(pluralize(name))}')
  public async index() {
    return await this.render('${kebabCase(pluralize(name))}');
  }

  @Route.Get('/${kebabCase(pluralize(name))}/:id')
  public async show([id]: string[]) {
    return await this.render('${kebabCase(name)}', {
      id,
    });
  }
}
`,
          'utf8',
        );

        break;
      }

      case 'module': {
        await fsp.writeFile(
          filePath,
          `import { Module } from '@sway-kit/core';

export class ${pascalCase(name)}Module implements Module {
  public readonly controllers = [
    
  ];
}
`,
          'utf8',
        );

        break;
      }
    }

    console.info(
      util.styleText(
        ['bold', 'green'],
        `Created new ${name} ${type} ${util.styleText(['gray'], `[src/${directory}/${name}.${type}.ts]`)}`,
      ),
    );

    return 0;
  }
}
