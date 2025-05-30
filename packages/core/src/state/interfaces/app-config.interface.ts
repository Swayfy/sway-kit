export interface AppConfig {
  encryption: {
    key: string;
  };
  host: string;
  isProduction: boolean;
  logger: {
    enabled: boolean;
  };
  port: number;
}
