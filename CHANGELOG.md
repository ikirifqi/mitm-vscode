# Changelog

All notable changes to the "MITM Network Interceptor" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-11-12

### Added
- Initial release of MITM Network Interceptor
- Core proxy management with mitmproxy integration
- **Health check polling**: Automatic monitoring every 5 seconds with self-healing
- Flexible blacklist pattern matching (JSON format):
  - Exact URL matching
  - Domain-based blocking
  - Path-based blocking
  - Regex pattern matching
- Configurable response behavior for blocked requests
- Real-time logging of blocked requests
- Status bar indicator showing proxy status
- Commands:
  - Enable/Disable Interception
  - Reload Blacklist
  - Show Logs
  - Install Certificate instructions
  - Cleanup Proxy Settings
- Auto-configuration of VS Code proxy settings
- Automatic window reload on enable/disable
- Hot reload of blacklist patterns
- Multi-window support with shared proxy instance
- Example blacklist configurations:
  - Telemetry blocking
  - Ad blocking
  - Custom templates
- Comprehensive documentation and guides

### Features
- Intercepts ALL network traffic from VS Code and extensions
- Minimal performance overhead (~1-2ms per request)
- Self-healing: Automatically restarts proxy if it dies (within 5 seconds)
- Multi-window support: All windows share one proxy instance
- Works with brew-installed mitmproxy (no Python dependencies)
- Privacy-focused: all traffic stays local
- No external data collection
- Open source and auditable

## [Unreleased]

### Planned Features
- Web UI for blacklist management
- Request logging to file
- Statistics dashboard
- Pattern testing tool
- Import/export blacklist presets
- Whitelist support (allow-only mode)
- Request/response inspection
- Mock response templates
- Time-based rules (enable/disable at certain times)
- Conditional blocking based on request headers
