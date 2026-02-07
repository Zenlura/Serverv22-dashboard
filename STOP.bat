@echo off
echo ========================================
echo  Radstation Warenwirtschaft - STOPPEN
echo ========================================
echo.

echo Stoppe Backend (Port 8000)...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8000" ^| find "LISTENING"') do taskkill /F /PID %%a 2>nul

echo Stoppe Frontend (Port 3000)...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do taskkill /F /PID %%a 2>nul

echo.
echo Alle Prozesse gestoppt!
echo.
pause
