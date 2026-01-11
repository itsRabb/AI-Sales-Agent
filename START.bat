@echo off
chcp 65001 >nul 2>&1
mode con: cols=140 lines=35
cls

echo.
echo                        ██████╗ ██╗     █████╗  ██████╗██╗  ██╗    ███╗   ██╗███████╗ ██████╗ ███╗   ██╗
echo                        ██╔══██╗██║    ██╔══██╗██╔════╝██║ ██╔╝    ████╗  ██║██╔════╝██╔═══██╗████╗  ██║
echo                        ██████╔╝██║    ███████║██║     █████╔╝     ██╔██╗ ██║█████╗  ██║   ██║██╔██╗ ██║
echo                        ██╔══██╗██║    ██╔══██║██║     ██╔═██╗     ██║╚██╗██║██╔══╝  ██║   ██║██║╚██╗██║
echo                        ██████╔╝███████╗██║  ██║╚██████╗██║  ██╗    ██║ ╚████║███████╗╚██████╔╝██║ ╚████║
echo                        ╚═════╝ ╚══════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝    ╚═╝  ╚═══╝╚══════╝ ╚═════╝ ╚═╝  ╚═══╝
echo.
echo                                       BLACK NEON // 2026 EDITION
echo.
echo                                    [Launching Fleet Command...]
echo.
echo ================================================================================================

if not exist "node_modules\" (
    echo [1/4] Installing dependencies...
    call npm install >nul 2>&1
) else (
    echo [1/4] Dependencies ready
)

echo [2/4] Launching Dashboard...
start "BLACK NEON // Dashboard" cmd /c "mode con: cols=140 lines=35 && title BLACK NEON DASHBOARD && cd dashboard && node server.js"

timeout /t 4 /nobreak >nul

echo [3/4] Activating Orchestrator...
start "BLACK NEON // Orchestrator" cmd /c "mode con: cols=140 lines=35 && title BLACK NEON ORCHESTRATOR && node autonomous-orchestrator.js"

timeout /t 4 /nobreak >nul

echo [4/4] Opening browser...
start http://localhost:4000

echo.
echo ================================================================================================
echo                     SYSTEM ONLINE — BLACK NEON FLEET ACTIVE
echo ================================================================================================
echo.
echo    Dashboard    → http://localhost:4000
echo    Orchestrator → http://localhost:5000
echo.
echo    Next → Start agents on M73, M715Q, and both RiPis
echo.
echo    Press any key to terminate local fleet...
pause >nul

taskkill /FI "WINDOWTITLE eq BLACK NEON*" /T /F >nul 2>&1
echo Fleet terminated.
timeout /t 2 >nul
exit