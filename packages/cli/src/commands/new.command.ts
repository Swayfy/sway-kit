import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import util from 'node:util';
import { pluralize, singularize } from 'inflection';
import { kebabCase, pascalCase } from 'case-anything';
import { Command } from '../interfaces/command.interface.ts';

export class NewCommand implements Command {
  public async handle(
    flags: Record<string, unknown>,
    [, type, name]: string[],
  ): Promise<number> {
    const splittedFileModule = name.split('/');
    const directory =
      splittedFileModule.length > 1
        ? kebabCase(splittedFileModule[0])
        : kebabCase(pluralize(splittedFileModule[0]));

    name = singularize(
      splittedFileModule.length > 1
        ? splittedFileModule[1]
        : splittedFileModule[0],
    );

    if (!fs.existsSync(path.join('src', directory))) {
      await fsp.mkdir(path.join('src', directory), { recursive: true });
    }

    switch (type) {
      case 'channel': {
        await fsp.writeFile(
          path.join(process.cwd(), 'src', directory, `${name}.${type}.ts`),
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
          path.join(process.cwd(), 'src', directory, `${name}.${type}.ts`),
          `import { Controller, Route } from '@sway-kit/core';

export class ${pascalCase(name)}Controller extends Controller {
  @Route.Get('/${kebabCase(pluralize(name))}')
  public async index() {
    return await this.render('${kebabCase(name)}');
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
          path.join(process.cwd(), 'src', directory, `${name}.${type}.ts`),
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

      default: {
        throw new Error(`Invalid file type '${type}'`);
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
