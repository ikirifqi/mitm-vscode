# Multi-Window Lifecycle

## Scenario: Window 1 Closes (The Owner)

### What Happens Now (Health Check Architecture) ✓

```
Initial State:
- Window 1: Started proxy (owns it) + Health check running
- Window 2: Using shared proxy + Health check running
- Window 3: Using shared proxy + Health check running

Window 1 closes:
  ↓
Window 1's deactivate() runs
  ↓
Proxy process is killed
  ↓
Windows 2 & 3 lose proxy temporarily
  ↓
Within 5 seconds, a health check fires (Window 2 or 3)
  ↓
Health check detects: proxy not running
  ↓
Automatically starts proxy ✓
  ↓
All windows working again ✓

Max downtime: 5 seconds
```

### Detailed Flow

**Step 1: Window 1 Closes**
```
[Window 1]
deactivate() runs
  → stop() called
  → Process killed
  → Proxy down
```

**Step 2: Windows 2 & 3 Temporarily Affected**
```
[Windows 2 & 3]
Network requests fail temporarily
http.proxy = http://127.0.0.1:8866 (dead proxy)
Duration: 0-5 seconds (until next health check)
```

**Step 3: Auto-Recovery (Health Check)**
```
[Window 2 or 3 health check fires - within 5 seconds]
Health check: Is proxy running?
  → Checks port 8866
  → Port not in use
  → Automatically starts proxy ✓

[Other window's health check fires shortly after]
Health check: Is proxy running?
  → Checks port 8866
  → Port in use
  → Does nothing (proxy already restarted) ✓

All windows working again ✓
```

## Test Scenarios

### Test 1: Close Owner Window
```bash
# Setup
1. Open 3 windows
2. Enable in all 3
3. Window 1 starts proxy
4. Windows 2 & 3 share it

# Test
1. Close Window 1
2. In Window 2: Run "MITM: Show Logs"
3. Should see: "Proxy was configured but not running"
4. Should see: "Restarting proxy for remaining windows..."
5. Proxy works again ✓

# Or just reload Window 2/3
1. Close Window 1
2. Reload Window 2 (Cmd+R)
3. Proxy auto-restarts ✓
```

### Test 2: Close Non-Owner Window
```bash
# Setup
1. Open 3 windows
2. Enable in all 3
3. Window 1 starts proxy
4. Windows 2 & 3 share it

# Test
1. Close Window 2 (not the owner)
2. Windows 1 & 3 continue working ✓
3. Proxy still running ✓
```

### Test 3: Close All But One
```bash
# Setup
1. Open 3 windows
2. Enable in all 3

# Test
1. Close Window 1 (owner)
   → Window 2 or 3 restarts proxy
2. Close Window 2
   → Window 3 continues (or restarts if it was owner)
3. Close Window 3
   → Proxy stops (no more windows)
```

## Network Impact

### Brief Downtime Window

When the owner window closes:
```
T+0s:  Window 1 closes
       Proxy killed

T+0s-5s: Network requests fail
         (Windows 2 & 3 affected)

T+5s (max): Health check fires in Window 2 or 3
            Proxy restarts automatically
            Network restored ✓
```

**Duration:** 0-5 seconds (depends on when health check fires)

**Mitigation:**
- Automatic via health check (no action needed)
- Manual restart: `MITM: Disable` then `MITM: Enable` (instant)
- Health check runs every 5 seconds in all windows

## Best Practices

### 1. Don't Close the Owner Window First

```bash
# Good practice:
1. Close non-owner windows first (2, 3)
2. Close owner window last (1)
3. Smooth shutdown, no interruption

# If you do close owner first:
- Brief network hiccup
- Auto-recovers on window reload
- Not a big deal ✓
```

### 2. Manual Disable Before Closing Many Windows

```bash
# If closing many windows:
1. Run "MITM: Disable Interception" in any window
2. Wait for reload
3. Close all windows
4. Clean shutdown ✓
```

### 3. One Window for Long Sessions

```bash
# For stability:
- Keep one "main" window open
- That window becomes the stable owner
- Other windows can come and go
```

## Edge Cases

### Case 1: All Windows Close Simultaneously

```bash
Scenario: Quit VS Code entirely

Result:
- deactivate() runs in all windows
- First one to run kills proxy
- Others just clear settings
- Clean exit ✓
```

### Case 2: Owner Window Crashes

```bash
Scenario: Window 1 crashes without deactivate()

Result:
- Proxy keeps running (orphaned)
- Other windows keep working ✓
- When Windows 2/3 restart:
  → Detect proxy already running
  → Reuse it ✓
```

### Case 3: Rapid Window Closing

```bash
Scenario: Close all 3 windows in rapid succession

Result:
- Race condition possible
- One kills proxy, others try to kill dead process
- All windows clear their settings
- Next restart is clean ✓
```

## Recovery Commands

If proxy gets into a weird state:

### Manual Restart
```bash
# In any window:
MITM: Disable Interception
Wait for reload
MITM: Enable Interception
```

### Manual Cleanup
```bash
# In any window:
MITM: Cleanup Proxy Settings
Click "Reload Now"
```

### Check Proxy Status
```bash
# In terminal:
lsof -i :8866

# If proxy running but no window owns it:
kill <pid>

# Then in VS Code:
MITM: Enable Interception
```

## Architecture Notes

### Ownership Model

```
Window 1: proxyManager.process = <Process>  (owner)
Window 2: proxyManager.process = null       (user)
Window 3: proxyManager.process = null       (user)

Only owner can kill proxy
Users just clear their settings
```

### Self-Healing

```
On window activation:
  if (proxy configured && proxy not running) {
    restart proxy automatically
  }
```

This ensures the system recovers from:
- Owner window closing
- Proxy crashes
- Manual proxy kills
- System restarts

## Comparison: Before vs After

### Before (Buggy)
```
Window 1 closes → Proxy dies → Windows 2 & 3 broken ❌
Manual fix required
```

### After (Fixed)
```
Window 1 closes → Proxy dies → Windows 2 & 3 detect → Auto-restart ✓
Self-healing
```

## Summary

- ✅ Only owner window can kill proxy
- ✅ Non-owner windows unaffected by each other closing
- ✅ Auto-restart when proxy dies
- ✅ Self-healing on window reload
- ⚠️ Brief downtime when owner closes (1-3 seconds)
- ✅ Manual recovery always available

The system is now **resilient** and **self-healing**! 🎉
