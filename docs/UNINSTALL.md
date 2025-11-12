# Uninstallation Guide

## Automatic Cleanup (Recommended)

The extension has **multiple safety mechanisms** to clean up proxy settings:

### How It Works

**Scenario 1: Normal disable/uninstall (VS Code is running) ✓**
```
User uninstalls → VS Code calls deactivate() → Cleans up automatically
```

1. Extension's `deactivate()` runs
2. Stops proxy process
3. Clears `http.proxy` setting
4. Network restored immediately ✓

**Scenario 2: Uninstall while VS Code is closed ⚠️**
```
User uninstalls → VS Code not running → deactivate() doesn't run
→ Proxy settings remain orphaned ❌
```

**Recovery:** Reinstall extension temporarily
1. Reinstall extension
2. Start VS Code
3. Extension detects orphaned setting on activation
4. Shows warning: "Found orphaned MITM proxy settings"
5. Automatically clears it
6. Click "Reload Now"
7. Network restored ✓
8. (Optional) Uninstall extension again

**Scenario 3: VS Code crash or force quit ⚠️**
```
VS Code crashes → deactivate() doesn't run
→ Proxy settings remain orphaned ❌
```

**Recovery:** Same as Scenario 2 - settings remain until next activation
1. Restart VS Code (extension still installed)
2. Extension detects orphaned setting
3. Shows warning and cleans up automatically
4. Network restored ✓

### Important Limitation

⚠️ **VS Code does not provide a reliable uninstall hook**

This is a platform limitation, not an extension bug. VS Code's `deactivate()` function:
- ✅ Runs when: Uninstalling while VS Code is open
- ❌ Doesn't run when: Uninstalling while VS Code is closed
- ❌ Doesn't run when: VS Code crashes/force-quits

**This affects ALL VS Code extensions**, not just this one.

### Steps

1. Uninstall the extension normally:
   - Extensions view → Right-click extension → Uninstall
   - Or: `code --uninstall-extension mitm-vscode.mitm-vscode`

2. If VS Code prompts to reload: Click "Reload"

3. If network is broken after uninstall:
   - Reinstall extension
   - Restart VS Code
   - Extension auto-detects and cleans up
   - Click "Reload Now" when prompted
   - Uninstall again if desired

That's it! The extension handles cleanup automatically with multiple fallbacks.

## Manual Cleanup (If Needed)

If the automatic cleanup fails or you uninstalled without running VS Code:

### Method 1: Using the Cleanup Command

If you can still access commands:

```bash
1. Run: MITM: Cleanup Proxy Settings
2. Click "Reload Now"
3. Network access restored
```

### Method 2: Manual Settings Edit

If the extension is already uninstalled:

**Via UI:**
```bash
1. Open Settings (Cmd+, or Ctrl+,)
2. Search: "http.proxy"
3. Clear the value (should be empty)
4. Search: "mitm-vscode"
5. Reset all settings to default
6. Run: Developer: Reload Window
```

**Via settings.json:**
```bash
1. Open Command Palette (Cmd+Shift+P)
2. Run: Preferences: Open User Settings (JSON)
3. Remove these lines:
   - "http.proxy": "http://127.0.0.1:8866"
   - Any "mitm-vscode.*" settings
4. Save file
5. Reload window
```

### Method 3: Reset All Settings

Nuclear option if nothing else works:

**macOS/Linux:**
```bash
# Backup your settings first!
cp ~/.config/Code/User/settings.json ~/.config/Code/User/settings.json.backup

# Edit settings file
nano ~/.config/Code/User/settings.json

# Remove proxy settings, save, and restart VS Code
```

**Windows:**
```bash
# Backup your settings first!
copy %APPDATA%\Code\User\settings.json %APPDATA%\Code\User\settings.json.backup

# Edit settings file
notepad %APPDATA%\Code\User\settings.json

# Remove proxy settings, save, and restart VS Code
```

## Verification

After cleanup, verify network works:

```bash
1. Open Command Palette
2. Run: Extensions: Install Extensions
3. Search for any extension
4. If you see results → Network works! ✓

If you see errors → Check settings again
```

## What Gets Removed

### Automatic Cleanup Removes:

```json
{
  // Proxy settings (most important)
  "http.proxy": "",  // Cleared

  // Extension settings
  "mitm-vscode.enabled": false,
  "mitm-vscode.proxyPort": 8866,
  "mitm-vscode.blacklistPath": "",
  // ... other mitm-vscode.* settings
}
```

### Files That Remain:

These are safe to delete manually if desired:

```
~/.mitmproxy/
  └── mitmproxy-ca-cert.pem  # Certificate (if you installed it)
  └── mitmproxy-ca-cert.p12
  └── ... other cert files

Your blacklist.json file (if custom location)
Extension logs (auto-cleaned by VS Code)
```

## Common Issues After Uninstall

### Issue: "Unable to connect to the internet"

**Cause:** Proxy settings not cleared.

**Solution:**
```bash
1. Check Settings → Search "http.proxy"
2. Should be empty
3. If not empty, clear it manually
4. Reload window
```

### Issue: "Extension not found but network broken"

**Cause:** Uninstalled without cleanup.

**Solution:**
```bash
# Option 1: Reinstall temporarily
1. Install extension again
2. Run: MITM: Cleanup Proxy Settings
3. Uninstall again

# Option 2: Manual cleanup
See "Method 2" above
```

### Issue: "Certificate errors on HTTPS sites"

**Cause:** mitmproxy certificate still trusted in system.

**Solution (Optional - only if you want to remove it):**

**macOS:**
```bash
1. Open Keychain Access
2. Search: "mitmproxy"
3. Delete the certificate
4. Restart VS Code
```

**Linux:**
```bash
sudo rm /usr/local/share/ca-certificates/mitmproxy.crt
sudo update-ca-certificates
```

**Windows:**
```bash
1. Run: certmgr.msc
2. Navigate to: Trusted Root Certification Authorities → Certificates
3. Find "mitmproxy"
4. Right-click → Delete
5. Restart VS Code
```

## Reinstallation

If you want to reinstall later:

```bash
1. Install extension normally
2. Previous settings are preserved (if not manually deleted)
3. Enable interception as usual
4. If certificate was deleted, reinstall it:
   - Run: MITM: Install Certificate
   - Follow instructions
```

## Clean Uninstall (Remove Everything)

To completely remove all traces:

### 1. Uninstall Extension
```bash
code --uninstall-extension mitm-vscode.mitm-vscode
```

### 2. Remove Settings
```bash
# Edit settings.json and remove all mitm-vscode.* entries
```

### 3. Remove Certificate (Optional)
```bash
# macOS: Use Keychain Access to delete mitmproxy cert
# Linux: sudo rm /usr/local/share/ca-certificates/mitmproxy.crt
# Windows: Use certmgr.msc to delete mitmproxy cert
```

### 4. Remove mitmproxy (Optional)
```bash
# If installed via brew
brew uninstall mitmproxy

# If installed via pip
pip3 uninstall mitmproxy
```

### 5. Verify Clean State
```bash
# Check settings
1. Search "http.proxy" → Should be empty
2. Search "mitm-vscode" → No results

# Check certificates
# macOS: Keychain Access → Search "mitmproxy" → No results
# Linux: ls /usr/local/share/ca-certificates/ → No mitmproxy.crt
# Windows: certmgr.msc → No mitmproxy cert

# Check mitmproxy
mitmdump --version → Should fail if uninstalled
```

## Data Privacy

When uninstalling, **no data is sent** anywhere:

- ✓ All processing is local
- ✓ No telemetry
- ✓ No tracking
- ✓ Clean exit

The extension only modifies:
- VS Code settings (local JSON file)
- System certificate store (if you installed cert)
- Local proxy process (automatically stopped)

## Need Help?

If you're stuck after uninstalling:

1. **Check Settings:** `http.proxy` should be empty
2. **Reload Window:** `Developer: Reload Window`
3. **Check Certificate:** Remove mitmproxy cert if installed
4. **Last Resort:** Reset VS Code settings entirely

## Feedback

If you're uninstalling due to issues, please let us know:
- Open an issue on GitHub
- Describe the problem
- We'll help fix it!

Most issues are easily solvable without uninstalling. 🙏
