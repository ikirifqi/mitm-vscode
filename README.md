# MITM Network Interceptor for VS Code

A powerful VS Code extension that intercepts and blocks network requests made by VS Code and its extensions. Perfect for blocking telemetry, analytics, and other unwanted network traffic.

## Features

- 🛡️ **Intercept ALL network traffic** from VS Code and its extensions
- 🚫 **Flexible blacklist patterns**: Support for exact URLs, domains, paths, regex, and request body matching
- 🎯 **Request body filtering**: Block or allow requests based on body content (whitelist support)
- ⚙️ **Configurable responses**: Choose how blocked requests should respond
- 📊 **Real-time logging**: See what's being blocked in real-time
- 🔄 **Hot reload**: Update blacklist without restarting the proxy
- 🎯 **Zero configuration**: Works out of the box with sensible defaults
- 🪟 **Multi-window support**: Works perfectly with multiple VS Code windows (shared proxy instance)
- ⚡ **Auto-reload**: Window reloads automatically when enabling/disabling (no manual restart)
- 💚 **Self-healing**: Health check polling ensures proxy is always running (auto-restarts within 5 seconds)
- 🔄 **Orphaned proxy detection**: Automatically detects and restarts orphaned proxies when owner window closes
- 💤 **Idle timeout**: Auto-stops proxy after configurable inactivity period (default: 60 minutes, saves resources)

## Prerequisites

### Install mitmproxy

This extension uses [mitmproxy](https://mitmproxy.org) as the underlying proxy server.

**macOS:**
```bash
brew install mitmproxy
```

**Linux:**
```bash
pip install mitmproxy
```

**Windows:**
```bash
pip install mitmproxy
```

Or download from: https://mitmproxy.org/downloads/

### Install Certificate (One-time Setup)

For HTTPS interception, you need to trust mitmproxy's certificate:

**macOS:**
1. Run mitmproxy once to generate the certificate:
   ```bash
   mitmdump --version
   ```
2. Open Keychain Access
3. Navigate to `~/.mitmproxy/` folder
4. Drag and drop `mitmproxy-ca-cert.pem` into "System" keychain
5. Double-click the certificate → Expand "Trust" → Select "Always Trust"

**Linux:**
```bash
sudo cp ~/.mitmproxy/mitmproxy-ca-cert.pem /usr/local/share/ca-certificates/mitmproxy.crt
sudo update-ca-certificates
```

**Windows:**
1. Open `%USERPROFILE%\.mitmproxy\mitmproxy-ca-cert.p12`
2. Import it to "Trusted Root Certification Authorities"

You can also run the command `MITM: Install Certificate (One-time Setup)` from VS Code's command palette for instructions.

## Installation

### From Source

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Compile TypeScript:
   ```bash
   npm run compile
   ```
4. Press `F5` in VS Code to launch Extension Development Host

### From VSIX (Future)

Once published, you can install from the VS Code Marketplace or install the `.vsix` file.

## Usage

### Quick Start

1. Install the extension
2. Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
3. Run command: `MITM: Enable Interception`
4. Window will **automatically reload** (takes ~2 seconds)
5. The extension will now intercept and block requests matching your blacklist

### Status Bar

The extension adds a status bar item showing the current state:
- `🛡️ MITM:OFF` - Interceptor is disabled (click to enable)
- `🛡️ MITM:8866` - Interceptor is active on port 8866 (click to disable)
- `🛡️ MITM:Starting...` - Interceptor is starting up

### Commands

Access these via Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`):

- `MITM: Enable Interception` - Start intercepting network traffic
- `MITM: Disable Interception` - Stop intercepting network traffic
- `MITM: Reload Blacklist` - Reload blacklist configuration without restart
- `MITM: Show Logs` - View interceptor logs
- `MITM: Install Certificate (One-time Setup)` - Show certificate installation instructions
- `MITM: Cleanup Proxy Settings` - Manually remove proxy settings (useful after uninstall)

## Configuration

### Extension Settings

Configure via VS Code Settings (`Preferences > Settings > MITM Network Interceptor`):

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `mitm-vscode.enabled` | boolean | `false` | Enable network interception |
| `mitm-vscode.proxyPort` | number | `8866` | Port for the local proxy server |
| `mitm-vscode.blacklistPath` | string | `""` | Path to custom blacklist file (empty = use default) |
| `mitm-vscode.blockedResponseStatus` | number | `204` | HTTP status code for blocked requests (200/204/404/503) |
| `mitm-vscode.blockedResponseBody` | string | `""` | Optional response body for blocked requests |
| `mitm-vscode.logBlocked` | boolean | `true` | Log blocked requests to output channel |
| `mitm-vscode.showBlockedNotifications` | boolean | `false` | Show toast notifications for blocked requests (can be noisy) |
| `mitm-vscode.idleTimeout` | number | `60` | Minutes of inactivity before proxy auto-stops (0 = disabled) |
| `mitm-vscode.mitmproxyPath` | string | `""` | Custom path to mitmproxy executable |

### Blacklist Configuration

The blacklist is defined in `blacklist.json` (created automatically if not exists).

#### Pattern Types

1. **Exact URL Match**
```json
{
  "type": "exact",
  "value": "https://example.com/track",
  "description": "Block exact URL"
}
```

2. **Domain Match**
```json
{
  "type": "domain",
  "value": "analytics.google.com",
  "description": "Block entire domain"
}
```

3. **Path Match** (matches anywhere in URL)
```json
{
  "type": "path",
  "value": "/analytics",
  "description": "Block any URL containing /analytics"
}
```

4. **Regex Match**
```json
{
  "type": "regex",
  "value": ".*/(analytics|telemetry)/.*",
  "description": "Block analytics and telemetry paths"
}
```

5. **Request Body Block**
```json
{
  "type": "body",
  "value": "telemetryData",
  "description": "Block requests containing 'telemetryData' in request body"
}
```

6. **Request Body Allow (Whitelist)**
```json
{
  "type": "body-allow",
  "value": "allowedOperation",
  "description": "Allow requests containing 'allowedOperation' in body (bypasses other blocks)"
}
```

#### Example Blacklist

```json
{
  "patterns": [
    {
      "type": "path",
      "value": "/analytics",
      "description": "Block analytics endpoints"
    },
    {
      "type": "path",
      "value": "/telemetry",
      "description": "Block telemetry endpoints"
    },
    {
      "type": "domain",
      "value": "dc.services.visualstudio.com",
      "description": "VS Code telemetry"
    },
    {
      "type": "domain",
      "value": "vortex.data.microsoft.com",
      "description": "Microsoft telemetry"
    },
    {
      "type": "regex",
      "value": "https?://.*\\.analytics\\..*",
      "description": "Any analytics subdomain"
    },
    {
      "type": "path",
      "value": "analytics/send_batches",
      "description": "Block batch analytics"
    },
    {
      "type": "body",
      "value": "sensitiveData",
      "description": "Block requests with sensitive data in body"
    },
    {
      "type": "body-allow",
      "value": "trustedClient",
      "description": "Allow requests from trusted clients (whitelist)"
    }
  ]
}
```

### Custom Blacklist Location

You can use a custom blacklist file:

1. Create your blacklist file anywhere (e.g., `~/my-blacklist.json`)
2. Set `mitm-vscode.blacklistPath` to the file path
3. Run `MITM: Reload Blacklist` to apply changes

## How It Works

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    VS Code Windows                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │ Window 1 │  │ Window 2 │  │ Window 3 │                 │
│  │ Project A│  │ Project B│  │ Project C│                 │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                 │
│       │             │             │                         │
│       └─────────────┴─────────────┘                         │
│                     │                                       │
│            All use http.proxy setting                       │
└─────────────────────┼───────────────────────────────────────┘
                      ↓
            ┌─────────────────────┐
            │  Local Proxy Server │
            │  (mitmproxy:8866)   │
            │  Single Instance    │
            └─────────┬───────────┘
                      ↓
            ┌─────────────────────┐
            │   Python Addon      │
            │  (mitm_addon.py)    │
            │  - Load blacklist   │
            │  - Check patterns   │
            │  - Block/Allow      │
            └─────────┬───────────┘
                      ↓
              ┌───────┴────────┐
              │                │
         Blocked?           Allowed?
              │                │
              ↓                ↓
      Return immediately   Forward to
      (no network call)     destination
              │                │
              ↓                ↓
        Status: 204        Internet
        Body: empty        (actual request)
```

### Step-by-Step Flow

#### 1. **Extension Activation**

When you enable the interceptor:

```typescript
// First VS Code window
User runs: MITM: Enable Interception
  ↓
Extension starts mitmproxy on port 8866
  ↓
Sets VS Code setting: http.proxy = "http://127.0.0.1:8866"
  ↓
Window reloads automatically
  ↓
All network requests now go through proxy

// Second/Third VS Code windows
User runs: MITM: Enable Interception
  ↓
Extension detects port 8866 already in use
  ↓
Reuses existing proxy (no conflict!)
  ↓
Sets http.proxy setting for this window
  ↓
Window reloads automatically
  ↓
All windows share the same proxy instance
```

#### 2. **Request Interception**

When VS Code (or any extension) makes a network request:

```
1. VS Code makes request (e.g., GET https://example.com/analytics)
   ↓
2. VS Code's network layer sees http.proxy setting
   ↓
3. Request is routed to 127.0.0.1:8866 (mitmproxy)
   ↓
4. mitmproxy receives request
   ↓
5. Python addon's request() function is called
   ↓
6. Check URL against blacklist patterns:

   Pattern Type: domain
   ├─ example.com == example.com? → Match!
   └─ BLOCKED

   Pattern Type: path
   ├─ "/analytics" in URL? → Match!
   └─ BLOCKED

   Pattern Type: regex
   ├─ URL matches ".*/analytics/.*"? → Match!
   └─ BLOCKED

   No matches?
   └─ ALLOWED (forward to internet)

   ↓
7a. If BLOCKED:
    - Create response immediately
    - Status: 204 No Content (configurable)
    - Body: empty (configurable)
    - Headers: X-MITM-Blocked: true
    - Return to VS Code
    - No network call made!

7b. If ALLOWED:
    - Forward request to actual destination
    - Wait for real response
    - Return response to VS Code
    - Normal network flow
```

#### 3. **Blacklist Pattern Matching**

The Python addon checks patterns in order:

```python
def is_blacklisted(url, host):
    # Example URL: https://analytics.example.com/track?id=123
    # Example host: analytics.example.com

    for pattern in patterns:
        if pattern.type == "exact":
            # Must match entire URL exactly
            if url == pattern.value:
                return BLOCKED

        elif pattern.type == "domain":
            # Match domain and subdomains
            # "example.com" matches:
            #   - example.com
            #   - www.example.com
            #   - analytics.example.com
            if host == pattern.value or host.endswith(f".{pattern.value}"):
                return BLOCKED

        elif pattern.type == "path":
            # Match anywhere in URL path
            # "/analytics" matches:
            #   - https://example.com/analytics
            #   - https://example.com/api/analytics/send
            #   - https://other.com/v1/analytics
            if pattern.value in url:
                return BLOCKED

        elif pattern.type == "regex":
            # Full regex power (Python syntax)
            # ".*/track/.*" matches:
            #   - https://example.com/track/event
            #   - http://any.domain/track/123
            if re.match(pattern.value, url):
                return BLOCKED

    return ALLOWED
```

### Multi-Window Support

**Key Feature:** All VS Code windows share a **single proxy instance** with automatic health monitoring

```
Scenario: You have 3 VS Code windows open

Window 1 (Project A):
  - Enable interceptor
  - Starts proxy on port 8866
  - Health check polls every 5 seconds ✓

Window 2 (Project B):
  - Enable interceptor
  - Detects port 8866 in use
  - Reuses existing proxy ✓
  - Health check polls every 5 seconds ✓

Window 3 (Project C):
  - Enable interceptor
  - Detects port 8866 in use
  - Reuses existing proxy ✓
  - Health check polls every 5 seconds ✓

Result:
  - One proxy process (efficient!)
  - All windows intercepted
  - Shared blacklist rules
  - Self-healing if proxy dies
```

**What happens when you close windows?**

```
Close Window 1 (the one that started the proxy):
  - Proxy is killed
  - Windows 2 & 3 health checks detect this (within 5 seconds)
  - Window 2 or 3 automatically restarts proxy ✓
  - Max downtime: 5 seconds

Close Window 2:
  - Window 2 stops health check
  - Windows 1 & 3 continue normally

Close Window 3 (last window):
  - Health check stops
  - Proxy shuts down
  - Clean exit
```

**Health Check Polling:**
Every window with interception enabled runs a health check every 5 seconds:
- Checks if proxy is running on the configured port
- If not running → Automatically starts it
- If running → Does nothing
- This ensures the proxy is always available for all windows

### Performance Characteristics

**Request Latency:**
```
Blocked Request:
  VS Code → Proxy → Pattern Check → Immediate Response
  Total time: ~5-10ms (no network call!)

Allowed Request:
  VS Code → Proxy → Pattern Check → Internet → Response → VS Code
  Overhead: ~1-2ms (pattern checking)
  Total time: Same as normal + 1-2ms
```

**Memory Usage:**
```
mitmproxy process: ~30-50 MB
Python addon: ~5-10 MB
Total overhead: ~40-60 MB

For 3 windows:
  - Still just 40-60 MB (shared proxy)
  - Not 120-180 MB (no duplication)
```

**CPU Usage:**
```
Idle: ~0%
Active (checking patterns): ~1-5%
Heavy traffic: ~5-15%

Pattern matching is highly optimized:
  - Regex patterns pre-compiled
  - Simple string checks are fast
  - No disk I/O per request
```

### Configuration Storage

```
VS Code Settings (per window):
  ~/.config/Code/User/settings.json
  {
    "http.proxy": "http://127.0.0.1:8866",
    "mitm-vscode.enabled": true,
    "mitm-vscode.proxyPort": 8866,
    "mitm-vscode.blacklistPath": "/path/to/blacklist.json",
    ...
  }

Blacklist File (shared):
  <extension-folder>/blacklist.json
  {
    "patterns": [...]
  }

Proxy Process (shared):
  - One instance on port 8866
  - Serves all VS Code windows
  - Reads blacklist.json
```

### Security Model

**Scope of Interception:**
```
✓ ONLY VS Code and its child processes
✗ Does NOT affect:
  - Web browsers (Chrome, Firefox, Safari, etc.)
  - System network traffic
  - Other applications
  - Terminal commands (unless run in VS Code's terminal)
  - Docker containers
  - System updates
  - macOS App Store
  - Other IDEs

Why? The extension only sets VS Code's internal "http.proxy" setting.
This is VS Code-specific and doesn't affect system-wide networking.
```

**Local-Only Traffic:**
```
All traffic stays on your machine:
  VS Code (127.0.0.1) → Proxy (127.0.0.1:8866) → Internet

The proxy:
  ✓ Runs on localhost only (127.0.0.1)
  ✓ Not accessible from network
  ✓ No remote connections accepted
  ✓ Isolated to VS Code only
  ✗ Cannot intercept other apps
  ✗ Cannot access other users' traffic
  ✗ Cannot affect system-wide network
```

**HTTPS Handling:**
```
For HTTPS interception:
  1. mitmproxy generates CA certificate
  2. You trust it once (manual step)
  3. mitmproxy creates certificates for each site
  4. VS Code trusts them (via CA)
  5. Traffic is decrypted, checked, re-encrypted

Without certificate trust:
  - HTTPS connections fail
  - HTTP connections work fine
  - You see certificate errors
```

### Limitations & Edge Cases

**What Gets Intercepted:**
```
✓ VS Code's own requests (updates, telemetry)
✓ Extension HTTP requests (via VS Code API)
✓ Extension HTTPS requests (with cert trust)
✓ Node.js child processes respecting http_proxy (spawned from VS Code)
✓ Electron network layer (VS Code's base)
✓ VS Code integrated terminal (commands run within it)
✓ Tasks run from VS Code
✓ Debug sessions launched from VS Code

✗ Native binaries with own network stack
✗ Direct socket connections
✗ Processes ignoring http_proxy environment
✗ System-level network calls
✗ Applications outside VS Code
✗ Web browsers
✗ Standalone terminal applications
✗ System services
```

**Port Conflicts:**
```
Scenario: Port 8866 is used by another app

Solution 1: Change port in settings
  "mitm-vscode.proxyPort": 8867

Solution 2: Stop the other app
  lsof -i :8866
  kill <pid>
```

**Blacklist Updates:**
```
Changes to blacklist.json:
  1. Edit file
  2. Run: MITM: Reload Blacklist
  3. Proxy restarts (2-3 seconds)
  4. New patterns active
  5. No window reload needed
```

## Troubleshooting

### Network broken after uninstalling extension

**Problem:** After uninstalling, VS Code can't access network (proxy settings still set).

**Automatic Fix:** Reinstall the extension and restart VS Code. The extension will detect and clean up orphaned proxy settings automatically.

**Manual Fix:**
1. Open Settings (Cmd+,)
2. Search for "http.proxy"
3. Clear the value (should be empty)
4. Reload window (Cmd+R)

**Or use cleanup command:**
1. Reinstall the extension temporarily
2. Run command: `MITM: Cleanup Proxy Settings`
3. Click "Reload Now"
4. Uninstall the extension again

### Proxy not working after enabling

**Solution:** The window should automatically reload. If it doesn't, manually run: `Developer: Reload Window`

### Certificate errors (HTTPS)

**Solution:** Make sure you've installed and trusted mitmproxy's certificate. Run `MITM: Install Certificate` command for instructions.

### mitmproxy not found

**Solution:**
1. Install mitmproxy: `brew install mitmproxy` (macOS) or `pip install mitmproxy`
2. If installed in custom location, set `mitm-vscode.mitmproxyPath` to the full path

### Blacklist not working

**Solution:**
1. Check logs: Run `MITM: Show Logs`
2. Verify blacklist file exists and is valid JSON
3. Test your patterns - regex patterns must be valid Python regex
4. Run `MITM: Reload Blacklist` after editing the file

### Port already in use

**Solution:** Change `mitm-vscode.proxyPort` to a different port (e.g., 8867, 8888).

### Want to see what's being blocked?

**Solution:**
1. Enable logging: Set `mitm-vscode.logBlocked` to `true` (default)
2. Run `MITM: Show Logs` to see real-time blocking activity
3. Blocked requests appear as: `⛔ BLOCKED: GET https://example.com/analytics`

**Want notifications?**
Set `mitm-vscode.showBlockedNotifications` to `true` for toast notifications (can be noisy!)

## Performance Impact

The extension has minimal performance impact:
- Proxy runs as a separate process (doesn't block VS Code)
- Pattern matching is highly optimized (regex pre-compiled)
- Blocked requests never touch the network (instant response)
- Allowed requests have ~1-2ms overhead
- Window reload is automatic and fast (~2 seconds)
- Health check polling: Negligible CPU (<0.1%, runs every 5 seconds)

## Privacy & Security

- **All traffic stays local**: The proxy runs on your machine (`127.0.0.1`)
- **No data collection**: Nothing is sent to external servers
- **You control the blacklist**: You decide what gets blocked
- **Open source**: Audit the code yourself
- **No Python dependencies**: Uses only built-in Python libraries

## Known Limitations

- **Window reload**: Window automatically reloads when enabling/disabling (preserves your work)
- **macOS certificate**: Requires one-time certificate installation for HTTPS
- **Extension requests**: Can only intercept requests made through VS Code's HTTP client (most extensions use this)
- **Recovery time**: If proxy dies, health check restarts it within 5 seconds (brief downtime)

## Development

### Build from Source

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode (auto-compile on changes)
npm run watch

# Run in development
# Press F5 in VS Code
```

### Project Structure

```
mitm-vscode/
├── src/
│   ├── extension.ts      # Main extension entry point
│   ├── proxyManager.ts   # Manages mitmproxy lifecycle + health checks
│   ├── config.ts         # Configuration management
│   └── types.ts          # TypeScript type definitions
├── mitm_addon.py         # Python addon for mitmproxy
├── blacklist.json        # Default blacklist configuration (JSON format)
├── examples/             # Example blacklist configurations
├── package.json          # Extension manifest
└── README.md            # This file
```

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

MIT License - See LICENSE file for details

## Acknowledgments

- [mitmproxy](https://mitmproxy.org) - The powerful proxy framework that makes this possible
- VS Code Extension API

## Documentation

📚 **[Complete Documentation Index](docs/README.md)** - All guides and documentation

**Quick Access:**
- 📖 [Quick Start Guide](docs/QUICKSTART.md) - 5-minute setup
- 🎯 [Request Body Matching](docs/BODY-MATCHING.md) - Block/allow by request body content (NEW in v0.2.0)
- 💤 [Idle Timeout](docs/IDLE-TIMEOUT.md) - Auto-stop when inactive (NEW in v0.2.0)
- 🪟 [Multi-Window Guide](docs/MULTI-WINDOW.md) - Multiple windows support
- 💚 [Health Check System](docs/HEALTH-CHECK.md) - Self-healing explained
- 🔧 [Development Guide](docs/DEVELOPMENT.md) - Contributing
- 🧪 [Testing Guide](docs/TESTING.md) - Testing procedures
- 📝 [Changelog](CHANGELOG.md) - Version history

## Support

- 🐛 [Report issues](https://github.com/ikirifqi/mitm-vscode/issues)
- 💡 [Request features](https://github.com/ikirifqi/mitm-vscode/issues)

---

**Note:** This extension modifies VS Code's proxy settings and requires a window reload to take effect. The extension uses health check polling to ensure the proxy is always running.
