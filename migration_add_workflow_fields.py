"""
Migration: Fehlende Spalten zu reparaturen Tabelle hinzufügen
Datum: 2025-02-02
Windows-kompatibel

WICHTIG: Führe dieses Skript aus dem Serverv22-main Ordner aus!

VERWENDUNG:
    cd C:\Users\Startklar\Documents\Server\Serverv2\Serverv22-main
    python ..\migration_add_workflow_fields.py

ODER einfacher:
    Platziere dieses Skript IN den Serverv22-main Ordner und führe aus:
    python migration_add_workflow_fields.py
"""

import sys
import os
from pathlib import Path

# Stelle sicher, dass wir das app-Modul importieren können
current_dir = Path(__file__).parent.absolute()
if current_dir.name != "Serverv22-main":
    # Wir sind im übergeordneten Verzeichnis
    sys.path.insert(0, str(current_dir / "Serverv22-main"))
else:
    # Wir sind bereits im richtigen Verzeichnis
    sys.path.insert(0, str(current_dir))

from sqlalchemy import create_engine, text, inspect
from sqlalchemy.exc import OperationalError, ProgrammingError

print("=" * 70)
print("🔧 DATENBANK-MIGRATION: Workflow-Felder hinzufügen")
print("=" * 70)

# Importiere die Config
try:
    from app.config import settings
    DATABASE_URL = settings.DATABASE_URL
    print(f"✅ Config erfolgreich geladen")
    print(f"📊 Datenbank: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'localhost'}")
except ImportError as e:
    print("❌ FEHLER: Konnte app.config nicht importieren!")
    print(f"   Details: {e}")
    print("\n💡 LÖSUNG:")
    print("   1. Stelle sicher, dass du im richtigen Verzeichnis bist:")
    print("      cd C:\\Users\\Startklar\\Documents\\Server\\Serverv2\\Serverv22-main")
    print("   2. Oder platziere diese Datei direkt in Serverv22-main und führe aus:")
    print("      python migration_add_workflow_fields.py")
    print("\n   Aktuelles Verzeichnis:", os.getcwd())
    print("   Script-Verzeichnis:", current_dir)
    sys.exit(1)

print("=" * 70)


def check_column_exists(engine, table_name, column_name):
    """Prüft ob eine Spalte bereits existiert"""
    try:
        inspector = inspect(engine)
        columns = [col['name'] for col in inspector.get_columns(table_name)]
        return column_name in columns
    except Exception as e:
        print(f"⚠️  Warnung beim Prüfen der Spalte '{column_name}': {e}")
        return False


def add_missing_columns():
    """Fügt fehlende Spalten zur reparaturen Tabelle hinzu"""
    
    # Engine erstellen
    print("\n🔌 Verbinde mit Datenbank...")
    try:
        engine = create_engine(DATABASE_URL)
        # Test-Verbindung
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("✅ Datenbankverbindung erfolgreich")
    except Exception as e:
        print(f"❌ Fehler bei Datenbankverbindung: {e}")
        print("\n💡 Prüfe:")
        print("   - Läuft PostgreSQL?")
        print("   - Sind die DB-Credentials in .env korrekt?")
        print("   - Firewall-Einstellungen?")
        sys.exit(1)
    
    # Spalten die hinzugefügt werden sollen
    migrations = [
        {
            'column': 'begonnen_am',
            'sql': 'ALTER TABLE reparaturen ADD COLUMN begonnen_am TIMESTAMP',
            'description': 'Zeitpunkt, wann mit der Reparatur begonnen wurde'
        },
        {
            'column': 'prioritaet',
            'sql': 'ALTER TABLE reparaturen ADD COLUMN prioritaet INTEGER DEFAULT 3',
            'description': 'Priorität: 1=sehr dringend, 5=normal'
        },
        {
            'column': 'meister_zugewiesen',
            'sql': 'ALTER TABLE reparaturen ADD COLUMN meister_zugewiesen VARCHAR(100)',
            'description': 'Name des zugewiesenen Meisters'
        }
    ]
    
    print("\n" + "=" * 70)
    print("🔨 Führe Migrationen aus...")
    print("=" * 70)
    
    erfolgreiche_migrationen = 0
    uebersprungene_migrationen = 0
    fehlgeschlagene_migrationen = 0
    
    with engine.connect() as conn:
        for i, migration in enumerate(migrations, 1):
            column_name = migration['column']
            
            print(f"\n[{i}/{len(migrations)}] Spalte: {column_name}")
            print(f"      Beschreibung: {migration['description']}")
            
            # Prüfe ob Spalte bereits existiert
            if check_column_exists(engine, 'reparaturen', column_name):
                print(f"      ✅ Existiert bereits - überspringe")
                uebersprungene_migrationen += 1
                continue
            
            # Spalte hinzufügen
            try:
                print(f"      ➕ Füge hinzu...", end=" ")
                conn.execute(text(migration['sql']))
                conn.commit()
                print("✅ ERFOLG")
                erfolgreiche_migrationen += 1
            except (OperationalError, ProgrammingError) as e:
                print(f"❌ FEHLER")
                print(f"      Details: {e}")
                print(f"      SQL: {migration['sql']}")
                fehlgeschlagene_migrationen += 1
                
                # Bei Fehler: Trotzdem weitermachen mit nächster Migration
                continue
    
    # Zusammenfassung
    print("\n" + "=" * 70)
    print("📊 MIGRATIONS-ZUSAMMENFASSUNG")
    print("=" * 70)
    print(f"✅ Erfolgreich hinzugefügt: {erfolgreiche_migrationen}")
    print(f"⏭️  Übersprungen (existieren bereits): {uebersprungene_migrationen}")
    print(f"❌ Fehlgeschlagen: {fehlgeschlagene_migrationen}")
    
    if fehlgeschlagene_migrationen > 0:
        print("\n⚠️  ACHTUNG: Es gab Fehler bei der Migration!")
        print("💡 Versuche die Migration manuell mit psql:")
        print("   psql -U dein_username -d radstation")
        print("   Dann führe die fehlgeschlagenen ALTER TABLE Befehle manuell aus")
        return False
    
    if erfolgreiche_migrationen > 0:
        print("\n🎉 Migration erfolgreich abgeschlossen!")
        print("\n📋 Hinzugefügte Felder:")
        for migration in migrations:
            if not check_column_exists(engine, 'reparaturen', migration['column']):
                continue
            print(f"   ✓ {migration['column']}: {migration['description']}")
        
        print("\n🚀 NÄCHSTE SCHRITTE:")
        print("   1. Backend-Server NEU STARTEN:")
        print("      Strg+C (um aktuellen Server zu stoppen)")
        print("      uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
        print("\n   2. Browser neu laden (F5)")
        print("      http://localhost:3000")
        print("\n   3. Keine CORS-Fehler mehr! ✅")
        return True
    
    if uebersprungene_migrationen == len(migrations):
        print("\n✅ Alle Spalten existieren bereits!")
        print("💡 Falls du trotzdem Fehler hast:")
        print("   - Prüfe die Backend-Logs")
        print("   - Stelle sicher, dass der Server läuft")
        print("   - Prüfe die Browser-Konsole (F12)")
        return True
    
    return False


if __name__ == "__main__":
    print("\n🎯 Starte Migration...\n")
    
    try:
        success = add_missing_columns()
        
        if success:
            print("\n" + "=" * 70)
            print("✅ FERTIG! Die Datenbank wurde erfolgreich aktualisiert.")
            print("=" * 70)
            sys.exit(0)
        else:
            print("\n" + "=" * 70)
            print("⚠️  Migration mit Fehlern abgeschlossen")
            print("=" * 70)
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n\n⚠️  Migration durch Benutzer abgebrochen")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ UNERWARTETER FEHLER: {e}")
        print("\n💡 Manuell mit SQL probieren:")
        print("   1. PostgreSQL öffnen:")
        print("      psql -U dein_username -d radstation")
        print("\n   2. SQL ausführen:")
        print("      ALTER TABLE reparaturen ADD COLUMN begonnen_am TIMESTAMP;")
        print("      ALTER TABLE reparaturen ADD COLUMN prioritaet INTEGER DEFAULT 3;")
        print("      ALTER TABLE reparaturen ADD COLUMN meister_zugewiesen VARCHAR(100);")
        sys.exit(1)
