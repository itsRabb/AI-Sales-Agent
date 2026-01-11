@echo off
echo ========================================
echo  M715Q BRAIN - LEAD SCORER STARTUP
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo [1/2] Installing dependencies...
    call npm install
) else (
    echo [1/2] Dependencies already installed
)

echo [2/2] Starting M715Q Brain (Lead Scorer)...
echo.
echo ========================================
echo  M715Q BRAIN ONLINE
echo ========================================
echo.
echo Agent: M715Q Brain - Lead Scorer
echo Port: http://localhost:6002
echo Ollama: http://localhost:11434
echo.
echo Functionality:
echo - AI-powered lead scoring
echo - Hazard-based qualification
echo - Auto Airtable updates
echo - 3-minute check intervals
echo.
echo Press Ctrl+C to stop the agent
echo ========================================
echo.

node brain-m715q.js

pause
