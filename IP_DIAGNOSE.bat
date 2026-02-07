@echo off
REM ========================================
REM   IP-DIAGNOSE SKRIPT
REM   Zeigt alle relevanten Netzwerk-Infos
REM ========================================

echo.
echo ================================================
echo            IP-DIAGNOSE
echo ================================================
echo.

echo --- AKTUELLE IP-ADRESSEN ---
ipconfig | findstr /C:"IPv4"
echo.

echo --- NETZWERK-ADAPTER ---
ipconfig | findstr /C:"Ethernet" /C:"WLAN" /C:"Drahtlos"
echo.

echo --- HOTSPOT-STATUS (falls aktiv) ---
netsh wlan show hostednetwork
echo.

echo --- OFFENE PORTS (3000 und 8000) ---
netstat -an | findstr ":3000 :8000"
echo.

echo --- FIREWALL-REGELN ---
netsh advfirewall firewall show rule name=all | findstr /C:"Radstation"
echo.

echo ================================================
echo   AUSWERTUNG:
echo ================================================
echo 1. Suche oben nach "IPv4" - das ist deine IP
echo 2. Wenn Hotspot aktiv: Suche "192.168.137.1"
echo 3. Bei normalem WLAN: Suche "192.168.178.x"
echo 4. Diese IP nutzt du dann für Netzwerk-Zugriff
echo.
echo Beispiel:
echo   IPv4-Adresse: 192.168.178.53
echo   --^gt; Nutze: http://192.168.178.53:3000
echo.
echo ================================================
pause
