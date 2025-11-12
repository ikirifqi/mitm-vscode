# Pre-Publish Checklist

Before publishing to VS Code Marketplace or GitHub, complete this checklist.

## Code Quality

- [ ] All TypeScript compiles without errors: `npm run compile`
- [ ] All linter errors fixed: `npm run lint`
- [ ] Code formatted consistently: `npm run format`
- [ ] No console.log/debug statements in production code
- [ ] No TODO/FIXME comments for critical issues
- [ ] Proper error handling everywhere

## Configuration

- [ ] Update `publisher` in package.json to your actual publisher name
- [ ] Update repository URLs in package.json
- [ ] Update bug report URL
- [ ] Update homepage URL
- [ ] Remove or add icon.png (update package.json accordingly)
- [ ] Update email in .github/SECURITY.md

## Documentation

- [ ] README.md is complete and accurate
- [ ] CHANGELOG.md updated with version changes
- [ ] All documentation reflects current behavior
- [ ] Installation instructions tested
- [ ] Troubleshooting section is helpful
- [ ] Examples work as described

## Testing

- [ ] Extension activates without errors
- [ ] Proxy starts successfully
- [ ] Blacklist blocking works
- [ ] Multi-window support works
- [ ] Health check recovery works
- [ ] Enable/disable cycles work
- [ ] Cleanup on uninstall works
- [ ] Tested on macOS
- [ ] (Optional) Tested on Linux
- [ ] (Optional) Tested on Windows

## Files to Update Before Publishing

### 1. package.json
```json
{
  "publisher": "your-actual-publisher-name",  // ← Change this
  "repository": {
    "url": "https://github.com/your-username/mitm-vscode"  // ← Change this
  }
}
```

### 2. .github/SECURITY.md
```markdown
Email: your-email@example.com  // ← Change this
```

### 3. README.md
```markdown
- 🐛 [Report issues](https://github.com/your-repo/mitm-vscode/issues)  // ← Change this
```

### 4. Icon (Optional)
- Add `icon.png` (128x128 or 256x256)
- Or remove icon reference from package.json

## Pre-Publish Commands

```bash
# 1. Clean build
rm -rf out node_modules
npm install
npm run compile

# 2. Lint and format
npm run lint
npm run format

# 3. Test in development
# Press F5 and test thoroughly

# 4. Package
npm run package

# 5. Test packaged extension
code --install-extension mitm-vscode-0.1.0.vsix
# Test in real VS Code (not development host)

# 6. Uninstall test version
code --uninstall-extension your-publisher.mitm-vscode
```

## Git Pre-Publish

```bash
# 1. Commit all changes
git add .
git commit -m "chore: prepare for v0.1.0 release"

# 2. Create tag
git tag -a v0.1.0 -m "Initial release v0.1.0"

# 3. Push
git push origin main
git push origin v0.1.0
```

## Publishing to VS Code Marketplace

### One-Time Setup

1. Create publisher: https://marketplace.visualstudio.com/manage
2. Get Personal Access Token from Azure DevOps
3. Login: `vsce login your-publisher-name`

### Publish

```bash
# Publish
vsce publish

# Or publish with version bump
vsce publish patch  # 0.1.0 → 0.1.1
vsce publish minor  # 0.1.0 → 0.2.0
vsce publish major  # 0.1.0 → 1.0.0
```

## Post-Publish

- [ ] Verify extension appears in marketplace
- [ ] Test installing from marketplace
- [ ] Create GitHub release with .vsix file
- [ ] Update README with marketplace link
- [ ] Announce on social media (optional)
- [ ] Monitor issues and feedback

## Security Check

- [ ] No secrets or API keys in code
- [ ] No hardcoded personal paths
- [ ] No sensitive information in logs
- [ ] Proper .gitignore configured
- [ ] License file present and correct

## Legal Check

- [ ] LICENSE file present (MIT)
- [ ] All dependencies have compatible licenses
- [ ] No copyrighted code without permission
- [ ] Proper attribution for third-party code

## Final Verification

```bash
# Check package size
du -sh mitm-vscode-0.1.0.vsix
# Should be < 500 KB

# Check what's included
vsce ls | head -20

# Verify no personal info
grep -r "rifqi" .
grep -r "/Users/" src/
```

## Ready to Publish? ✅

If all items checked:
1. Update version in package.json
2. Update CHANGELOG.md
3. Commit and tag
4. Push to GitHub
5. Run `vsce publish`
6. Create GitHub release
7. Done! 🎉
