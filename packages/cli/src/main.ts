#!/usr/bin/env node

import packageData from '../package.json' with { type: 'json' };
import util from 'node:util';
import { Constructor } from './interfaces/constructor.interface.ts';
import { CreateCommand } from './commands/create.command.ts';
import { Command } from './interfaces/command.interface.ts';

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

  const exitCode = await new commands[
    commandName as keyof typeof commands
  ]().handle(values, positionals);

  process.exit(exitCode);
} catch (error) {
  console.error(util.styleText('red', (error as Error).message));

  process.exit(1);
}
