import { EnvVariable } from '../../utils/types/env-variable.type.ts';

export function env<TValue extends EnvVariable>(
  key: string,
  defaultValue?: TValue,
): TValue | null | undefined {
  if (!(key in process.env)) {
    return defaultValue;
  }

  try {
    return JSON.parse(process.env[key]?.toString() ?? 'null') as
      | TValue
      | null
      | undefined;
  } catch {
    return process.env[key] as TValue;
  }
}
