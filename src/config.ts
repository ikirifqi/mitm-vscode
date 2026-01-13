/**
 * Configuration management for the extension
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ProxyConfig } from './types';

export class ConfigManager {
  private static readonly configSection = 'mitm-vscode';

  /**
   * Get the current proxy configuration from VS Code settings
   */
  static getProxyConfig(context: vscode.ExtensionContext): ProxyConfig {
    const config = vscode.workspace.getConfiguration(this.configSection);

    let blacklistPath = config.get<string>('blacklistPath', '');

    // If no custom path, use default blacklist.json in extension root
    if (!blacklistPath) {
      blacklistPath = path.join(context.extensionPath, 'blacklist.json');
    } else if (!path.isAbsolute(blacklistPath)) {
      // Resolve relative paths from workspace root
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (workspaceRoot) {
        blacklistPath = path.join(workspaceRoot, blacklistPath);
      }
    }

    return {
      port: config.get<number>('proxyPort', 8866),
      blacklistPath,
      responseStatus: config.get<number>('blockedResponseStatus', 204),
      responseBody: config.get<string>('blockedResponseBody', ''),
      logBlocked: config.get<boolean>('logBlocked', true),
      idleTimeout: config.get<number>('idleTimeout', 60),
      mitmproxyPath: config.get<string>('mitmproxyPath', ''),
    };
  }

  /**
   * Check if interception is enabled
   */
  static isEnabled(): boolean {
    const config = vscode.workspace.getConfiguration(this.configSection);
    return config.get<boolean>('enabled', false);
  }

  /**
   * Set enabled state
   */
  static async setEnabled(enabled: boolean): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.configSection);
    await config.update('enabled', enabled, vscode.ConfigurationTarget.Global);
  }

  /**
   * Get mitmproxy executable path
   */
  static getMitmproxyPath(customPath?: string): string {
    if (customPath && fs.existsSync(customPath)) {
      return customPath;
    }

    // Try common locations and PATH
    return 'mitmdump'; // Will use PATH
  }

  /**
   * Validate blacklist file exists
   */
  static validateBlacklistFile(path: string): boolean {
    return fs.existsSync(path);
  }

  /**
   * Get VS Code's HTTP proxy settings
   */
  static getVSCodeProxySettings(): { http?: string; https?: string } {
    const config = vscode.workspace.getConfiguration('http');
    return {
      http: config.get<string>('proxy', ''),
      https: config.get<string>('proxy', ''),
    };
  }

  /**
   * Set VS Code's HTTP proxy settings
   */
  static async setVSCodeProxy(proxyUrl: string): Promise<void> {
    const config = vscode.workspace.getConfiguration('http');
    await config.update('proxy', proxyUrl, vscode.ConfigurationTarget.Global);
  }

  /**
   * Clear VS Code's HTTP proxy settings
   */
  static async clearVSCodeProxy(): Promise<void> {
    const config = vscode.workspace.getConfiguration('http');
    await config.update('proxy', '', vscode.ConfigurationTarget.Global);
  }
}
