import chalk from 'chalk';
import { Inject } from '../injector/decorators/inject.decorator.ts';
import { StateManager } from '../state/state-manager.service.ts';

@Inject([StateManager])
export class Logger {
  constructor(private readonly stateManager: StateManager) {}

  public info(message: string): void {
    if (!this.stateManager.state.logger.enabled) {
      return;
    }

    console.log(chalk.blue(message));
  }

  public error(message: string): void {
    if (!this.stateManager.state.logger.enabled) {
      return;
    }

    console.error(chalk.red(message));
  }

  public warn(message: string): void {
    if (!this.stateManager.state.logger.enabled) {
      return;
    }

    console.warn(chalk.yellow(message));
  }
}
