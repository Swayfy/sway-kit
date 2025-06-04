export interface AppConfig {
  cache: {
    enabled: boolean;
    maxAge: number;
  };
  contentSecurityPolicy: {
    allowInlineScripts: boolean;
    allowInlineStyles: boolean;
    allowedOrigins: string[];
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
  isProduction: boolean;
  logger: {
    enabled: boolean;
    staticFileRequests: boolean;
  };
  poweredByHeader: boolean;
  staticFilesDirectory: string;
  tls: {
    cert: string | false;
    certFile: string | false;
    enabled: boolean;
    key: string | false;
    keyFile: string | false;
  };
  port: number;
  webSocket: {
    enabled: boolean;
    port: number;
  };
}
