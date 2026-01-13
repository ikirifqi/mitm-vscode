/**
 * Type definitions for the MITM VS Code extension
 */

export interface BlacklistPattern {
  type: 'exact' | 'domain' | 'path' | 'regex' | 'body' | 'body-allow';
  value: string;
  description?: string;
}

export interface BlacklistConfig {
  patterns: BlacklistPattern[];
}

export interface ProxyConfig {
  port: number;
  blacklistPath: string;
  responseStatus: number;
  responseBody: string;
  logBlocked: boolean;
  idleTimeout: number;
  mitmproxyPath?: string;
}

export interface ProxyStatus {
  running: boolean;
  port?: number;
  pid?: number;
}
