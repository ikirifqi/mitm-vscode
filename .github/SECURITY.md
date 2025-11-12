# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability:

- Open a GitHub issue with the `security` label
- Provide details about the vulnerability
- Include steps to reproduce
- Suggest a fix if possible

## What to Report

Report security issues like:
- Code execution vulnerabilities
- Privilege escalation
- Data leaks or exposure
- Injection vulnerabilities
- Denial of service issues

## What NOT to Report

These are not security issues:
- Feature requests
- General bugs (use regular issues)
- Network behavior (extension is designed to intercept network traffic)

## Response Time

- **Critical**: Within 24 hours
- **High**: Within 3 days
- **Medium**: Within 1 week
- **Low**: Within 2 weeks

## Disclosure Policy

- We will investigate all reports
- We will keep you updated on progress
- We will credit you in the fix (unless you prefer anonymity)
- We follow responsible disclosure practices

## Security Best Practices

When using this extension:
- Only install from trusted sources (VS Code Marketplace)
- Review the blacklist configuration
- Monitor logs regularly
- Keep mitmproxy updated
- Only trust mitmproxy's certificate if you understand the implications

## Known Security Considerations

1. **HTTPS Interception**: Requires trusting mitmproxy's certificate
2. **Localhost Only**: Proxy binds to 127.0.0.1 (not accessible from network)
3. **Process Isolation**: Only affects VS Code, not system-wide
4. **No Data Collection**: All processing is local

## Attribution

We appreciate security researchers who help improve the project!
