import util from 'node:util';
import { Inject } from '../injector/decorators/inject.decorator.ts';
import { StateManager } from '../state/state-manager.service.ts';

@Inject([StateManager])
export class Logger {
  constructor(private readonly stateManager: StateManager) {}

  public clear(): void {
    console.clear();
  }

  public info(message: string): void {
    if (!this.stateManager.state.logger.enabled) {
      return;
    }

    console.log(util.styleText('blue', message));
  }

  public error(message: string): void {
    if (!this.stateManager.state.logger.enabled) {
      return;
    }

    console.error(util.styleText('red', message));
  }

  public raw(...messages: string[]): void {
    console.log(...messages);
  }

  public success(message: string): void {
    if (!this.stateManager.state.logger.enabled) {
      return;
    }

    console.log(util.styleText('green', message));
  }

  public table(data: unknown): void {
    console.table(data);
  }

  public warn(message: string): void {
    if (!this.stateManager.state.logger.enabled) {
      return;
    }

    console.warn(util.styleText('yellowBright', message));
  }
}
