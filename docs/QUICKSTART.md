# Quick Start Guide

Get up and running with MITM Network Interceptor in 5 minutes!

## Step 1: Install Prerequisites

### Install mitmproxy

**macOS:**
```bash
brew install mitmproxy
```

**Linux/Windows:**
```bash
pip install mitmproxy
```

Verify installation:
```bash
mitmdump --version
```

## Step 2: Install Certificate (One-time)

Run mitmproxy once to generate the certificate:
```bash
mitmdump --version
```

### macOS Certificate Installation

1. Open Keychain Access
2. Go to `~/.mitmproxy/` in Finder
3. Drag `mitmproxy-ca-cert.pem` into "System" keychain
4. Double-click the certificate
5. Expand "Trust" section
6. Select "Always Trust" for SSL

### Linux Certificate Installation

```bash
sudo cp ~/.mitmproxy/mitmproxy-ca-cert.pem /usr/local/share/ca-certificates/mitmproxy.crt
sudo update-ca-certificates
```

### Windows Certificate Installation

1. Open `%USERPROFILE%\.mitmproxy\mitmproxy-ca-cert.p12`
2. Import to "Trusted Root Certification Authorities"

## Step 3: Install Extension

```bash
# From project directory
npm install
npm run compile
```

Then press `F5` to launch the extension in development mode.

## Step 4: Enable Interception

1. Open Command Palette: `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P`
2. Run: `MITM: Enable Interception`
3. Click "Restart Now" when prompted

## Step 5: Verify It's Working

1. Open Command Palette
2. Run: `MITM: Show Logs`
3. Look for blocked requests in the output

You should see something like:
```
[MITM] Starting proxy server...
[MITM] Port: 8866
[MITM] Blacklist: /path/to/blacklist.json
[MITM] Proxy server started successfully
[BLOCKED] GET https://dc.services.visualstudio.com/telemetry
  Reason: VS Code telemetry
```

## Customize Your Blacklist

Edit `blacklist.json` to add your own patterns:

```json
{
  "patterns": [
    {
      "type": "domain",
      "value": "example.com",
      "description": "Block example.com"
    },
    {
      "type": "path",
      "value": "/tracking",
      "description": "Block tracking endpoints"
    },
    {
      "type": "regex",
      "value": ".*\\.ads\\..*",
      "description": "Block ad domains"
    }
  ]
}
```

After editing, run: `MITM: Reload Blacklist`

## Troubleshooting

### Not seeing any blocked requests?

1. Make sure you restarted VS Code after enabling
2. Check if your blacklist patterns are correct
3. Try a simple pattern first: `type: domain, value: example.com`
4. Test by making a request to that domain

### Certificate errors?

1. Verify certificate is installed: Check Keychain Access (macOS)
2. Make sure it's trusted for SSL
3. Restart VS Code after installing certificate

### mitmproxy not found?

1. Check installation: `which mitmdump`
2. If in custom location, set `mitm-vscode.mitmproxyPath` in settings

## Next Steps

- [Read the full README](README.md)
- [View example blacklists](examples/)
- [Customize settings](#customize-settings)

## Customize Settings

Open VS Code Settings and search for "MITM":

```json
{
  "mitm-vscode.enabled": true,
  "mitm-vscode.proxyPort": 8866,
  "mitm-vscode.blockedResponseStatus": 204,
  "mitm-vscode.logBlocked": true
}
```

Happy intercepting! 🛡️
