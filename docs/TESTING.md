# Testing Guide

This guide covers how to test the MITM Network Interceptor extension thoroughly.

## Quick Test

After setting up the development environment:

1. Press `F5` to launch Extension Development Host
2. In the new window, run command: `MITM: Enable Interception`
3. Restart VS Code when prompted
4. Run command: `MITM: Show Logs`
5. You should see blocked requests in the output

## Manual Testing

### Test 1: Basic Functionality

**Objective:** Verify extension activates and proxy starts

1. Launch extension (F5)
2. Check status bar shows `🛡️ MITM:OFF`
3. Run command: `MITM: Enable Interception`
4. Check output for:
   ```
   [MITM] Starting proxy server...
   [MITM] Proxy server started successfully
   ```
5. Status bar should show `🛡️ MITM:8866`

**Expected:** Extension starts without errors, proxy is running

### Test 2: Blacklist Pattern Matching

**Objective:** Verify different pattern types work

Create test blacklist:
```yaml
patterns:
  # Test exact match
  - type: exact
    value: http://httpbin.org/get
    description: "Exact URL test"

  # Test domain match
  - type: domain
    value: httpbin.org
    description: "Domain test"

  # Test path match
  - type: path
    value: /analytics
    description: "Path test"

  # Test regex
  - type: regex
    value: ".*test.*"
    description: "Regex test"
```

Test with curl:
```bash
# Should be blocked (domain)
curl -x http://localhost:8866 http://httpbin.org/anything

# Should be blocked (path)
curl -x http://localhost:8866 http://example.com/analytics

# Should be blocked (regex)
curl -x http://localhost:8866 http://example.com/test

# Should pass through
curl -x http://localhost:8866 http://example.com/allowed
```

**Expected:** Blocked requests return immediately, allowed requests complete normally

### Test 3: Configuration Changes

**Objective:** Verify settings updates work

1. Enable extension
2. Change `mitm-vscode.blockedResponseStatus` to 404
3. Run `MITM: Reload Blacklist`
4. Test a blocked request
5. Verify response code is 404

**Expected:** Configuration changes take effect

### Test 4: Blacklist Reload

**Objective:** Verify hot reload works

1. Start extension with default blacklist
2. Edit `blacklist.json` to add new pattern
3. Run `MITM: Reload Blacklist`
4. Test new pattern

**Expected:** New patterns work without restarting VS Code

### Test 5: Status Bar

**Objective:** Verify status bar updates correctly

1. Start with extension disabled
   - Status: `🛡️ MITM:OFF`
2. Enable extension
   - Status: `🛡️ MITM:Starting...` then `🛡️ MITM:8866`
3. Disable extension
   - Status: `🛡️ MITM:OFF`

**Expected:** Status bar always reflects current state

### Test 6: Certificate Instructions

**Objective:** Verify certificate help works

1. Run command: `MITM: Install Certificate`
2. Verify instructions appear in dialog
3. Check certificate path is correct
4. Test "Open Certificate Folder" button
5. Test "Copy Path" button

**Expected:** Instructions are clear and paths are correct

### Test 7: Enable/Disable Cycle

**Objective:** Verify can enable/disable multiple times

1. Enable → Restart → Disable → Restart → Enable → Restart
2. Check logs for errors
3. Verify proxy starts/stops cleanly
4. Verify health check starts/stops correctly

**Expected:** No errors, clean start/stop, health check polling visible in logs

### Test 8: Port Conflict

**Objective:** Verify error handling for port conflicts

1. Start something else on port 8866:
   ```bash
   python3 -m http.server 8866
   ```
2. Try to enable extension
3. Check error message

**Expected:** Clear error about port conflict

### Test 9: Invalid Blacklist

**Objective:** Verify error handling for bad config

1. Edit `blacklist.json` with invalid JSON syntax
2. Try to enable extension
3. Check error message

**Expected:** Clear error about invalid JSON

### Test 10: Multiple Restarts

**Objective:** Verify stability over multiple restarts

1. Enable extension
2. Restart VS Code 5 times
3. Check logs each time
4. Verify health check resumes after each restart

**Expected:** No errors, proxy restarts cleanly each time, health check running

### Test 11: Health Check Recovery

**Objective:** Verify health check automatically restarts proxy

1. Enable in Window 1 (starts proxy)
2. Enable in Window 2 (uses shared)
3. Close Window 1 (kills proxy)
4. Wait 10 seconds
5. Check Window 2 logs

**Expected:** See "Health check: Proxy not running, starting..." and proxy restarts

### Test 12: Manual Proxy Kill

**Objective:** Verify recovery from manual kill

1. Enable in Window 1
2. Find proxy PID: `lsof -i :8866`
3. Kill proxy: `kill <pid>`
4. Wait 10 seconds
5. Check logs

**Expected:** Health check detects and restarts proxy within 5 seconds

## Automated Testing

### Test mitmproxy Addon

```bash
# Start proxy manually
mitmdump -s mitm_addon.py \
  --set blacklist_config=blacklist.json \
  --set response_status=204 \
  --set log_blocked=true \
  --listen-port 8866

# In another terminal, run tests
curl -x http://localhost:8866 http://dc.services.visualstudio.com/telemetry
# Should be blocked

curl -x http://localhost:8866 http://example.com/allowed
# Should pass through
```

### Test Pattern Matching

```python
# test_patterns.py
import json
import re

def test_patterns():
    with open('blacklist.json') as f:
        config = json.load(f)

    patterns = config['patterns']

    # Test URLs
    test_cases = [
        ('http://dc.services.visualstudio.com/telemetry', True),
        ('http://example.com/analytics', True),
        ('http://example.com/allowed', False),
    ]

    for url, should_block in test_cases:
        blocked = False
        for pattern in patterns:
            if pattern['type'] == 'domain':
                if pattern['value'] in url:
                    blocked = True
                    break
            elif pattern['type'] == 'path':
                if pattern['value'] in url:
                    blocked = True
                    break
            elif pattern['type'] == 'regex':
                if re.search(pattern['value'], url):
                    blocked = True
                    break

        assert blocked == should_block, f"Failed for {url}"
        print(f"✓ {url} - {'blocked' if blocked else 'allowed'}")

if __name__ == '__main__':
    test_patterns()
    print("All tests passed!")
```

Run: `python test_patterns.py`

## Performance Testing

### Test Latency

```bash
# Without proxy
time curl http://example.com > /dev/null

# With proxy (allowed URL)
time curl -x http://localhost:8866 http://example.com > /dev/null

# Compare times
```

**Expected:** <5ms additional latency

### Test Blocked Request Speed

```bash
# Blocked request should be instant
time curl -x http://localhost:8866 http://dc.services.visualstudio.com/telemetry
```

**Expected:** <10ms response time

### Load Test

```bash
# Install apache bench
brew install httpd  # macOS

# Test 1000 requests
ab -n 1000 -c 10 -X localhost:8866 http://example.com/

# Check logs for errors
```

**Expected:** No errors, proxy handles load

## Integration Testing

### Test with Real VS Code

1. Package extension:
   ```bash
   npm install -g vsce
   vsce package
   ```

2. Install in regular VS Code:
   ```bash
   code --install-extension mitm-vscode-0.1.0.vsix
   ```

3. Enable extension in real VS Code

4. Monitor network traffic:
   ```bash
   # Terminal 1: Watch proxy logs
   tail -f ~/.vscode/extensions/mitm-vscode-*/out/proxy.log

   # Terminal 2: Use VS Code normally
   # Open files, install extensions, etc.
   ```

5. Check what gets blocked

**Expected:** Extension works in production VS Code

### Test with Extensions

Test that other extensions' network calls are intercepted:

1. Install an extension that makes network calls (e.g., GitHub Copilot)
2. Enable MITM interceptor
3. Add relevant domains to blacklist
4. Use the extension
5. Check logs for blocked requests

**Expected:** Other extensions' traffic is intercepted

## Edge Cases

### Test 1: Empty Blacklist

1. Create empty `blacklist.json`:
   ```json
   { "patterns": [] }
   ```
2. Enable extension
3. All requests should pass through

### Test 2: Very Large Blacklist

1. Generate blacklist with 10,000 patterns
2. Enable extension
3. Test performance

**Expected:** Should still be responsive (<100ms per request)

### Test 3: Complex Regex

1. Add very complex regex pattern
2. Test matching performance
3. Check for regex denial of service (ReDoS)

### Test 4: Unicode URLs

```bash
curl -x http://localhost:8866 http://example.com/café
```

**Expected:** Handles unicode correctly

### Test 5: Very Long URLs

```bash
curl -x http://localhost:8866 "http://example.com/$(python -c 'print("a"*10000)')"
```

**Expected:** Handles long URLs without error

## Regression Testing

Before each release, run through:

- [ ] All manual tests
- [ ] Pattern matching tests
- [ ] Performance tests
- [ ] Edge cases
- [ ] Test on macOS
- [ ] Test on Linux
- [ ] Test on Windows

## Test Coverage Goals

- Pattern matching: 100%
- Configuration management: 100%
- Proxy lifecycle: 100%
- Error handling: 90%
- UI interactions: 80%

## Reporting Issues

When reporting test failures:

1. What were you testing?
2. Expected behavior?
3. Actual behavior?
4. Steps to reproduce?
5. Logs from output channel
6. OS and versions (Node, Python, mitmproxy, VS Code)
7. Extension version

## Debugging Tests

### Enable Verbose Logging

In `mitm_addon.py`, add more logging:
```python
def request(self, flow: http.HTTPFlow) -> None:
    ctx.log.info(f"[DEBUG] Checking URL: {flow.request.pretty_url}")
    ctx.log.info(f"[DEBUG] Host: {flow.request.host}")
    # ... more logging
```

### Check VS Code Logs

```bash
# macOS
~/Library/Application\ Support/Code/logs/

# Linux
~/.config/Code/logs/

# Windows
%APPDATA%\Code\logs\
```

### Check mitmproxy Logs

Add to proxy startup:
```typescript
'--set', 'console_eventlog_verbosity=debug'
```

## Continuous Testing

Set up automated testing:

1. Run tests on every commit (GitHub Actions)
2. Test on multiple OS (matrix build)
3. Test different Node/Python versions
4. Performance regression tests
5. Weekly full test suite

## Conclusion

Thorough testing ensures the extension works reliably across:
- Different operating systems
- Various network conditions
- Different blacklist configurations
- Edge cases and error conditions

Always test before releasing! 🧪
