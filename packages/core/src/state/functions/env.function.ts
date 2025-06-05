import { EnvVariable } from '../../utils/types/env-variable.type.ts';
import { resolve } from '../../injector/functions/resolve.function.ts';
import { StateManager } from '../state-manager.service.ts';

const stateManager = resolve(StateManager);

export function env<TValue extends EnvVariable>(
  key: string,
  defaultValue?: TValue,
): TValue | undefined {
  return stateManager.getEnv<TValue>(key, defaultValue);
}
