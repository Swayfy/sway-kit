import { AppConfig } from './interfaces/app-config.interface.ts';
import { DeepPartial } from '../utils/types/deep-partial.type.ts';
import { EnvVariable } from '../utils/types/env-variable.type.ts';
import { Utils } from '../utils/utils.class.ts';

export class StateManager {
  private configuration?: AppConfig;

  private validateConfiguration(): void {
    if (this.state.encryption.key.length < 16) {
      throw new Error(
        'Encryption key length must be greater than or equal to 16',
      );
    }

    if (this.state.tls.enabled) {
      if (!this.state.tls.certFile || !this.state.tls.keyFile) {
        throw new Error(
          'TLS is enabled but certFile or keyFile is not set in the configuration',
        );
      }

      if (
        !this.state.tls.certFile.endsWith('.pem') ||
        !this.state.tls.keyFile.endsWith('.pem')
      ) {
        throw new Error('TLS configuration files must be in PEM format');
      }
    }
  }

  public getEnv<TValue extends EnvVariable>(
    key: string,
    defaultValue?: TValue,
  ): TValue | undefined {
    if (!(key in process.env)) {
      return defaultValue;
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
      this.configuration = {
        cache: {
          enabled: true,
          maxAge: 0,
        },
        contentSecurityPolicy: {
          allowInlineScripts: false,
          allowInlineStyles: true,
          allowedOrigins: [],
          enabled: true,
        },
        cookies: {
          maxAge: this.getEnv<number>('COOKIE_MAX_AGE') ?? 30,
        },
        cors: {
          allowCredentials: false,
          allowedHeaders: [],
          allowedMethods: ['*'],
          allowedOrigins: ['*'],
          exposedHeaders: [],
          maxAge: 0,
        },
        encryption: {
          key: this.getEnv<string>('ENCRYPTION_KEY') ?? crypto.randomUUID(),
        },
        host: this.getEnv<string>('HOST') ?? 'localhost',
        hotReload: {
          enabled: true,
          watchSourceChanges: true,
        },
        http2: this.getEnv<boolean>('HTTP_2') ?? false,
        isProduction: this.getEnv<boolean>('PRODUCTION') ?? false,
        logger: {
          enabled: true,
          staticFileRequests: false,
        },
        poweredByHeader: false,
        staticFilesDirectory: 'public',
        tls: {
          certFile: this.getEnv<string>('TLS_CERT') ?? 'cert.pem',
          enabled: false,
          keyFile: this.getEnv<string>('TLS_KEY') ?? 'key.pem',
        },
        port: this.getEnv<number>('PORT') ?? 5000,
        webSocket: {
          enabled: true,
          port: this.getEnv<number>('WEB_SOCKET_PORT') ?? 6000,
        },
      };
    }

    return this.configuration;
  }

  public set(keyInDotNotation: string, value: unknown): void {
    const keys = keyInDotNotation.split('.');

    let current = this.state;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i] as keyof AppConfig]) {
        (current[keys[i] as keyof AppConfig] as unknown) = {};
      }

      (current as unknown) = current[keys[i] as keyof AppConfig];
    }

    (current[keys[keys.length - 1] as keyof AppConfig] as unknown) = value;
  }
}
