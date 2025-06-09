#!/usr/bin/env node

import packageData from '../package.json' with { type: 'json' };
import util from 'node:util';
import { Command } from './interfaces/command.interface.ts';
import { Constructor } from './interfaces/constructor.interface.ts';
import { CreateCommand } from './commands/create.command.ts';
import { NewCommand } from './commands/new.command.ts';

try {
  const { values, positionals } = util.parseArgs({
    allowPositionals: true,
    options: {
      version: {
        type: 'boolean',
        short: 'v',
      },
    },
  });

  const commands: Record<string, Constructor<Command>> = {
    create: CreateCommand,
    new: NewCommand,
  };

  if (values.version && !positionals.length) {
    console.info(
      util.styleText(
        ['bold', 'blue'],
        `SwayKit CLI version ${packageData.version}`,
      ),
    );

    process.exit();
  }

  const commandName = positionals[0];

  if (!(commandName in commands)) {
    throw new Error(`Unknown command '${commandName}'`);
  }

  const result = new commands[commandName as keyof typeof commands]().handle(
    values,
    positionals,
  );

  process.exit(result instanceof Promise ? await result : result);
} catch (error) {
  console.error(util.styleText('red', (error as Error).message));

  process.exit(1);
}
