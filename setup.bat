@echo off
REM Setup script for MITM VSCode Extension development (Windows)
REM This script sets up the development environment

echo ==========================================
echo MITM VSCode Extension - Setup
echo ==========================================
echo.

REM Check Node.js
echo Checking Node.js...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo X Node.js is not installed. Please install Node.js 18+ first.
    exit /b 1
)
node --version

REM Check npm
echo Checking npm...
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo X npm is not installed.
    exit /b 1
)
npm --version

REM Check Python
echo Checking Python...
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo X Python is not installed. Please install Python 3.8+ first.
    exit /b 1
)
python --version

REM Install Node dependencies
echo.
echo Installing Node.js dependencies...
call npm install

REM Install Python dependencies
echo.
echo Installing Python dependencies...
pip install -r requirements.txt

REM Check mitmproxy
echo.
echo Checking mitmproxy...
where mitmdump >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Warning: mitmproxy is not installed.
    echo.
    echo To install mitmproxy:
    echo   pip install mitmproxy
    echo.
    set /p INSTALL="Would you like to install it now? (y/n) "
    if /i "%INSTALL%"=="y" (
        pip install mitmproxy
        echo mitmproxy installed
    ) else (
        echo Please install mitmproxy manually before using the extension
    )
) else (
    mitmdump --version
)

REM Create .vscode directory
echo.
echo Setting up VS Code configuration...
if not exist .vscode mkdir .vscode

REM Create launch.json
if not exist .vscode\launch.json (
    (
        echo {
        echo     "version": "0.2.0",
        echo     "configurations": [
        echo         {
        echo             "name": "Run Extension",
        echo             "type": "extensionHost",
        echo             "request": "launch",
        echo             "args": [
        echo                 "--extensionDevelopmentPath=${workspaceFolder}"
        echo             ],
        echo             "outFiles": [
        echo                 "${workspaceFolder}/out/**/*.js"
        echo             ],
        echo             "preLaunchTask": "${defaultBuildTask}"
        echo         }
        echo     ]
        echo }
    ) > .vscode\launch.json
    echo Created .vscode\launch.json
) else (
    echo .vscode\launch.json already exists
)

REM Create tasks.json
if not exist .vscode\tasks.json (
    (
        echo {
        echo     "version": "2.0.0",
        echo     "tasks": [
        echo         {
        echo             "type": "npm",
        echo             "script": "watch",
        echo             "problemMatcher": "$tsc-watch",
        echo             "isBackground": true,
        echo             "presentation": {
        echo                 "reveal": "never"
        echo             },
        echo             "group": {
        echo                 "kind": "build",
        echo                 "isDefault": true
        echo             }
        echo         }
        echo     ]
        echo }
    ) > .vscode\tasks.json
    echo Created .vscode\tasks.json
) else (
    echo .vscode\tasks.json already exists
)

REM Compile TypeScript
echo.
echo Compiling TypeScript...
call npm run compile

echo.
echo ==========================================
echo Setup Complete!
echo ==========================================
echo.
echo Next steps:
echo   1. Open this project in VS Code
echo   2. Press F5 to launch Extension Development Host
echo   3. Test the extension in the new window
echo.
echo For certificate setup (required for HTTPS):
echo   Run: mitmdump --version (generates certificate)
echo   Then follow instructions in QUICKSTART.md
echo.
echo Documentation:
echo   - README.md      - User documentation
echo   - QUICKSTART.md  - Quick start guide
echo   - DEVELOPMENT.md - Development guide
echo.

pause
