import { AppConfig } from './interfaces/app-config.interface.ts';
import { DeepPartial } from '../utils/types/deep-partial.type.ts';
import { env } from './functions/env.function.ts';
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
          maxAge: env<number>('COOKIE_MAX_AGE') ?? 30,
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
          key: env<string>('ENCRYPTION_KEY') ?? crypto.randomUUID(),
        },
        host: env<string>('HOST') ?? 'localhost',
        hotReload: {
          enabled: true,
          watchSourceChanges: true,
        },
        http2: env<boolean>('HTTP_2') ?? false,
        isProduction: env<boolean>('PRODUCTION') ?? false,
        logger: {
          enabled: true,
          staticFileRequests: false,
        },
        poweredByHeader: false,
        staticFilesDirectory: 'public',
        tls: {
          certFile: env<string>('TLS_CERT') ?? 'cert.pem',
          enabled: env<boolean>('TLS') ?? false,
          keyFile: env<string>('TLS_KEY') ?? 'key.pem',
        },
        port: env<number>('PORT') ?? 5000,
        webSocket: {
          enabled: true,
          port: env<number>('WEB_SOCKET_PORT') ?? 6000,
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
