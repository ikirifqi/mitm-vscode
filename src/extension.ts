/**
 * MITM Network Interceptor Extension
 * Main entry point
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import { ProxyManager } from './proxyManager';
import { ConfigManager } from './config';

let proxyManager: ProxyManager;
let outputChannel: vscode.OutputChannel;
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
  console.log('MITM Network Interceptor is now active');

  // Create output channel
  outputChannel = vscode.window.createOutputChannel('MITM Interceptor');
  context.subscriptions.push(outputChannel);

  // Create proxy manager
  proxyManager = new ProxyManager(context, outputChannel);

  // Register cleanup handler for when Node.js process exits
  // This ensures proxy is killed even if VS Code crashes
  const cleanupOnExit = () => {
    try {
      if (proxyManager && proxyManager.ownsProxy()) {
        const status = proxyManager.getStatus();
        const port = status.port || 8866;

        // Kill proxy process synchronously
        if (process.platform !== 'win32') {
          require('child_process').execSync(
            `lsof -ti :${port} | xargs kill -9 2>/dev/null || true`
          );
        }
      }
    } catch (error) {
      // Ignore errors during cleanup
    }
  };

  process.on('exit', cleanupOnExit);
  process.on('SIGINT', cleanupOnExit);
  process.on('SIGTERM', cleanupOnExit);

  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'mitm-vscode.toggleStatus';
  context.subscriptions.push(statusBarItem);
  updateStatusBar();
  statusBarItem.show();

  // Safety check: Clean up orphaned proxy settings
  // This handles cases where extension was uninstalled without cleanup
  checkAndCleanOrphanedProxy(context);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('mitm-vscode.enable', async () => {
      await enableInterception(context);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('mitm-vscode.disable', async () => {
      await disableInterception();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('mitm-vscode.reload', async () => {
      await reloadBlacklist();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('mitm-vscode.showLogs', () => {
      outputChannel.show(true); // true = preserveFocus: false (brings to front)
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('mitm-vscode.installCertificate', async () => {
      await showCertificateInstructions();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('mitm-vscode.toggleStatus', async () => {
      const isEnabled = ConfigManager.isEnabled();
      if (isEnabled) {
        await disableInterception();
      } else {
        await enableInterception(context);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('mitm-vscode.cleanup', async () => {
      await cleanupProxySettings();
    })
  );

  // Listen for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (e) => {
      if (e.affectsConfiguration('mitm-vscode')) {
        await handleConfigChange(context);
      }
    })
  );

  // Auto-start if enabled
  if (ConfigManager.isEnabled()) {
    setTimeout(async () => {
      const config = ConfigManager.getProxyConfig(context);

      outputChannel.appendLine('[MITM] Interception is enabled, initializing...');

      // Always use start() method - it handles everything
      const started = await proxyManager.start(config);

      if (started) {
        outputChannel.appendLine('[MITM] Interception active');
      } else {
        outputChannel.appendLine('[MITM] Failed to initialize interception');
      }

      updateStatusBar();
    }, 2000);
  }
}

export async function deactivate() {
  console.log('MITM Network Interceptor is being deactivated');

  // NOTE: This runs when VS Code closes or extension is disabled/uninstalled
  // We need to be aggressive about killing the proxy to prevent orphaned processes

  outputChannel.appendLine('='.repeat(60));
  outputChannel.appendLine('[MITM] Extension is being deactivated/uninstalled');
  outputChannel.appendLine('='.repeat(60));

  try {
    // Stop health check first (prevents restart attempts)
    if (proxyManager) {
      outputChannel.appendLine('[MITM] Stopping health check...');
      proxyManager.stopHealthCheck();
    }

    // Stop proxy if running (even if we don't own it, try to kill)
    if (proxyManager && proxyManager.ownsProxy()) {
      outputChannel.appendLine('[MITM] Stopping proxy process...');
      await proxyManager.stop();
    } else if (proxyManager) {
      // Don't own process but clear settings anyway
      outputChannel.appendLine('[MITM] Clearing proxy settings...');
      await ConfigManager.clearVSCodeProxy();
    }

    // Always clear proxy settings on deactivation/uninstall
    const currentProxySetting = ConfigManager.getVSCodeProxySettings();
    if (currentProxySetting.http && currentProxySetting.http.includes('127.0.0.1')) {
      outputChannel.appendLine('[MITM] Ensuring proxy settings are cleared...');
      await ConfigManager.clearVSCodeProxy();
      outputChannel.appendLine('[MITM] Proxy settings cleared');
    }

    // Clear enabled state
    await ConfigManager.setEnabled(false);

    outputChannel.appendLine('[MITM] Deactivation complete');
  } catch (error) {
    outputChannel.appendLine(`[MITM] Error during deactivation: ${error}`);
  }

  // Extra safety: Try to kill any orphaned mitmdump processes on port 8866
  try {
    if (process.platform !== 'win32') {
      // On Unix-like systems, find and kill mitmdump on default port
      const { execSync } = require('child_process');
      // Try to get port from config, fallback to default 8866
      const port = proxyManager?.getStatus()?.port || 8866;
      execSync(`lsof -ti :${port} | xargs kill -9 2>/dev/null || true`, { stdio: 'ignore' });
      outputChannel.appendLine('[MITM] Cleaned up any orphaned processes');
    }
  } catch (error) {
    // Ignore errors in cleanup - it's just extra safety
  }
}

async function enableInterception(context: vscode.ExtensionContext): Promise<void> {
  try {
    // Get configuration
    const config = ConfigManager.getProxyConfig(context);

    // Validate blacklist file
    if (!fs.existsSync(config.blacklistPath)) {
      const result = await vscode.window.showErrorMessage(
        `Blacklist file not found: ${config.blacklistPath}. Would you like to create a default one?`,
        'Yes',
        'No'
      );

      if (result === 'Yes') {
        await createDefaultBlacklist(context);
      } else {
        return;
      }
    }

    outputChannel.show(true);
    outputChannel.appendLine('='.repeat(60));
    outputChannel.appendLine('[MITM] Enabling Network Interceptor...');
    outputChannel.appendLine('='.repeat(60));

    // Start proxy (with health check)
    const started = await proxyManager.start(config);

    if (started) {
      await ConfigManager.setEnabled(true);
      updateStatusBar();

      vscode.window.showInformationMessage(
        'MITM Interceptor enabled. Reloading window to activate proxy...',
        { modal: false }
      );

      // Small delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Reload window
      await vscode.commands.executeCommand('workbench.action.reloadWindow');
    } else {
      vscode.window.showErrorMessage('Failed to start MITM Interceptor');
    }
  } catch (error) {
    outputChannel.appendLine(`[MITM] Error: ${error}`);
    vscode.window.showErrorMessage(`Failed to start MITM Interceptor: ${error}`);
  }
}

async function disableInterception(): Promise<void> {
  try {
    if (!proxyManager.isRunning()) {
      vscode.window.showInformationMessage('MITM Interceptor is not running');
      return;
    }

    outputChannel.appendLine('='.repeat(60));
    outputChannel.appendLine('[MITM] Stopping Network Interceptor...');
    outputChannel.appendLine('='.repeat(60));

    await proxyManager.stop();
    await ConfigManager.setEnabled(false);
    updateStatusBar();

    // Automatically reload window to remove proxy settings
    vscode.window.showInformationMessage(
      'MITM Interceptor stopped. Reloading window to deactivate proxy...',
      { modal: false }
    );

    // Small delay to show the message
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Reload window automatically
    await vscode.commands.executeCommand('workbench.action.reloadWindow');
  } catch (error) {
    outputChannel.appendLine(`[MITM] Error: ${error}`);
    vscode.window.showErrorMessage(`Failed to stop MITM Interceptor: ${error}`);
  }
}

async function reloadBlacklist(): Promise<void> {
  try {
    await proxyManager.reloadBlacklist();
    outputChannel.appendLine('[MITM] Blacklist reloaded successfully');
  } catch (error) {
    outputChannel.appendLine(`[MITM] Error reloading blacklist: ${error}`);
    vscode.window.showErrorMessage(`Failed to reload blacklist: ${error}`);
  }
}

async function showCertificateInstructions(): Promise<void> {
  const certPath = proxyManager.getCertificatePath();

  const message = `
To intercept HTTPS traffic, you need to trust mitmproxy's certificate:

Certificate Location: ${certPath}

macOS Installation:
1. Make sure mitmproxy is installed: brew install mitmproxy
2. Run mitmproxy once to generate certificate: mitmdump --version
3. Open Keychain Access
4. Drag and drop the certificate file into "System" keychain
5. Double-click the certificate, expand "Trust", and select "Always Trust"

The certificate will be generated automatically when you first start the interceptor.
    `.trim();

  const action = await vscode.window.showInformationMessage(
    message,
    { modal: true },
    'Open Certificate Folder',
    'Copy Path'
  );

  if (action === 'Open Certificate Folder') {
    const certDir = require('path').dirname(certPath);
    require('child_process').exec(`open "${certDir}"`);
  } else if (action === 'Copy Path') {
    await vscode.env.clipboard.writeText(certPath);
    vscode.window.showInformationMessage('Certificate path copied to clipboard');
  }
}

async function createDefaultBlacklist(context: vscode.ExtensionContext): Promise<void> {
  const config = ConfigManager.getProxyConfig(context);
  const defaultBlacklistPath = require('path').join(context.extensionPath, 'blacklist.json');

  try {
    // Copy default blacklist to configured location
    const defaultContent = fs.readFileSync(defaultBlacklistPath, 'utf-8');
    fs.writeFileSync(config.blacklistPath, defaultContent);

    vscode.window.showInformationMessage(`Default blacklist created at: ${config.blacklistPath}`);

    // Open the file for editing
    const doc = await vscode.workspace.openTextDocument(config.blacklistPath);
    await vscode.window.showTextDocument(doc);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to create default blacklist: ${error}`);
  }
}

function updateStatusBar(): void {
  const isEnabled = ConfigManager.isEnabled();
  const isRunning = proxyManager?.isRunning() ?? false;
  const isShared = proxyManager?.isUsingSharedProxy() ?? false;

  if (isRunning) {
    const status = proxyManager.getStatus();
    const ownsProxy = proxyManager?.ownsProxy() ?? false;

    statusBarItem.text = `$(shield) MITM:${status.port}`;

    if (isShared) {
      statusBarItem.tooltip = `MITM Interceptor is active (Port ${status.port})\nUsing shared proxy from another window\nClick to disable`;
    } else if (ownsProxy) {
      statusBarItem.tooltip = `MITM Interceptor is active (Port ${status.port})\nThis window owns the proxy\nClick to disable`;
    } else {
      statusBarItem.tooltip = `MITM Interceptor is active (Port ${status.port})\nClick to disable`;
    }

    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  } else if (isEnabled) {
    statusBarItem.text = `$(shield) MITM:Starting...`;
    statusBarItem.tooltip = 'MITM Interceptor is starting...';
    statusBarItem.backgroundColor = undefined;
  } else {
    statusBarItem.text = `$(shield) MITM:OFF`;
    statusBarItem.tooltip = 'MITM Interceptor is disabled\nClick to enable';
    statusBarItem.backgroundColor = undefined;
  }
}

async function handleConfigChange(context: vscode.ExtensionContext): Promise<void> {
  const isEnabled = ConfigManager.isEnabled();
  const isRunning = proxyManager.isRunning();

  // If enabled state changed via settings
  if (isEnabled && !isRunning) {
    await enableInterception(context);
  } else if (!isEnabled && isRunning) {
    await disableInterception();
  }

  updateStatusBar();
}

async function cleanupProxySettings(): Promise<void> {
  try {
    outputChannel.appendLine('='.repeat(60));
    outputChannel.appendLine('[MITM] Manual cleanup requested');
    outputChannel.appendLine('='.repeat(60));

    // Stop proxy if running
    if (proxyManager && proxyManager.isRunning()) {
      outputChannel.appendLine('[MITM] Stopping proxy...');
      await proxyManager.stop();
    }

    // Clear proxy settings
    const currentProxySetting = ConfigManager.getVSCodeProxySettings();
    if (currentProxySetting.http) {
      outputChannel.appendLine(`[MITM] Current proxy setting: ${currentProxySetting.http}`);
      outputChannel.appendLine('[MITM] Clearing proxy settings...');
      await ConfigManager.clearVSCodeProxy();
      outputChannel.appendLine('[MITM] Proxy settings cleared');
    } else {
      outputChannel.appendLine('[MITM] No proxy settings found');
    }

    // Clear enabled state
    await ConfigManager.setEnabled(false);
    updateStatusBar();

    const action = await vscode.window.showInformationMessage(
      'Proxy settings cleaned up successfully. Reload window to restore normal network access?',
      'Reload Now',
      'Later'
    );

    if (action === 'Reload Now') {
      await vscode.commands.executeCommand('workbench.action.reloadWindow');
    }

    outputChannel.appendLine('[MITM] Cleanup complete');
  } catch (error) {
    outputChannel.appendLine(`[MITM] Error during cleanup: ${error}`);
    vscode.window.showErrorMessage(`Failed to cleanup: ${error}`);
  }
}

async function checkAndCleanOrphanedProxy(_context: vscode.ExtensionContext): Promise<void> {
  // This function handles cleanup when deactivate() couldn't run
  // (e.g., extension was uninstalled while VS Code was closed, or VS Code crashed)
  //
  // It runs on every activation and checks if proxy settings are orphaned.
  // If user permanently uninstalled the extension, they need to:
  // 1. Reinstall temporarily (triggers this function)
  // 2. Let it clean up
  // 3. Uninstall again (cleanly this time)

  try {
    const currentProxySetting = ConfigManager.getVSCodeProxySettings();
    const isEnabled = ConfigManager.isEnabled();

    // Check if proxy is set to our localhost address but extension is not enabled
    // This indicates an orphaned proxy setting (from crash or unclean uninstall)
    if (currentProxySetting.http && currentProxySetting.http.includes('127.0.0.1') && !isEnabled) {
      outputChannel.appendLine('[MITM] Found orphaned proxy setting from previous session');
      outputChannel.appendLine(`[MITM] Orphaned proxy: ${currentProxySetting.http}`);
      outputChannel.appendLine('[MITM] This happens when:');
      outputChannel.appendLine('[MITM]   - Extension was uninstalled while VS Code was closed');
      outputChannel.appendLine('[MITM]   - VS Code crashed before cleanup could run');
      outputChannel.appendLine('[MITM]   - User force-quit VS Code');
      outputChannel.appendLine('[MITM] Cleaning up...');

      await ConfigManager.clearVSCodeProxy();
      outputChannel.appendLine('[MITM] Orphaned proxy setting cleared');

      // Notify user
      const action = await vscode.window.showWarningMessage(
        'Found orphaned MITM proxy settings (from previous crash or uninstall). Cleared them. Reload window?',
        'Reload Now',
        'Later'
      );

      if (action === 'Reload Now') {
        await vscode.commands.executeCommand('workbench.action.reloadWindow');
      }
    }
  } catch (error) {
    outputChannel.appendLine(`[MITM] Error checking for orphaned proxy: ${error}`);
  }
}
