import { StateManager } from '../state-manager.service.ts';
import { EnvVariable } from '../../utils/types/env-variable.type.ts';
import { resolve } from '../../injector/functions/resolve.function.ts';

const stateManager = resolve(StateManager);

export function env<TValue extends EnvVariable>(
  key: string,
): TValue | undefined {
  return stateManager.getEnv<TValue>(key);
}
