export interface AppConfig {
  cache: {
    enabled: boolean;
    maxAge: number;
  };
  contentSecurityPolicy: {
    allowInlineScripts: boolean;
    allowInlineStyles: boolean;
    allowedOrigins: string[];
    enabled: boolean;
  };
  cookies: {
    maxAge: number;
  };
  cors: {
    allowCredentials: boolean;
    allowedHeaders: string[];
    allowedMethods: string[];
    allowedOrigins: string[];
    exposedHeaders: string[];
    maxAge: number;
  };
  encryption: {
    key: string;
  };
  globalHeaders: Record<string, string>;
  host: string;
  hotReload: {
    enabled: boolean;
    watchSourceChanges: boolean;
  };
  http2: boolean;
  isProduction: boolean;
  logger: {
    enabled: boolean;
    staticFileRequests: boolean;
    webSocketConnections: boolean;
  };
  staticFilesDirectory: string;
  tls: {
    certFile: string;
    enabled: boolean;
    keyFile: string;
  };
  port: number;
  webSocket: {
    enabled: boolean;
    port: number;
  };
}
