@echo off
REM Supabase Setup Script for Windows

echo.
echo ========================================
echo  SUPABASE SETUP - AI SALES AGENT
echo ========================================
echo.

REM Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js not found. Please install Node.js first.
    pause
    exit /b 1
)

echo [1/3] Installing Supabase Node.js client...
call npm install @supabase/supabase-js

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install Supabase package
    pause
    exit /b 1
)

echo.
echo [2/3] Checking .env configuration...

if not exist ".env" (
    echo WARNING: .env file not found
    echo.
    echo Please add these lines to your .env file:
    echo   SUPABASE_URL=https://your-project-id.supabase.co
    echo   SUPABASE_ANON_KEY=your-anon-key-here
    echo   USE_SUPABASE=false
    echo.
    pause
    exit /b 1
)

echo.
echo [3/3] Testing Supabase connection...
node -e "const db = require('./supabase-db.js'); if (db.isSupabaseConfigured()) { console.log('SUCCESS: Supabase connected!'); } else { console.log('WARNING: Supabase not configured yet'); }"

echo.
echo ========================================
echo  SETUP COMPLETE!
echo ========================================
echo.
echo Next steps:
echo   1. Get credentials from https://supabase.com
echo   2. Update .env with SUPABASE_URL and SUPABASE_ANON_KEY
echo   3. Run SQL schema in Supabase dashboard
echo   4. Set USE_SUPABASE=true when ready
echo   5. Restart orchestrator
echo.
pause
