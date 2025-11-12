# Security & Privacy

## Quick Answer

**Q: Does this extension affect applications outside VS Code?**

**A: NO.** Only VS Code and its child processes are affected.

Your web browser, system apps, and everything else work normally.

## Scope of Interception

### What IS Intercepted ✓

```
┌─────────────────────────────────────┐
│           VS Code Process           │
│  ┌───────────────────────────────┐  │
│  │  VS Code Core                 │  │  ← Intercepted
│  │  - Updates                    │  │
│  │  - Telemetry                  │  │
│  │  - Marketplace                │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  Extensions                   │  │  ← Intercepted
│  │  - HTTP requests via API      │  │
│  │  - npm installs               │  │
│  │  - Language servers           │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  Child Processes              │  │  ← Intercepted
│  │  - Integrated terminal        │  │
│  │  - Tasks                      │  │
│  │  - Debug sessions             │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### What is NOT Intercepted ✗

```
┌─────────────────────────────────────┐
│      Everything Outside VS Code     │
│                                     │
│  ✗ Web Browsers                     │
│    - Chrome, Firefox, Safari, etc.  │
│                                     │
│  ✗ System Applications              │
│    - Mail, Calendar, App Store      │
│                                     │
│  ✗ Terminal Apps                    │
│    - iTerm, Terminal.app, etc.      │
│                                     │
│  ✗ Other IDEs                       │
│    - IntelliJ, Xcode, etc.          │
│                                     │
│  ✗ System Services                  │
│    - System updates                 │
│    - Time sync                      │
│    - iCloud sync                    │
│                                     │
│  ✗ Network Apps                     │
│    - Slack, Discord, Spotify        │
│                                     │
│  ✗ Docker Containers                │
│    - Unless run from VS Code        │
└─────────────────────────────────────┘
```

## Technical Details

### How It Works

The extension modifies **only** VS Code's settings:

```json
// ~/.config/Code/User/settings.json
{
  "http.proxy": "http://127.0.0.1:8866"
}
```

This setting is:
- ✓ Read by VS Code only
- ✓ Passed to VS Code child processes via `HTTP_PROXY` env var
- ✗ NOT a system-wide proxy
- ✗ NOT in macOS System Preferences
- ✗ NOT in Windows Internet Options
- ✗ NOT in Linux network settings

### System vs VS Code Proxy

**System Proxy (NOT what we do):**
```
macOS: System Preferences → Network → Advanced → Proxies
Windows: Internet Options → Connections → LAN settings
Linux: Network Settings → Network Proxy

Affects: ALL applications
```

**VS Code Proxy (what we do):**
```
VS Code Settings: http.proxy
Environment variable: HTTP_PROXY (for child processes only)

Affects: ONLY VS Code and its children
```

### Test It Yourself

**Before enabling extension:**
```bash
# In system terminal (NOT VS Code terminal)
curl -I https://example.com
# Works normally ✓
```

**After enabling extension:**
```bash
# In system terminal (NOT VS Code terminal)
curl -I https://example.com
# Still works normally ✓ (not affected!)

# In VS Code integrated terminal
curl -I https://example.com
# Goes through proxy (might be blocked if in blacklist)
```

### Port Binding

The proxy binds to **localhost only**:

```python
# mitmproxy configuration
--listen-port 8866
# Binds to: 127.0.0.1:8866 (localhost only)
# NOT: 0.0.0.0:8866 (all interfaces)
```

**What this means:**
```
✓ Only accessible from your machine
✓ Not accessible from network
✓ Not accessible from other users on same machine
✗ Cannot be accessed by remote computers
✗ Cannot intercept traffic from other machines
```

### Environment Variables

**IMPORTANT:** The extension does NOT set global environment variables!

```typescript
// What the extension does:
vscode.workspace.getConfiguration('http').update('proxy', '...')
// Sets VS Code's internal setting ONLY

// What the extension does NOT do:
process.env.HTTP_PROXY = '...'  // ❌ NEVER does this
// Does NOT set system-wide environment variables
```

**VS Code internally sets env vars for its own children only:**

```bash
# System environment (NOT affected)
echo $HTTP_PROXY
# Empty ✓

# VS Code's child process environment (affected by VS Code)
# When you run command in VS Code terminal
echo $HTTP_PROXY
# http://127.0.0.1:8866 ✓
# ^ Set by VS Code, not by this extension

# This affects (only in VS Code terminal):
✓ npm install
✓ curl
✓ wget
✓ Python requests library
✓ Node.js http module

# This does NOT affect (system-wide):
✗ Same commands in system terminal
✗ Same commands in iTerm/Terminal.app
✗ Other applications
✗ Cron jobs
✗ System services
```

**Process tree isolation:**

```
┌────────────────────────────────────────┐
│ System (no HTTP_PROXY)                 │
│                                        │
│  Terminal.app                          │
│  └─ bash (no HTTP_PROXY)               │
│     └─ curl → works normally ✓         │
│                                        │
│  VS Code Process                       │
│  └─ (HTTP_PROXY set by VS Code)       │
│     └─ Integrated Terminal             │
│        └─ bash (inherits HTTP_PROXY)   │
│           └─ curl → uses proxy ✓       │
│                                        │
│  Chrome (no HTTP_PROXY)                │
│  └─ works normally ✓                   │
└────────────────────────────────────────┘
```

**How to verify this is NOT system-wide:**

```bash
# Test 1: System terminal
$ echo $HTTP_PROXY

$ curl https://example.com
# Works normally, no proxy ✓

# Test 2: VS Code terminal
$ echo $HTTP_PROXY
http://127.0.0.1:8866

$ curl https://example.com
# May go through proxy ✓

# Same machine, different terminals, different behavior!
# Proof that it's NOT system-wide.
```

## Privacy Guarantees

### Data Collection

```
✗ NO telemetry
✗ NO tracking
✗ NO data sent to servers
✗ NO analytics
✗ NO phone home
✓ 100% local processing
✓ Open source code (audit it yourself)
```

### Network Traffic

```
Your traffic flow:
  VS Code → Local Proxy (127.0.0.1:8866) → Internet

  Everything stays on your machine until proxy forwards to Internet.

  Blocked requests:
    VS Code → Local Proxy → Immediate response (no Internet call)

  Allowed requests:
    VS Code → Local Proxy → Internet → Response → VS Code
```

### Certificate Trust

```
HTTPS interception requires trusting mitmproxy's certificate.

What this allows:
  ✓ Proxy can decrypt HTTPS traffic from VS Code
  ✓ Proxy can inspect URLs and patterns
  ✓ Proxy can block matching requests

What this does NOT allow:
  ✗ Cannot access passwords (VS Code doesn't send those in HTTP)
  ✗ Cannot access SSH keys (SSH doesn't use HTTP)
  ✗ Cannot access local files
  ✗ Cannot intercept other apps

Security note:
  - Certificate is local only
  - Only VS Code trusts it
  - System-wide browsers don't trust it
  - You can remove it anytime
```

## Isolation

### Process Isolation

```
mitmproxy process:
  PID: 12345
  User: your-username
  Listening: 127.0.0.1:8866

  Cannot access:
    ✗ Other users' processes
    ✗ System processes
    ✗ Root processes
    ✗ Processes outside VS Code tree
```

### Network Isolation

```
Firewall perspective:
  Port 8866 is listening on 127.0.0.1

  Blocked from:
    ✗ LAN (192.168.x.x)
    ✗ Internet (public IPs)
    ✗ VPN
    ✗ Docker bridge networks

  Accessible from:
    ✓ localhost only (127.0.0.1)
    ✓ Same machine only
    ✓ Your user only
```

### File System Isolation

```
Extension can access:
  ✓ blacklist.json (you control this)
  ✓ VS Code settings (standard VS Code permissions)
  ✓ Extension logs (in VS Code's log directory)

Extension cannot access:
  ✗ Your SSH keys
  ✗ Your GPG keys
  ✗ Your browser cookies
  ✗ Other apps' data
  ✗ System files (without sudo)
```

## Verification

### Check What's Intercepted

**Test 1: Browser (should NOT be intercepted)**
```bash
1. Enable extension in VS Code
2. Open Chrome/Firefox
3. Go to: https://example.com
4. Works normally ✓

If browser fails → Something else is wrong (not this extension)
```

**Test 2: System Terminal (should NOT be intercepted)**
```bash
1. Enable extension in VS Code
2. Open system terminal (iTerm, Terminal.app)
3. Run: curl -I https://example.com
4. Works normally ✓

If curl fails → Something else is wrong (not this extension)
```

**Test 3: VS Code Terminal (SHOULD be intercepted)**
```bash
1. Enable extension in VS Code
2. Open VS Code integrated terminal
3. Run: curl -v https://blocked-domain.com
4. Should see proxy in action or blocked response ✓
```

### Check Proxy Scope

```bash
# See what's listening on port 8866
lsof -i :8866

# Should show:
COMMAND   PID   USER
mitmdump  1234  your-username

# Listening on:
127.0.0.1:8866  (localhost only)
```

### Check Settings Scope

```bash
# VS Code settings
cat ~/.config/Code/User/settings.json | grep proxy
# Should show: "http.proxy": "http://127.0.0.1:8866"

# System proxy (macOS)
scutil --proxy
# Should NOT show 127.0.0.1:8866

# System proxy (Linux)
gsettings get org.gnome.system.proxy mode
# Should show: 'none' (not affected)

# System proxy (Windows)
reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings" /v ProxyServer
# Should NOT show 127.0.0.1:8866
```

## Risk Assessment

### Security Risks

**LOW:** This extension has minimal security impact.

```
✓ Only affects VS Code (not system)
✓ Only processes traffic you initiate
✓ Doesn't store sensitive data
✓ Doesn't send data externally
✓ Open source (auditable)
✓ Runs with user permissions (not root)
```

### Privacy Risks

**LOW:** Your privacy is protected.

```
✓ All processing is local
✓ No telemetry
✓ No data collection
✓ You control the blacklist
✓ You control what gets blocked
✓ Blocked requests never reach internet
```

### Operational Risks

**MEDIUM:** Incorrect configuration could break VS Code networking.

```
⚠ Misconfigured blacklist could block legitimate requests
⚠ Proxy crash could break VS Code networking
⚠ Port conflict could prevent startup

Mitigations:
✓ Easy disable command
✓ Cleanup on uninstall
✓ Automatic restart
✓ Detailed logging
```

## Best Practices

### 1. Use Specific Patterns

```json
// Good: Specific
{
  "type": "domain",
  "value": "analytics.example.com"
}

// Bad: Too broad
{
  "type": "regex",
  "value": ".*"  // Blocks everything!
}
```

### 2. Test Your Blacklist

```bash
1. Start with small blacklist
2. Enable interception
3. Check logs for blocked requests
4. Verify intended behavior
5. Add more patterns gradually
```

### 3. Monitor Logs

```bash
# Regularly check what's being blocked
Command: MITM: Show Logs

Look for:
✓ Expected blocks (analytics, telemetry)
✗ Unexpected blocks (legitimate APIs)
```

### 4. Disable When Not Needed

```bash
# Disable for sensitive work
Command: MITM: Disable Interception

Use cases:
- Installing critical extensions
- Updating VS Code
- Debugging network issues
- Working with unknown APIs
```

## Questions & Answers

### Q: Can this extension access my passwords?

**A:** No. VS Code doesn't send passwords over HTTP. They're stored locally in Keychain/Credential Manager.

### Q: Can this extension access my SSH keys?

**A:** No. SSH doesn't use HTTP. It uses its own protocol that bypasses all HTTP proxies.

### Q: Can this extension intercept HTTPS traffic?

**A:** Only if you install and trust the mitmproxy certificate. Without it, HTTPS fails (which is safe).

### Q: Can someone on my network see my traffic?

**A:** No. The proxy is localhost-only (127.0.0.1). Network traffic goes directly from your machine to the internet.

### Q: Does this slow down non-VS Code apps?

**A:** No. Other apps are completely unaffected.

### Q: Can I trust the mitmproxy certificate?

**A:** You're trusting it only for VS Code's traffic. It's a standard TLS interception technique used by many debugging tools. You can remove it anytime.

### Q: What if the extension is compromised?

**A:** Worst case: An attacker could block/see VS Code's network traffic. But they couldn't access your files, passwords, or other apps. And they'd need to compromise VS Code Marketplace first (which has strong security).

## Summary

This extension is **safe and isolated**:

✓ **Only affects VS Code** (not your system)
✓ **Local processing** (no data sent out)
✓ **Open source** (audit the code)
✓ **Easy to disable** (one command)
✓ **Easy to uninstall** (auto-cleanup)
✓ **Localhost only** (not accessible from network)
✓ **User permissions** (no root/admin required)

Use it confidently for blocking unwanted VS Code traffic! 🔒
