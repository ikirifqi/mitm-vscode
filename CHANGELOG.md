# Changelog

All notable changes to the "MITM Network Interceptor" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-01-13

### Added
- **Request body matching**: New pattern types for inspecting request body content
  - `type: "body"` - Block requests if body contains specific string
  - `type: "body-allow"` - Whitelist requests if body contains specific string (bypasses all other blocks)
- Body-allow patterns act as whitelist with highest priority
- **Idle timeout**: Configurable auto-stop when proxy is inactive (default: 60 minutes, configurable via settings)
- **Orphaned proxy detection**: Health check now detects and restarts orphaned proxies (owner window closed)
- **Smart ownership transfer**: When owner window closes, another window detects, kills orphaned process, and takes over with immediate logs
- Comprehensive body matching documentation in `docs/BODY-MATCHING.md`
- Examples of body matching in `examples/blacklist-custom.json`

### Fixed
- GitHub Actions release workflow now has proper permissions to create tags
- Added `@vscode/vsce` as dev dependency for packaging
- Removed `__pycache__` from git tracking
- Fixed all files to have exactly 1 trailing newline

### Changed
- Updated TypeScript types to include new pattern types
- Enhanced pattern matching logic with priority system (whitelist first, then blocks)
- Improved health check to detect orphaned processes
- Health check now clears previous intervals to prevent memory leaks

### Performance
- Activity tracking with minimal overhead (updates timestamp on stdout only)
- Idle check runs every 60 seconds (low CPU impact)
- Health check properly cleans up intervals to prevent memory leaks
- Orphan detection uses efficient parent process checking

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
  - **Request body matching**: Block or allow based on body content
  - **Body whitelist**: `body-allow` patterns bypass all other blocks
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
