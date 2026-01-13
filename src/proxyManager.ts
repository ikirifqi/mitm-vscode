/**
 * Proxy Manager - Handles mitmproxy lifecycle
 */

import * as vscode from 'vscode';
import * as childProcess from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { ProxyConfig, ProxyStatus } from './types';
import { ConfigManager } from './config';

export class ProxyManager {
  private process: childProcess.ChildProcess | null = null;
  private outputChannel: vscode.OutputChannel;
  private config: ProxyConfig | null = null;
  private context: vscode.ExtensionContext;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private lastActivityTime: number = Date.now();
  private activityCheckInterval: NodeJS.Timeout | null = null;
  private proxyPid: number | null = null;

  constructor(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
    this.context = context;
    this.outputChannel = outputChannel;
  }

  /**
   * Start health check polling
   * Checks every 5 seconds if proxy is running, detects orphaned processes
   */
  startHealthCheck(config: ProxyConfig): void {
    // Clear any existing intervals to prevent leaks
    this.stopHealthCheck();

    this.outputChannel.appendLine('[MITM] Starting health check (polls every 5 seconds)');

    this.healthCheckInterval = setInterval(async () => {
      try {
        const portInUse = await this.checkPortInUse(config.port);

        if (!portInUse) {
          // Proxy is not running - start it
          if (!this.ownsProxy()) {
            this.outputChannel.appendLine(
              '[MITM] ═══════════════════════════════════════════════════'
            );
            this.outputChannel.appendLine('[MITM] Health check: Proxy not running!');
            this.outputChannel.appendLine('[MITM] This window is taking over proxy ownership');
            this.outputChannel.appendLine(
              '[MITM] ═══════════════════════════════════════════════════'
            );
            this.outputChannel.show(true);

            const started = await this.startProxyProcess(config);

            if (started) {
              this.outputChannel.appendLine('[MITM] ✓ This window now owns the proxy');
              this.outputChannel.appendLine('[MITM] ✓ Proxy logs will appear here');

              vscode.window
                .showInformationMessage(
                  'MITM: This window took over proxy ownership',
                  'Show Logs'
                )
                .then((action) => {
                  if (action === 'Show Logs') {
                    this.outputChannel.show(true);
                  }
                });
            }
          }
        } else if (portInUse && !this.ownsProxy()) {
          // Port is in use by another process - check if it's orphaned
          const isOrphaned = await this.isProxyOrphaned(config.port);

          if (isOrphaned) {
            this.outputChannel.appendLine('[MITM] ═══════════════════════════════════════════════════');
            this.outputChannel.appendLine('[MITM] Health check: Detected orphaned proxy!');
            this.outputChannel.appendLine('[MITM] Original owner window closed but process still running');
            this.outputChannel.appendLine('[MITM] Killing orphaned process and taking over...');
            this.outputChannel.appendLine('[MITM] ═══════════════════════════════════════════════════');
            this.outputChannel.show(true);

            // Kill orphaned process
            await this.killProcessOnPort(config.port);

            // Wait a bit for port to be released
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Start new proxy
            const started = await this.startProxyProcess(config);

            if (started) {
              this.outputChannel.appendLine('[MITM] ✓ Killed orphaned proxy and took ownership');
              this.outputChannel.appendLine('[MITM] ✓ Proxy logs now appear here');

              vscode.window.showInformationMessage(
                'MITM: Restarted orphaned proxy - logs now in this window',
                'Show Logs'
              ).then((action) => {
                if (action === 'Show Logs') {
                  this.outputChannel.show(true);
                }
              });
            }
          }
        } else if (this.ownsProxy()) {
          // We own the proxy - check if it's still alive
          if (!this.process || this.process.killed) {
            this.outputChannel.appendLine('[MITM] Health check: Our proxy died, restarting...');
            this.outputChannel.show(true);
            await this.startProxyProcess(config);
          }
        }
      } catch (error) {
        this.outputChannel.appendLine(`[MITM] Health check error: ${error}`);
      }
    }, 5000); // Check every 5 seconds

    // Start idle timeout monitoring if configured
    if (config.idleTimeout > 0) {
      this.startIdleMonitoring(config.idleTimeout);
    }
  }

  /**
   * Stop health check polling
   */
  stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      this.outputChannel.appendLine('[MITM] Stopped health check');
    }

    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
      this.activityCheckInterval = null;
      this.outputChannel.appendLine('[MITM] Stopped idle monitoring');
    }
  }

  /**
   * Start idle timeout monitoring
   * Stops proxy if no activity within configured minutes
   */
  private startIdleMonitoring(timeoutMinutes: number): void {
    // Clear existing interval to prevent leaks
    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
    }

    this.lastActivityTime = Date.now();
    this.outputChannel.appendLine(
      `[MITM] Starting idle monitoring (timeout: ${timeoutMinutes} minutes)`
    );

    // Check every minute
    this.activityCheckInterval = setInterval(() => {
      const now = Date.now();
      const idleMinutes = (now - this.lastActivityTime) / (1000 * 60);

      if (idleMinutes >= timeoutMinutes && this.ownsProxy()) {
        this.outputChannel.appendLine(
          `[MITM] Idle timeout reached (${Math.floor(idleMinutes)} minutes of inactivity)`
        );
        this.outputChannel.appendLine('[MITM] Stopping proxy due to inactivity...');

        // Stop proxy and health check
        this.stop().then(() => {
          vscode.window.showInformationMessage(
            `MITM: Proxy stopped due to ${timeoutMinutes}min inactivity`
          );
        });
      }
    }, 60000); // Check every minute
  }

  /**
   * Update last activity timestamp (called when proxy handles requests)
   */
  private updateActivity(): void {
    this.lastActivityTime = Date.now();
  }

  /**
   * Start the mitmproxy server and health check
   */
  async start(config: ProxyConfig): Promise<boolean> {
    // Store config for isRunning() check
    this.config = config;

    // Check if proxy is already running on the port (from another VS Code window)
    this.outputChannel.appendLine('[MITM] Checking if proxy is already running...');
    const isPortInUse = await this.checkPortInUse(config.port);

    if (isPortInUse) {
      this.outputChannel.appendLine('[MITM] ✓ Proxy is already running on port ' + config.port);
      this.outputChannel.appendLine('[MITM] ✓ Using shared proxy from another window');

      // Configure this window to use the existing proxy (if not already configured)
      const currentProxy = ConfigManager.getVSCodeProxySettings();
      if (!currentProxy.http || !currentProxy.http.includes(`127.0.0.1:${config.port}`)) {
        await this.configureVSCodeProxy(config.port);
      }

      // Start health check to monitor and restart if needed
      this.startHealthCheck(config);

      this.outputChannel.appendLine('[MITM] ✓ This window is now using the shared proxy');
      this.outputChannel.appendLine('[MITM] ✓ Health check started');
      return true;
    }

    // Port is free - try to start proxy
    this.outputChannel.appendLine('[MITM] Port is free, attempting to start proxy...');
    const started = await this.startProxyProcess(config);

    if (started) {
      // Successfully started - configure and start health check
      await this.configureVSCodeProxy(config.port);
      this.startHealthCheck(config);
      return true;
    }

    // Failed to start - might be race condition
    // Check if another window started it while we were trying
    this.outputChannel.appendLine(
      '[MITM] Failed to start, checking if another window succeeded...'
    );
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const nowInUse = await this.checkPortInUse(config.port);
    if (nowInUse) {
      this.outputChannel.appendLine('[MITM] ✓ Another window started the proxy (race condition)');
      this.outputChannel.appendLine('[MITM] ✓ Using shared proxy');
      await this.configureVSCodeProxy(config.port);
      this.startHealthCheck(config);
      return true;
    }

    // Really failed
    this.outputChannel.appendLine('[MITM] ✗ Failed to start proxy');
    return false;
  }

  /**
   * Actually start the mitmdump process
   * Simplified version without complex race condition handling
   */
  private async startProxyProcess(config: ProxyConfig): Promise<boolean> {
    // Validate blacklist file
    if (!ConfigManager.validateBlacklistFile(config.blacklistPath)) {
      this.outputChannel.appendLine(`[MITM] Blacklist not found: ${config.blacklistPath}`);
      return false;
    }

    // Check if mitmproxy is installed
    const mitmproxyPath = ConfigManager.getMitmproxyPath(config.mitmproxyPath);

    try {
      childProcess.execSync(`${mitmproxyPath} --version`, {
        stdio: 'pipe',
        timeout: 5000,
      });
    } catch (error) {
      this.outputChannel.appendLine('[MITM] mitmproxy not found');
      return false;
    }

    // Prepare addon script path
    const addonPath = path.join(this.context.extensionPath, 'mitm_addon.py');

    if (!fs.existsSync(addonPath)) {
      this.outputChannel.appendLine(`[MITM] Addon not found: ${addonPath}`);
      return false;
    }

    // Prepare arguments
    const args = [
      '--listen-port',
      config.port.toString(),
      '--set',
      `blacklist_config=${config.blacklistPath}`,
      '--set',
      `response_status=${config.responseStatus}`,
      '--set',
      `response_body=${config.responseBody}`,
      '--set',
      `log_blocked=${config.logBlocked}`,
      '-s',
      addonPath,
      '--ssl-insecure',
    ];

    this.outputChannel.appendLine(`[MITM] Starting proxy on port ${config.port}...`);

    try {
      // Start mitmdump process
      // IMPORTANT: detached: false ensures process is killed when parent (VS Code) exits
      this.process = childProcess.spawn(mitmproxyPath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
        // On Windows, windowsHide prevents console window
        windowsHide: true,
      });

      // Simple Promise - wait for success or failure
      const started = await new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => {
          if (this.process && !this.process.killed) {
            // Still running after 2 seconds = success
            resolve(true);
          } else {
            resolve(false);
          }
        }, 2000);

        // Handle stdout - show in output channel and check for blocked requests
        this.process!.stdout?.on('data', (data) => {
          const output = data.toString();
          this.outputChannel.append(output);

          // Update activity timestamp
          this.updateActivity();

          // Parse blocked request logs
          this.parseBlockedRequests(output);
        });

        // Handle stderr
        this.process!.stderr?.on('data', (data) => {
          this.outputChannel.append(data.toString());
        });

        // Handle process exit
        this.process!.on('exit', (code, signal) => {
          clearTimeout(timeout);
          if (code !== 0) {
            this.outputChannel.appendLine(`[MITM] Process exited: code ${code}, signal ${signal}`);
            this.process = null;
            resolve(false);
          }
        });

        // Handle process errors
        this.process!.on('error', (error: any) => {
          clearTimeout(timeout);
          this.outputChannel.appendLine(`[MITM] Process error: ${error.message}`);
          this.process = null;
          resolve(false);
        });
      });

      if (started) {
        // Store PID for orphan detection
        this.proxyPid = this.process?.pid || null;

        this.outputChannel.appendLine('[MITM] ✓ Proxy started successfully');
        this.outputChannel.appendLine(`[MITM] ✓ Process PID: ${this.proxyPid}`);
        this.outputChannel.appendLine('[MITM] ✓ This window now owns the proxy process');
        this.outputChannel.appendLine(
          '[MITM] ✓ Proxy stdout/stderr will appear in this output channel'
        );
        return true;
      } else {
        this.outputChannel.appendLine('[MITM] ✗ Proxy failed to start (likely port conflict)');
        return false;
      }
    } catch (error) {
      this.outputChannel.appendLine(`[MITM] Error starting proxy: ${error}`);
      return false;
    }
  }

  /**
   * Stop the mitmproxy server and health check
   */
  async stop(): Promise<void> {
    // Stop health check first
    this.stopHealthCheck();

    // Clear proxy settings for this window
    await this.clearVSCodeProxy();

    // If we own the proxy process, stop it
    // Other windows will detect this and restart if needed (via their health check)
    if (this.process) {
      this.outputChannel.appendLine('[MITM] Stopping proxy process (owned by this window)...');

      try {
        this.process.kill('SIGTERM');

        // Wait for graceful shutdown
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            if (this.process) {
              this.process.kill('SIGKILL');
            }
            resolve();
          }, 3000);

          if (this.process) {
            this.process.on('exit', () => {
              clearTimeout(timeout);
              resolve();
            });
          } else {
            clearTimeout(timeout);
            resolve();
          }
        });

        this.process = null;
        this.outputChannel.appendLine('[MITM] Proxy stopped');
        this.outputChannel.appendLine('[MITM] Other windows will auto-restart if needed');
      } catch (error) {
        this.outputChannel.appendLine(`[MITM] Error stopping proxy: ${error}`);
      }
    } else {
      this.outputChannel.appendLine('[MITM] Not owning proxy, just clearing settings');
    }

    this.config = null;
    this.proxyPid = null;
  }

  /**
   * Restart the proxy with current config
   */
  async restart(): Promise<boolean> {
    await this.stop();

    if (this.config) {
      return await this.start(this.config);
    }

    return false;
  }

  /**
   * Check if proxy process is orphaned (owner window closed)
   * An orphaned proxy has no VS Code window that owns it
   */
  private async isProxyOrphaned(port: number): Promise<boolean> {
    try {
      if (process.platform === 'win32') {
        // Windows: harder to detect orphans, skip this check
        return false;
      }

      // Get process info for port
      const { execSync } = require('child_process');
      const pidOutput = execSync(`lsof -ti :${port} 2>/dev/null || echo ""`, {
        encoding: 'utf-8',
      }).trim();

      if (!pidOutput) {
        return false; // No process on port
      }

      const pid = parseInt(pidOutput);

      // Check if this PID has any VS Code parent
      // If the proxy's parent VS Code window closed, proxy becomes orphaned
      try {
        const ppidOutput = execSync(`ps -o ppid= -p ${pid} 2>/dev/null || echo ""`, {
          encoding: 'utf-8',
        }).trim();

        if (!ppidOutput) {
          return true; // Can't find parent - likely orphaned
        }

        const ppid = parseInt(ppidOutput);

        // Check if parent is still running and is a VS Code/Electron process
        const parentName = execSync(`ps -o comm= -p ${ppid} 2>/dev/null || echo ""`, {
          encoding: 'utf-8',
        }).trim();

        // If parent is not Electron/Code/node, it's orphaned
        if (!parentName || (!parentName.includes('Electron') && !parentName.includes('Code') && !parentName.includes('node'))) {
          return true;
        }

        return false;
      } catch {
        // Error checking parent - assume orphaned to be safe
        return true;
      }
    } catch (error) {
      // Can't determine - assume not orphaned
      return false;
    }
  }

  /**
   * Kill process on specific port
   */
  private async killProcessOnPort(port: number): Promise<void> {
    try {
      if (process.platform !== 'win32') {
        const { execSync } = require('child_process');
        execSync(`lsof -ti :${port} | xargs kill -9 2>/dev/null || true`, { stdio: 'ignore' });
        this.outputChannel.appendLine(`[MITM] Killed process on port ${port}`);
      }
    } catch (error) {
      this.outputChannel.appendLine(`[MITM] Error killing process: ${error}`);
    }
  }

  /**
   * Check if proxy is running (either owned by this window or shared)
   */
  isRunning(): boolean {
    // If this window owns the process
    if (this.process !== null && !this.process.killed) {
      return true;
    }

    // If this window is using a shared proxy
    // We stored config when we configured to use shared proxy
    if (this.config) {
      return true;
    }

    return false;
  }

  /**
   * Check if this window owns the proxy process
   */
  ownsProxy(): boolean {
    return this.process !== null && !this.process.killed;
  }

  /**
   * Get proxy status
   */
  getStatus(): ProxyStatus {
    return {
      running: this.isRunning(),
      port: this.config?.port,
      pid: this.process?.pid,
    };
  }

  /**
   * Check if using shared proxy
   */
  isUsingSharedProxy(): boolean {
    return this.config !== null && this.process === null;
  }

  /**
   * Configure VS Code to use the proxy
   */
  private async configureVSCodeProxy(port: number): Promise<void> {
    const proxyUrl = `http://127.0.0.1:${port}`;
    await ConfigManager.setVSCodeProxy(proxyUrl);
    this.outputChannel.appendLine(`[MITM] Configured VS Code proxy: ${proxyUrl}`);
  }

  /**
   * Clear VS Code proxy settings
   */
  private async clearVSCodeProxy(): Promise<void> {
    await ConfigManager.clearVSCodeProxy();
    this.outputChannel.appendLine('[MITM] Cleared VS Code proxy settings');
  }

  /**
   * Reload blacklist configuration
   */
  async reloadBlacklist(): Promise<void> {
    if (!this.isRunning()) {
      vscode.window.showWarningMessage('Proxy is not running');
      return;
    }

    this.outputChannel.appendLine('[MITM] Reloading blacklist...');

    // Restart proxy to reload config
    await this.restart();

    vscode.window.showInformationMessage('Blacklist reloaded');
  }

  /**
   * Get certificate path for manual installation
   */
  getCertificatePath(): string {
    // mitmproxy stores cert in ~/.mitmproxy/
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    return path.join(homeDir, '.mitmproxy', 'mitmproxy-ca-cert.pem');
  }

  /**
   * Parse mitmproxy output for blocked requests and highlight them
   */
  private parseBlockedRequests(output: string): void {
    // Look for [BLOCKED] pattern from our Python addon
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes('[BLOCKED]')) {
        // Extract URL from log line
        // Format: [BLOCKED] GET https://example.com/analytics
        const match = line.match(/\[BLOCKED\]\s+(\w+)\s+(.+)/);
        if (match) {
          const method = match[1];
          const url = match[2];

          // Show in output with highlighting
          this.outputChannel.appendLine(`⛔ BLOCKED: ${method} ${url}`);

          // Optionally show notification
          const config = vscode.workspace.getConfiguration('mitm-vscode');
          if (config.get<boolean>('showBlockedNotifications', false)) {
            vscode.window.showInformationMessage(`Blocked: ${method} ${url}`, { modal: false });
          }
        }
      }
    }
  }

  /**
   * Check if a port is already in use
   * Public method so extension.ts can use it
   */
  async checkPortInUse(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const net = require('net');
      const tester = net
        .createServer()
        .once('error', (err: any) => {
          if (err.code === 'EADDRINUSE') {
            resolve(true);
          } else {
            resolve(false);
          }
        })
        .once('listening', () => {
          tester
            .once('close', () => {
              resolve(false);
            })
            .close();
        })
        .listen(port); // Listen on 0.0.0.0 to match mitmproxy
    });
  }
}
