# Development Guide

This guide is for developers who want to contribute to or modify the MITM Network Interceptor extension.

## Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- mitmproxy 10+
- VS Code 1.85+
- TypeScript knowledge
- Python knowledge (for addon development)

## Project Structure

```
mitm-vscode/
├── src/                      # TypeScript source code
│   ├── extension.ts          # Main extension entry point
│   ├── proxyManager.ts       # Proxy lifecycle management
│   ├── config.ts             # Configuration management
│   └── types.ts              # TypeScript type definitions
├── out/                      # Compiled JavaScript (generated)
├── docs/                     # Documentation
├── examples/                 # Example blacklist configurations
│   ├── blacklist-telemetry.json
│   ├── blacklist-ads.json
│   └── blacklist-custom.json
├── mitm_addon.py            # Python addon for mitmproxy
├── blacklist.json           # Default blacklist configuration
├── package.json             # Extension manifest and dependencies
├── tsconfig.json            # TypeScript configuration
└── README.md                # User documentation
```

## Setup Development Environment

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd mitm-vscode
npm install
```

### 2. Install mitmproxy

```bash
# macOS
brew install mitmproxy

# Linux/Windows
pip install mitmproxy
```

### 3. Create .vscode Directory

For debugging support, create these files:

**.vscode/launch.json:**
```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Run Extension",
            "type": "extensionHost",
            "request": "launch",
            "args": [
                "--extensionDevelopmentPath=${workspaceFolder}"
            ],
            "outFiles": [
                "${workspaceFolder}/out/**/*.js"
            ],
            "preLaunchTask": "${defaultBuildTask}"
        }
    ]
}
```

**.vscode/tasks.json:**
```json
{
    "version": "2.0.0",
    "tasks": [
        {
            "type": "npm",
            "script": "watch",
            "problemMatcher": "$tsc-watch",
            "isBackground": true,
            "presentation": {
                "reveal": "never"
            },
            "group": {
                "kind": "build",
                "isDefault": true
            }
        }
    ]
}
```

## Development Workflow

### Build

```bash
# One-time compile
npm run compile

# Watch mode (auto-compile on save)
npm run watch
```

### Run Extension

1. Open the project in VS Code
2. Press `F5` to launch Extension Development Host
3. A new VS Code window opens with the extension loaded
4. Test the extension in this window

### Debug

- Set breakpoints in TypeScript files
- View output in Debug Console
- Use `outputChannel.appendLine()` for logging

### Test mitmproxy Addon Separately

```bash
# Start mitmproxy with addon
mitmdump -s mitm_addon.py \
  --set blacklist_config=blacklist.json \
  --set response_status=204 \
  --set log_blocked=true \
  --listen-port 8866

# In another terminal, test with curl
curl -x http://localhost:8866 http://example.com/analytics
```

## Architecture

### Extension Lifecycle

```
VS Code Startup
    ↓
Extension Activated (onStartupFinished)
    ↓
Check if enabled in settings
    ↓ (if enabled)
Start ProxyManager
    ↓
Check if proxy already running (another window)
    ├─ Yes: Use shared proxy
    └─ No: Spawn mitmdump process
    ↓
Start health check (polls every 5 seconds)
    ↓
Configure VS Code proxy settings
    ↓
Extension ready, proxy intercepting + monitoring
```

### Request Flow

```
VS Code/Extension makes request
    ↓
Goes through VS Code's http.proxy
    ↓
Reaches mitmproxy (127.0.0.1:8866)
    ↓
mitm_addon.py: request() called
    ↓
Check against blacklist patterns
    ↓
If blocked: Return mock response immediately
    ↓
If allowed: Forward to destination
```

## Key Components

### ProxyManager (proxyManager.ts)

Manages the mitmproxy process lifecycle with health check polling:

- `start(config)` - Starts proxy and health check
- `stop()` - Stops proxy and health check
- `startHealthCheck(config)` - Polls every 5 seconds, restarts if needed
- `stopHealthCheck()` - Stops polling
- `isRunning()` - Check if proxy is available (owned or shared)
- `ownsProxy()` - Check if this window owns the process
- `checkPortInUse(port)` - Check if port is in use

**Key Implementation Details:**
- Uses `child_process.spawn()` to launch mitmdump
- Health check polls every 5 seconds for self-healing
- Automatically restarts proxy if it dies
- Handles multi-window scenarios with shared proxy
- Pipes stdout/stderr to VS Code output channel
- Auto-configures VS Code's `http.proxy` setting

### ConfigManager (config.ts)

Handles VS Code settings:

- `getProxyConfig()` - Reads current configuration
- `isEnabled()` - Check if extension is enabled
- `setEnabled()` - Update enabled state
- `setVSCodeProxy()` - Configure VS Code proxy
- `clearVSCodeProxy()` - Remove proxy configuration

### NetworkInterceptor (mitm_addon.py)

Python addon that runs inside mitmproxy:

- `load()` - Register configuration options
- `configure()` - Handle configuration updates
- `request()` - Intercept each HTTP request
- `is_blacklisted()` - Check if URL matches patterns

**Pattern Matching:**
- Pre-compiles regex patterns for performance
- Checks patterns in order (short-circuit on first match)
- Supports domain, path, exact, and regex types

## Adding New Features

### Add New Blacklist Pattern Type

1. Update `BlacklistPattern` class in `mitm_addon.py`:
```python
def matches(self, url: str, host: str) -> bool:
    if self.type == "newtype":
        # Your matching logic
        return check_condition(url)
```

2. Update TypeScript types in `types.ts`:
```typescript
export interface BlacklistPattern {
    type: 'exact' | 'domain' | 'path' | 'regex' | 'newtype';
    // ...
}
```

3. Add documentation and examples

### Add New Command

1. Register in `package.json`:
```json
{
  "command": "mitm-vscode.myCommand",
  "title": "MITM: My Command"
}
```

2. Implement in `extension.ts`:
```typescript
context.subscriptions.push(
    vscode.commands.registerCommand('mitm-vscode.myCommand', async () => {
        // Implementation
    })
);
```

### Add New Configuration Option

1. Define in `package.json`:
```json
"mitm-vscode.myOption": {
  "type": "string",
  "default": "value",
  "description": "My option description"
}
```

2. Read in `ConfigManager`:
```typescript
myOption: config.get<string>('myOption', 'default')
```

3. Pass to mitmproxy if needed:
```typescript
'--set', `my_option=${config.myOption}`
```

## Testing

### Manual Testing Checklist

- [ ] Extension activates without errors
- [ ] Proxy starts successfully
- [ ] VS Code proxy settings are updated
- [ ] Blocked requests appear in logs
- [ ] Allowed requests pass through
- [ ] Blacklist reload works
- [ ] Status bar updates correctly
- [ ] Commands work as expected
- [ ] Extension deactivates cleanly
- [ ] Proxy stops when disabled

### Test Blacklist Patterns

Create a test blacklist:

```yaml
patterns:
  - type: domain
    value: httpbin.org
    description: "Test domain"
```

Test with curl:
```bash
curl -x http://localhost:8866 http://httpbin.org/get
# Should be blocked
```

## Performance Optimization

### Current Performance

- Pattern matching: O(n) where n = number of patterns
- Regex compilation: Done once at startup
- Memory: ~30-50MB for proxy process
- Latency: ~1-2ms overhead per request

### Optimization Tips

1. **Pattern Order**: Place most common patterns first
2. **Regex Optimization**: Keep regex simple, avoid backtracking
3. **Caching**: Consider caching match results (not implemented)
4. **Lazy Loading**: Only load blacklist when needed

## Debugging

### Extension Not Starting

1. Check Output → MITM Interceptor
2. Look for error messages
3. Verify mitmproxy is installed: `mitmdump --version`
4. Check port is not in use: `lsof -i :8866`

### Requests Not Being Blocked

1. Check if proxy is running: Status bar shows `MITM:8866`
2. Verify VS Code restarted after enabling
3. Check blacklist patterns are correct
4. Enable logging and check output
5. Test pattern with curl

### Python Addon Issues

1. Run addon manually:
```bash
mitmdump -s mitm_addon.py --set blacklist_config=blacklist.json
```

2. Check for Python errors in output
3. Verify JSON syntax: `python -c "import json; json.load(open('blacklist.json'))"`

## Code Style

- Follow TypeScript best practices
- Use async/await for async operations
- Add JSDoc comments for public methods
- Use descriptive variable names
- Keep functions small and focused
- Handle errors gracefully

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Test thoroughly
5. Update documentation
6. Submit a pull request

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Run `npm run compile`
4. Test extension thoroughly
5. Create git tag: `git tag v0.1.0`
6. Build VSIX: `vsce package`
7. Publish: `vsce publish`

## Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [mitmproxy Documentation](https://docs.mitmproxy.org)
- [mitmproxy Addon API](https://docs.mitmproxy.org/stable/addons-overview/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Getting Help

- Check existing issues on GitHub
- Read the documentation thoroughly
- Review example code in this project
- Ask questions in issues/discussions

## License

MIT License - See LICENSE file for details
