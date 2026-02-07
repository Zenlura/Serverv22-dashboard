@echo off
REM ========================================
REM   RADSTATION NETZWERK-START
REM   Backend (Port 8000) + Frontend (Port 3000)
REM ========================================

echo.
echo ================================================
echo   RADSTATION WIRD GESTARTET...
echo ================================================
echo.

REM Prüfe ob Python vorhanden ist
python --version >nul 2>&1
if errorlevel 1 (
    echo [FEHLER] Python nicht gefunden!
    echo Bitte Python installieren: https://python.org
    pause
    exit /b 1
)

REM Prüfe ob Node.js vorhanden ist
node --version >nul 2>&1
if errorlevel 1 (
    echo [FEHLER] Node.js nicht gefunden!
    echo Bitte Node.js installieren: https://nodejs.org
    pause
    exit /b 1
)

echo [OK] Python und Node.js gefunden
echo.

REM Zeige aktuelle IP
echo --- DEINE NETZWERK-IP ---
ipconfig | findstr /C:"IPv4"
echo.
echo Nutze diese IP für Netzwerk-Zugriff!
echo Beispiel: http://192.168.178.53:3000
echo           http://192.168.137.1:3000 (Hotspot)
echo.

REM Prüfe Firewall
echo --- FIREWALL-STATUS ---
netsh advfirewall firewall show rule name="Radstation Backend (8000)" >nul 2>&1
if errorlevel 1 (
    echo [WARNUNG] Firewall-Regel für Port 8000 fehlt!
    echo Bitte als Administrator ausführen:
    echo New-NetFirewallRule -DisplayName "Radstation Backend (8000)" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow
) else (
    echo [OK] Backend Firewall-Regel vorhanden
)

netsh advfirewall firewall show rule name="Radstation Frontend (3000)" >nul 2>&1
if errorlevel 1 (
    echo [WARNUNG] Firewall-Regel für Port 3000 fehlt!
    echo Bitte als Administrator ausführen:
    echo New-NetFirewallRule -DisplayName "Radstation Frontend (3000)" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
) else (
    echo [OK] Frontend Firewall-Regel vorhanden
)
echo.

echo ================================================
echo   STARTE SERVICES...
echo ================================================
echo.

REM Backend starten
echo [1/2] Starte Backend (Port 8000)...
start "Radstation Backend" cmd /k "cd /d "%~dp0" && call venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

REM Warte kurz
timeout /t 3 /nobreak >nul

REM Frontend starten
echo [2/2] Starte Frontend (Port 3000)...
start "Radstation Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ================================================
echo   GESTARTET!
echo ================================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo.
echo Netzwerk-Zugriff:
echo   - Finde deine IP oben unter "IPv4"
echo   - Öffne dann: http://DEINE-IP:3000
echo.
echo Zwei Fenster wurden geöffnet - NICHT SCHLIESSEN!
echo.
echo Zum Beenden: Beide Fenster schließen
echo.
pause
