@echo off
REM ============================================
REM AI Agent Dashboard Startup Script (Windows)
REM ============================================

echo.
echo ╔═══════════════════════════════════════════╗
echo ║   Starting AI Agent Command Center       ║
echo ╚═══════════════════════════════════════════╝
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ERROR: Node.js is not installed!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js found: 
node --version
echo.

REM Navigate to dashboard directory
cd /d "%~dp0"

REM Check if node_modules exists
if not exist "node_modules\" (
    echo 📦 Installing dependencies...
    echo.
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo ❌ ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
    echo ✅ Dependencies installed successfully
    echo.
)

REM Check if .env file exists
if not exist ".env" (
    echo ⚠️  WARNING: .env file not found
    echo.
    echo Creating .env from .env.example...
    copy .env.example .env
    echo.
    echo ⚠️  IMPORTANT: Edit .env file and add your agent URLs!
    echo.
    notepad .env
    echo.
    echo Press any key after you've configured .env...
    pause >nul
)

REM Start the dashboard
echo.
echo 🚀 Starting Command Center...
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo   Dashboard will open at: http://localhost:4000
echo   Press Ctrl+C to stop the server
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

REM Start and automatically open browser
start http://localhost:4000

node server.js

REM If server stops
echo.
echo.
echo ⏹️  Dashboard stopped
echo.
pause
