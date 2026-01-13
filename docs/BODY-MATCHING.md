# Request Body Matching

## Overview

In addition to URL-based blocking, you can now block or allow requests based on their **request body content**.

## Pattern Types

### 1. Block by Body Content

Block requests that contain specific strings in their request body.

```json
{
  "type": "body",
  "value": "telemetryData",
  "description": "Block requests with telemetry in body"
}
```

**Use Cases:**
- Block telemetry data being sent
- Block specific event types
- Block tracking IDs
- Block sensitive data transmission

### 2. Allow by Body Content (Whitelist)

Allow requests that contain specific strings, **even if they match other block patterns**.

```json
{
  "type": "body-allow",
  "value": "trustedClient",
  "description": "Allow trusted client requests"
}
```

**Use Cases:**
- Whitelist legitimate API calls
- Allow internal operations
- Bypass blocking for specific clients
- Allow development/debug traffic

## Priority Order

**body-allow patterns are checked FIRST:**

```
Request arrives
  ↓
1. Check body-allow patterns
   ├─ Match? → ALLOW (bypass all other checks) ✓
   └─ No match? → Continue
  ↓
2. Check all blocking patterns (URL + body blocks)
   ├─ Match? → BLOCK ✗
   └─ No match? → ALLOW ✓
```

This means `body-allow` acts as a **whitelist** that overrides all other rules.

## Examples

### Example 1: Block Telemetry, Allow Legitimate

**Scenario:** Block all `/analytics` endpoints, except when request comes from internal tool.

```json
{
  "patterns": [
    {
      "type": "body-allow",
      "value": "internalTool",
      "description": "Allow internal tool analytics"
    },
    {
      "type": "path",
      "value": "/analytics",
      "description": "Block all analytics"
    }
  ]
}
```

**Result:**
- `POST /analytics` with body: `{"source": "internalTool", "data": "..."}` → **ALLOWED** ✓
- `POST /analytics` with body: `{"source": "external", "data": "..."}` → **BLOCKED** ✗

### Example 2: Block Specific Event Types

**Scenario:** Block pageview and click events, but allow other events.

```json
{
  "patterns": [
    {
      "type": "body",
      "value": "\"event\":\"pageview\"",
      "description": "Block pageview events"
    },
    {
      "type": "body",
      "value": "\"event\":\"click\"",
      "description": "Block click events"
    }
  ]
}
```

**Result:**
- `POST /events` with body: `{"event": "pageview"}` → **BLOCKED** ✗
- `POST /events` with body: `{"event": "click"}` → **BLOCKED** ✗
- `POST /events` with body: `{"event": "error"}` → **ALLOWED** ✓

### Example 3: Block Tracking IDs

**Scenario:** Block requests that send tracking IDs.

```json
{
  "patterns": [
    {
      "type": "body",
      "value": "trackingId",
      "description": "Block tracking ID transmission"
    },
    {
      "type": "body",
      "value": "userId",
      "description": "Block user ID transmission"
    }
  ]
}
```

**Result:**
- `POST /api/track` with body: `{"trackingId": "abc123"}` → **BLOCKED** ✗
- `POST /api/track` with body: `{"userId": "user456"}` → **BLOCKED** ✗
- `POST /api/track` with body: `{"data": "something"}` → **ALLOWED** ✓

### Example 4: Complex Whitelist

**Scenario:** Block all telemetry, but allow it for debugging.

```json
{
  "patterns": [
    {
      "type": "body-allow",
      "value": "debug=true",
      "description": "Allow debug telemetry"
    },
    {
      "type": "body-allow",
      "value": "internal-testing",
      "description": "Allow internal testing"
    },
    {
      "type": "domain",
      "value": "telemetry.example.com",
      "description": "Block all telemetry domain"
    }
  ]
}
```

**Result:**
- `POST telemetry.example.com` with body: `{"debug": true}` → **ALLOWED** ✓ (whitelist)
- `POST telemetry.example.com` with body: `{"mode": "internal-testing"}` → **ALLOWED** ✓ (whitelist)
- `POST telemetry.example.com` with body: `{"normal": "data"}` → **BLOCKED** ✗ (domain block)

## How It Works

### Request Body Inspection

```python
# In mitmproxy addon
def request(flow):
    # Get request body text
    body = flow.request.get_text() or ""

    # Check patterns
    for pattern in body_allow_patterns:
        if pattern.value in body:
            return ALLOW  # Whitelist match

    for pattern in blocking_patterns:
        if pattern.type == "body" and pattern.value in body:
            return BLOCK  # Body block match
```

### String Matching

Body matching uses **simple substring search** (case-sensitive):

```python
"telemetryData" in body  # True if body contains "telemetryData"
```

**Tips:**
- Use exact strings for reliability
- Match JSON keys: `"event":"pageview"`
- Match query-like strings: `trackingId=`
- Case matters: `"TelemetryData"` ≠ `"telemetrydata"`

## Performance Considerations

### Body Reading
- Body is only read if there are `body` or `body-allow` patterns
- Small overhead (~1-2ms for text bodies)
- Binary bodies are skipped (no decoding errors)

### Optimization
- Put common `body-allow` patterns first
- Use specific strings (not generic ones)
- Avoid very long strings to match

## Limitations

### Binary Bodies
- Binary data (images, files) cannot be matched
- Only text-based bodies work (JSON, form data, XML)
- Binary bodies are treated as empty string

### Large Bodies
- Very large request bodies (>10MB) may impact performance
- Consider using URL-based blocking for large uploads

### Encoding
- UTF-8 text bodies work best
- Other encodings may not match correctly
- Compressed bodies are decompressed automatically by mitmproxy

## Real-World Examples

### Your Custom Blacklist

```json
{
  "patterns": [
    {
      "type": "path",
      "value": "AnalyticsService/Batch",
      "description": "Block privacy breach reporting"
    },
    {
      "type": "body",
      "value": "privacyBreachData",
      "description": "Block requests with privacy breach data"
    },
    {
      "type": "body-allow",
      "value": "legitimateAnalytics",
      "description": "Allow legitimate analytics even to AnalyticsService"
    }
  ]
}
```

**Behavior:**
- `POST AnalyticsService/Batch` with body `{"type": "legitimateAnalytics"}` → **ALLOWED** ✓
- `POST AnalyticsService/Batch` with body `{"type": "privacyBreachData"}` → **BLOCKED** ✗
- `POST AnalyticsService/Batch` with body `{"type": "normal"}` → **BLOCKED** ✗ (path match)

### Blocking AI Metrics Selectively

```json
{
  "patterns": [
    {
      "type": "body-allow",
      "value": "opt-in-metrics",
      "description": "Allow metrics user opted into"
    },
    {
      "type": "path",
      "value": "AiService/ReportAiCodeChangeMetrics",
      "description": "Block AI metrics"
    },
    {
      "type": "body",
      "value": "sensitiveCode",
      "description": "Block requests with sensitive code data"
    }
  ]
}
```

## Testing Body Patterns

### Test with curl

```bash
# Test body blocking
curl -x http://localhost:8866 \
  -X POST http://example.com/api \
  -H "Content-Type: application/json" \
  -d '{"trackingId": "test123"}'
# Should be blocked if you have body pattern for "trackingId"

# Test body allow (whitelist)
curl -x http://localhost:8866 \
  -X POST http://example.com/api \
  -H "Content-Type: application/json" \
  -d '{"trustedClient": true, "trackingId": "test123"}'
# Should be ALLOWED even though trackingId is in body (whitelist wins)
```

### Check Logs

Enable logging and watch for:
```
⛔ BLOCKED: POST https://example.com/api
  Reason: body: trackingId

✓ ALLOWED: POST https://example.com/api
  Reason: Whitelisted by body-allow pattern
```

## Summary

**New Pattern Types:**
- `type: "body"` - Block if body contains string
- `type: "body-allow"` - Allow if body contains string (whitelist)

**Priority:**
1. body-allow (whitelist) - Checked FIRST
2. All other patterns - Checked if no whitelist match

**Use Cases:**
- ✅ Block telemetry with specific data
- ✅ Allow legitimate requests to same endpoint
- ✅ Fine-grained control based on payload
- ✅ Whitelist trusted clients

**Performance:**
- ~1-2ms overhead for body reading
- Only text bodies supported
- Binary bodies skipped automatically

Try it out! 🎯
