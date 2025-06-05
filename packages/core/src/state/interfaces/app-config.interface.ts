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
  host: string;
  http2: boolean;
  isProduction: boolean;
  logger: {
    enabled: boolean;
    staticFileRequests: boolean;
  };
  poweredByHeader: boolean;
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
