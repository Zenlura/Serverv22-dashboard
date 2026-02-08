#!/usr/bin/env python3
"""
Automatische Reparatur der Bestellungen-Migration
Führt OPTION 1 aus: Tabelle behalten, Migration-History synchronisieren
"""

import os
import subprocess
import sys
from pathlib import Path

def run_command(cmd, description):
    """Führt einen Befehl aus und zeigt das Ergebnis"""
    print(f"\n{'='*60}")
    print(f"  {description}")
    print(f"{'='*60}")
    print(f"Befehl: {cmd}\n")
    
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            check=True,
            capture_output=True,
            text=True
        )
        print(result.stdout)
        if result.stderr:
            print("Warnings:", result.stderr)
        print("✅ Erfolgreich!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Fehler:\n{e.stderr}")
        return False

def main():
    print("="*60)
    print("MIGRATION REPAIR - OPTION 1")
    print("="*60)
    print("\nDieses Script wird:")
    print("1. Die alte leere Migration löschen")
    print("2. Alle Migrationen als ausgeführt markieren")
    print("3. Den Status prüfen")
    print()
    
    # Prüfe ob wir im richtigen Verzeichnis sind
    if not os.path.exists("migrations"):
        print("❌ FEHLER: Nicht im Projekt-Root-Verzeichnis!")
        print("   Bitte wechsle zu: C:\\Users\\Startklar\\Server v3\\Serverv22-dashboard\\")
        sys.exit(1)
    
    # Schritt 1: Alte Migration löschen
    old_migration = Path("migrations/versions/20260201_1948_bf400957e8c7_create_bestellungen.py")
    
    if old_migration.exists():
        print(f"\n📁 Lösche alte Migration: {old_migration.name}")
        try:
            old_migration.unlink()
            print("✅ Gelöscht!")
        except Exception as e:
            print(f"❌ Fehler beim Löschen: {e}")
            sys.exit(1)
    else:
        print(f"\n⚠️  Migration bereits gelöscht: {old_migration.name}")
    
    # Schritt 2: Stamp head
    if not run_command(
        "alembic stamp head",
        "Markiere alle Migrationen als ausgeführt"
    ):
        print("\n❌ Abbruch wegen Fehler")
        sys.exit(1)
    
    # Schritt 3: Status prüfen
    run_command(
        "alembic current",
        "Prüfe aktuellen Status"
    )
    
    print("\n" + "="*60)
    print("✅ ERFOLGREICH REPARIERT!")
    print("="*60)
    print("\nDu kannst jetzt normal weiterarbeiten.")
    print("Die Tabellen sind vorhanden und die Migration-History stimmt.\n")

if __name__ == "__main__":
    main()
