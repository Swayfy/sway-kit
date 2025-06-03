import util from 'node:util';
import { Inject } from '../injector/decorators/inject.decorator.ts';
import { StateManager } from '../state/state-manager.service.ts';

@Inject([StateManager])
export class Logger {
  constructor(private readonly stateManager: StateManager) {}

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

  public success(message: string): void {
    if (!this.stateManager.state.logger.enabled) {
      return;
    }

    console.log(util.styleText('green', message));
  }

  public warn(message: string): void {
    if (!this.stateManager.state.logger.enabled) {
      return;
    }

    console.warn(util.styleText('yellowBright', message));
  }
}
