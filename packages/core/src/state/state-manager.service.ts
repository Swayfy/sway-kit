import { AppConfig } from './interfaces/app-config.interface.ts';
import { DeepPartial } from '../utils/types/deep-partial.type.ts';
import { EnvVariable } from '../utils/types/env-variable.type.ts';
import { Inject } from '../injector/decorators/inject.decorator.ts';
import { Logger } from '../logger/logger.service.ts';
import { Utils } from '../utils/utils.class.ts';

@Inject([Logger])
export class StateManager {
  private configuration?: AppConfig;

  constructor(private readonly logger: Logger) {}

  private validateConfiguration(): void {
    if (this.state.encryption.key.length < 16) {
      throw new Error(
        'Encryption key length must be greater than or equal to 16',
      );
    }
  }

  public getEnv<TValue extends EnvVariable>(key: string): TValue | undefined {
    if (!(key in process.env)) {
      return undefined;
    }

    try {
      return JSON.parse(process.env[key]?.toString() ?? 'null') as
        | TValue
        | undefined;
    } catch {
      return process.env[key] as TValue;
    }
  }

  public option<TValue = string>(
    entry: keyof AppConfig,
    defaultValue: TValue,
  ): TValue {
    return (this.state[entry] as TValue) ?? defaultValue;
  }

  public setup(configuration: DeepPartial<AppConfig> = {}): this {
    this.configuration = Utils.mergeDeep(this.state, configuration);

    this.validateConfiguration();

    return this;
  }

  public get state(): AppConfig {
    if (!this.configuration) {
      if (!this.getEnv<string>('ENCRYPTION_KEY')) {
        this.logger.warn(
          'No encryption key found in environment variables. A random UUID will be used.',
        );
      }

      this.configuration = {
        encryption: {
          key: this.getEnv<string>('ENCRYPTION_KEY') ?? crypto.randomUUID(),
        },
        host: this.getEnv<string>('HOST') ?? 'localhost',
        isProduction: this.getEnv<boolean>('PRODUCTION') ?? false,
        logger: {
          enabled: true,
        },
        port: this.getEnv<number>('PORT') ?? 5050,
      };
    }

    return this.configuration;
  }

  public set(keyInDotNotation: string, value: unknown): void {
    const keys = keyInDotNotation.split('.');

    let current = this.state;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }

      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
  }
}
