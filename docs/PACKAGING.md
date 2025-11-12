# Packaging Guide

How to package and install the MITM Network Interceptor extension.

## Prerequisites

Install `vsce` (Visual Studio Code Extension Manager):

```bash
npm install -g @vscode/vsce
```

## Package Extension

### Option 1: Using npm script

```bash
# Make sure code is compiled
npm run compile

# Package into .vsix file
npm run package
```

### Option 2: Using vsce directly

```bash
# Compile TypeScript
npm run compile

# Create .vsix file
vsce package
```

This creates: `mitm-vscode-0.1.0.vsix`

## Before Packaging

Make sure everything is ready:

```bash
# 1. Install dependencies
npm install

# 2. Compile TypeScript (no errors)
npm run compile

# 3. Run linter (fix any issues)
npm run lint

# 4. Verify Python addon syntax
python3 -m py_compile mitm_addon.py

# 5. Verify JSON files
python3 -c "import json; json.load(open('blacklist.json'))"
```

## Package with Specific Version

```bash
# Package with version number
vsce package 0.1.0

# Package pre-release version
vsce package --pre-release
```

## Install Packaged Extension

### Install in VS Code

**Option 1: Via Command Line**
```bash
code --install-extension mitm-vscode-0.1.0.vsix
```

**Option 2: Via VS Code UI**
1. Open VS Code
2. Go to Extensions view (Cmd+Shift+X)
3. Click "..." menu → "Install from VSIX..."
4. Select `mitm-vscode-0.1.0.vsix`

**Option 3: Drag and Drop**
1. Open VS Code
2. Drag `mitm-vscode-0.1.0.vsix` into VS Code window
3. Click "Install"

### Verify Installation

1. Restart VS Code
2. Check Extensions view - should see "MITM Network Interceptor"
3. Run command: `MITM: Enable Interception`
4. Check status bar for `🛡️ MITM:OFF`

## Uninstall

```bash
# Via command line
code --uninstall-extension your-publisher-name.mitm-vscode

# Or via VS Code Extensions view → Right-click → Uninstall
```

## Package for Distribution

### Update Publisher Name

Before publishing, update `package.json`:

```json
{
  "publisher": "your-actual-publisher-name",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/mitm-vscode.git"
  }
}
```

### Create Publisher Account

To publish to VS Code Marketplace:

1. Go to https://marketplace.visualstudio.com/manage
2. Create a publisher account
3. Get Personal Access Token from Azure DevOps
4. Login with vsce:
   ```bash
   vsce login your-publisher-name
   ```

### Publish to Marketplace

```bash
# Publish to VS Code Marketplace
vsce publish

# Or publish with version bump
vsce publish minor  # 0.1.0 → 0.2.0
vsce publish patch  # 0.1.0 → 0.1.1
vsce publish major  # 0.1.0 → 1.0.0
```

## Package Options

### Include/Exclude Files

Files are controlled by `.vscodeignore`:

```
.vscode/**
.vscode-test/**
src/**          # Source TypeScript (not needed in package)
**/*.map        # Source maps (not needed in production)
**/.DS_Store
```

### Package Size

Check package contents:

```bash
# List files that will be included
vsce ls

# Check package size
du -sh mitm-vscode-0.1.0.vsix
```

Should be around 50-100KB without node_modules.

### Optimize Package Size

If package is too large:

```bash
# Don't include devDependencies
npm prune --production

# Package
vsce package

# Restore devDependencies
npm install
```

## Troubleshooting

### Error: Missing publisher name

**Solution:** Add publisher to `package.json`:
```json
{
  "publisher": "your-name"
}
```

### Error: Missing README

**Solution:** Make sure `README.md` exists (✓ already included)

### Error: Missing LICENSE

**Solution:** Make sure `LICENSE` exists (✓ already included)

### Error: TypeScript not compiled

**Solution:**
```bash
npm run compile
```

### Error: Invalid package.json

**Solution:** Validate JSON syntax:
```bash
cat package.json | python3 -m json.tool
```

### Warning: Large package size

**Causes:**
- node_modules included (shouldn't be with .vscodeignore)
- .git directory included
- Large binary files

**Fix:**
```bash
# Check what's being included
vsce ls | grep -E '\.(node|git|log|tmp)'

# Update .vscodeignore to exclude them
```

## Distribution Methods

### 1. Direct Distribution (Manual)

Share the `.vsix` file:
```bash
# Email, Slack, etc.
# Users install with: code --install-extension mitm-vscode-0.1.0.vsix
```

### 2. GitHub Releases

```bash
# Create release on GitHub
git tag v0.1.0
git push origin v0.1.0

# Upload .vsix file to release
# Users download and install
```

### 3. VS Code Marketplace (Public)

```bash
# Package and publish
vsce publish
```

### 4. Private Marketplace

For organizations using Azure DevOps:
- Publish to private marketplace
- Only organization members can install

## Version Management

### Bump Version

Update version in `package.json`:
```json
{
  "version": "0.2.0"
}
```

Or use npm:
```bash
npm version patch  # 0.1.0 → 0.1.1
npm version minor  # 0.1.0 → 0.2.0
npm version major  # 0.1.0 → 1.0.0
```

Then package:
```bash
npm run package
```

### Semantic Versioning

Follow semantic versioning:
- **Patch** (0.1.0 → 0.1.1): Bug fixes
- **Minor** (0.1.0 → 0.2.0): New features, backwards compatible
- **Major** (0.1.0 → 1.0.0): Breaking changes

## Pre-release Versions

```bash
# Create pre-release
vsce package --pre-release

# Publish pre-release
vsce publish --pre-release
```

## Testing Packaged Extension

Before distributing:

1. **Install in clean VS Code:**
   ```bash
   code --install-extension mitm-vscode-0.1.0.vsix
   ```

2. **Test all features:**
   - Enable/disable interception
   - Reload blacklist
   - Check logs
   - Verify blocking works

3. **Test on different OS:**
   - macOS
   - Linux
   - Windows

4. **Check for errors:**
   - Open Developer Tools: Help → Toggle Developer Tools
   - Check Console for errors

## Continuous Integration

Automate packaging with GitHub Actions:

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run compile
      - run: npm run package
      - uses: actions/upload-artifact@v3
        with:
          name: vsix
          path: '*.vsix'
```

## Quick Reference

```bash
# Install vsce
npm install -g @vscode/vsce

# Package extension
vsce package

# Install locally
code --install-extension mitm-vscode-0.1.0.vsix

# Publish to marketplace
vsce publish

# Check package contents
vsce ls

# Login to marketplace
vsce login your-publisher
```

## Next Steps

After packaging:

1. Test installation on clean VS Code
2. Share with beta testers
3. Gather feedback
4. Fix issues
5. Publish to marketplace (optional)

---

For more information:
- [vsce documentation](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [VS Code Marketplace](https://marketplace.visualstudio.com/)
