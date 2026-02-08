@echo off
chcp 65001 >nul
echo ========================================
echo MIGRATION CHAIN REPAIR - KOMPLETT
echo ========================================
echo.

echo SCHRITT 1: Alte Dateien löschen
echo --------------------------------
echo.

REM Lösche die alte leere Bestellungen-Migration (falls vorhanden)
if exist "migrations\versions\20260201_1948_bf400957e8c7_create_bestellungen.py" (
    echo 🗑️  Lösche: 20260201_1948_bf400957e8c7_create_bestellungen.py
    del /Q "migrations\versions\20260201_1948_bf400957e8c7_create_bestellungen.py"
    echo    ✅ Gelöscht
) else (
    echo ℹ️  Bereits weg: 20260201_1948_bf400957e8c7_create_bestellungen.py
)

echo.
echo SCHRITT 2: Reparierte Dateien kopieren
echo ----------------------------------------
echo.

REM Backup alte Dateien
if exist "migrations\versions\20260201_2228_3f6eb110f2d8_create_reparaturen.py" (
    echo 💾 Backup: 3f6eb110f2d8_create_reparaturen.py
    copy "migrations\versions\20260201_2228_3f6eb110f2d8_create_reparaturen.py" "migrations\versions\20260201_2228_3f6eb110f2d8_create_reparaturen.py.backup" >nul
)

if exist "migrations\versions\20260208_1709_13376bf44874_create_bestellungen_tables.py" (
    echo 💾 Backup: 13376bf44874_create_bestellungen_tables.py
    copy "migrations\versions\20260208_1709_13376bf44874_create_bestellungen_tables.py" "migrations\versions\20260208_1709_13376bf44874_create_bestellungen_tables.py.backup" >nul
)

echo.
echo 📂 Kopiere reparierte Dateien...
echo.

REM Kopiere die reparierten Migrationen
if exist "20260201_2228_3f6eb110f2d8_create_reparaturen.py" (
    copy /Y "20260201_2228_3f6eb110f2d8_create_reparaturen.py" "migrations\versions\" >nul
    echo ✅ Reparaturen-Migration aktualisiert
) else (
    echo ⚠️  WARNUNG: 20260201_2228_3f6eb110f2d8_create_reparaturen.py nicht gefunden!
    echo    Bitte manuell in migrations\versions\ kopieren
)

if exist "20260208_1709_13376bf44874_create_bestellungen_tables.py" (
    copy /Y "20260208_1709_13376bf44874_create_bestellungen_tables.py" "migrations\versions\" >nul
    echo ✅ Bestellungen-Migration aktualisiert
) else (
    echo ⚠️  WARNUNG: 20260208_1709_13376bf44874_create_bestellungen_tables.py nicht gefunden!
    echo    Bitte manuell in migrations\versions\ kopieren
)

echo.
echo SCHRITT 3: Migration-History synchronisieren
echo ---------------------------------------------
echo.

alembic stamp head
if %errorlevel% neq 0 (
    echo.
    echo ❌ Fehler bei 'alembic stamp head'
    echo.
    echo Mögliche Ursachen:
    echo - Dateien wurden nicht korrekt kopiert
    echo - Datenbank-Verbindung fehlt
    echo.
    echo Prüfe ob die Dateien im Ordner migrations\versions\ sind:
    echo - 20260201_2228_3f6eb110f2d8_create_reparaturen.py
    echo - 20260208_1709_13376bf44874_create_bestellungen_tables.py
    echo.
    pause
    exit /b 1
)

echo.
echo SCHRITT 4: Status prüfen
echo -------------------------
echo.

alembic current

echo.
echo ========================================
echo ✅ MIGRATION CHAIN REPARIERT!
echo ========================================
echo.
echo Die Tabellen existieren bereits und sind jetzt
echo korrekt in der Migration-History vermerkt.
echo.
echo Du kannst jetzt normal weiterarbeiten!
echo.

pause
