#!/bin/bash

# Setup script for MITM VSCode Extension development
# This script sets up the development environment

set -e

echo "=========================================="
echo "MITM VSCode Extension - Setup"
echo "=========================================="
echo ""

# Check Node.js
echo "Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi
echo "✅ Node.js $(node --version)"

# Check npm
echo "Checking npm..."
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi
echo "✅ npm $(npm --version)"

# Check Python
echo "Checking Python..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ first."
    exit 1
fi
echo "✅ Python $(python3 --version)"

# Check pip
echo "Checking pip..."
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed."
    exit 1
fi
echo "✅ pip $(pip3 --version)"

# Install Node dependencies
echo ""
echo "Installing Node.js dependencies..."
npm install

# Install Python dependencies
echo ""
echo "Installing Python dependencies..."
pip3 install -r requirements.txt

# Check mitmproxy
echo ""
echo "Checking mitmproxy..."
if ! command -v mitmdump &> /dev/null; then
    echo "⚠️  mitmproxy is not installed."
    echo ""
    echo "To install mitmproxy:"
    echo "  macOS:   brew install mitmproxy"
    echo "  Linux:   pip3 install mitmproxy"
    echo "  Windows: pip3 install mitmproxy"
    echo ""
    read -p "Would you like to install it now with pip? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        pip3 install mitmproxy
        echo "✅ mitmproxy installed"
    else
        echo "⚠️  Please install mitmproxy manually before using the extension"
    fi
else
    echo "✅ mitmproxy $(mitmdump --version | head -n 1)"
fi

# Create .vscode directory if it doesn't exist
echo ""
echo "Setting up VS Code configuration..."
mkdir -p .vscode

# Create launch.json if it doesn't exist
if [ ! -f .vscode/launch.json ]; then
    cat > .vscode/launch.json << 'EOF'
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Run Extension",
            "type": "extensionHost",
            "request": "launch",
            "args": [
                "--extensionDevelopmentPath=${workspaceFolder}"
            ],
            "outFiles": [
                "${workspaceFolder}/out/**/*.js"
            ],
            "preLaunchTask": "${defaultBuildTask}"
        }
    ]
}
EOF
    echo "✅ Created .vscode/launch.json"
else
    echo "✅ .vscode/launch.json already exists"
fi

# Create tasks.json if it doesn't exist
if [ ! -f .vscode/tasks.json ]; then
    cat > .vscode/tasks.json << 'EOF'
{
    "version": "2.0.0",
    "tasks": [
        {
            "type": "npm",
            "script": "watch",
            "problemMatcher": "$tsc-watch",
            "isBackground": true,
            "presentation": {
                "reveal": "never"
            },
            "group": {
                "kind": "build",
                "isDefault": true
            }
        }
    ]
}
EOF
    echo "✅ Created .vscode/tasks.json"
else
    echo "✅ .vscode/tasks.json already exists"
fi

# Compile TypeScript
echo ""
echo "Compiling TypeScript..."
npm run compile

echo ""
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Open this project in VS Code"
echo "  2. Press F5 to launch Extension Development Host"
echo "  3. Test the extension in the new window"
echo ""
echo "For certificate setup (required for HTTPS):"
echo "  Run: mitmdump --version (generates certificate)"
echo "  Then follow instructions in QUICKSTART.md"
echo ""
echo "Documentation:"
echo "  - README.md      - User documentation"
echo "  - QUICKSTART.md  - Quick start guide"
echo "  - DEVELOPMENT.md - Development guide"
echo ""
