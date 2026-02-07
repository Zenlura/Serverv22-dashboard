@echo off
echo ========================================
echo  Radstation Warenwirtschaft - STARTEN
echo ========================================
echo.

echo [0/4] Pruefe Docker Desktop...
tasklist /FI "IMAGENAME eq Docker Desktop.exe" 2>NUL | find /I /N "Docker Desktop.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo Docker Desktop laeuft bereits.
) else (
    echo Starte Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo Warte 30 Sekunden bis Docker bereit ist...
    timeout /t 30 /nobreak
)

echo.
cd /d C:\Users\Startklar\Documents\Server\Serverv2

echo [1/4] Virtual Environment aktivieren...
call venv\Scripts\activate.bat

echo.
echo [2/4] Backend starten...
start "Backend - Port 8000" cmd /k "python -m uvicorn app.main:app --reload"

echo.
echo [3/4] Frontend starten...
cd frontend
start "Frontend - Port 3000" cmd /k "npm run dev"

echo.
echo ========================================
echo  GESTARTET!
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo Frontend: http://localhost:3000
echo.
echo Druecke eine Taste zum Beenden...
pause > nul
