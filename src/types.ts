/**
 * Type definitions for the MITM VS Code extension
 */

export interface BlacklistPattern {
  type: 'exact' | 'domain' | 'path' | 'regex';
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
  mitmproxyPath?: string;
}

export interface ProxyStatus {
  running: boolean;
  port?: number;
  pid?: number;
}
