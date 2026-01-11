@echo off
echo ========================================
echo  M73 BRAIN - EMAIL SENDER STARTUP
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo [1/2] Installing dependencies...
    call npm install
) else (
    echo [1/2] Dependencies already installed
)

echo [2/2] Starting M73 Brain (Email Sender)...
echo.
echo ========================================
echo  M73 BRAIN ONLINE
echo ========================================
echo.
echo Agent: M73 Brain - Email Sender
echo Port: http://localhost:6001
echo SMTP: your-email@yourdomain.com
echo.
echo Functionality:
echo - 5-Email Drip Campaign
echo - Auto sequence tracking
echo - Location-based hazard detection
echo - Rate limiting (30s between emails)
echo.
echo Press Ctrl+C to stop the agent
echo ========================================
echo.

node brain-m73.js

pause
