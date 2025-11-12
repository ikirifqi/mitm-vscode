# Contributing to MITM Network Interceptor

Thank you for your interest in contributing! This document provides guidelines for contributing to this project.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help maintain a welcoming environment

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/mitm-vscode.git`
3. Install dependencies: `npm install`
4. Run setup: `./setup.sh` (or `setup.bat` on Windows)
5. Press F5 to launch Extension Development Host

## Development Workflow

### Making Changes

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make your changes
3. Run linter: `npm run lint`
4. Run formatter: `npm run format`
5. Test thoroughly
6. Commit with clear messages

### Code Style

- **Indentation**: 2 spaces (not tabs)
- **Line length**: 100 characters max
- **Quotes**: Single quotes for strings
- **Semicolons**: Always use them
- **Trailing commas**: ES5 style
- **Naming**: camelCase for variables/functions, PascalCase for classes

Run `npm run format` before committing to ensure consistent style.

### Commit Messages

Follow conventional commits:

```
feat: Add new blacklist pattern type
fix: Resolve multi-window race condition
docs: Update README with health check info
refactor: Simplify proxy startup logic
test: Add health check recovery tests
```

### Testing

Before submitting:

1. **Manual testing**: Test all major features
2. **Multi-window**: Test with 3+ windows
3. **Enable/disable**: Test multiple cycles
4. **Blacklist**: Test all pattern types
5. **Health check**: Test proxy recovery

See `TESTING.md` for comprehensive test scenarios.

## What to Contribute

### Good First Issues

- Documentation improvements
- Example blacklist configurations
- Bug fixes
- Performance optimizations
- Additional pattern types

### Feature Requests

Before implementing major features:
1. Open an issue to discuss
2. Get feedback from maintainers
3. Ensure it aligns with project goals

## Pull Request Process

1. **Update documentation** if needed
2. **Add tests** for new features
3. **Run `npm run lint`** - fix all errors
4. **Run `npm run format`** - ensure consistent style
5. **Test thoroughly** - especially multi-window scenarios
6. **Update CHANGELOG.md** with your changes
7. **Create PR** with clear description

### PR Description Should Include

- What problem does this solve?
- How was it implemented?
- How was it tested?
- Screenshots/logs if applicable
- Breaking changes (if any)

## Code Review

Expect feedback on:
- Code quality and style
- Performance implications
- Edge cases and error handling
- Documentation completeness
- Test coverage

## Architecture Guidelines

### Keep It Simple

- Prefer simple polling over complex event coordination
- Avoid race conditions through design
- Self-healing is better than perfect prevention
- Clear logging is essential

### Key Principles

1. **Self-healing**: System should recover automatically
2. **Multi-window**: Must work with N windows
3. **No orphans**: Clean up all resources
4. **Clear errors**: Users should understand what went wrong
5. **Privacy-first**: No data collection, local-only

## Documentation

### Must Update

When making changes, update relevant docs:
- `README.md` - User-facing features
- `DEVELOPMENT.md` - Developer info
- `CHANGELOG.md` - Version history
- Code comments - Complex logic

### Documentation Style

- Clear and concise
- Examples for complex topics
- Diagrams for architecture
- Troubleshooting sections

## Questions?

- Check existing documentation first
- Search closed issues
- Open a discussion issue
- Ask in PR comments

## Thank You!

Your contributions make this project better for everyone! 🎉
