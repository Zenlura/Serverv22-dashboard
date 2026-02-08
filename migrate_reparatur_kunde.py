"""
Migration: Kunde-Verknüpfung für Reparaturen

Datum: 08.02.2026
Zweck: Reparaturen mit Kundendatenbank verknüpfen
Database: PostgreSQL (nicht SQLite!)
"""

import sys
import psycopg2

def migrate():
    """Migration durchführen"""
    
    # PostgreSQL Connection (aus app/config.py)
    DB_CONFIG = {
        'dbname': 'radstation',
        'user': 'postgres',
        'password': 'radstation',
        'host': 'localhost',
        'port': 5432
    }
    
    print("🔗 Verbinde zu PostgreSQL...")
    print(f"   Database: {DB_CONFIG['dbname']}")
    print(f"   Host: {DB_CONFIG['host']}:{DB_CONFIG['port']}\n")
    
    conn = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        print("✅ Verbindung erfolgreich!\n")
        
        # 1. Prüfen ob kunde_id schon existiert
        print("🔍 Prüfe bestehende Spalten...")
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'reparaturen'
        """)
        columns = [row[0] for row in cursor.fetchall()]
        
        if 'kunde_id' in columns:
            print("ℹ️  kunde_id existiert bereits - Migration wurde schon durchgeführt")
            print("   → Keine Änderungen nötig!")
            conn.close()
            return True
        
        print(f"   Gefundene Spalten: {len(columns)}")
        print("   ✅ kunde_id fehlt - Migration nötig\n")
        
        print("🔧 Starte Migration...\n")
        
        # 2. Alte Daten sichern (kunde_name → kunde_name_legacy)
        print("📦 Schritt 1: Alte Felder umbenennen...")
        
        if 'kunde_name_legacy' not in columns:
            # PostgreSQL: ALTER COLUMN RENAME
            cursor.execute("""
                ALTER TABLE reparaturen 
                RENAME COLUMN kunde_name TO kunde_name_legacy
            """)
            cursor.execute("""
                ALTER TABLE reparaturen 
                RENAME COLUMN kunde_telefon TO kunde_telefon_legacy
            """)
            cursor.execute("""
                ALTER TABLE reparaturen 
                RENAME COLUMN kunde_email TO kunde_email_legacy
            """)
            print("   ✅ kunde_name → kunde_name_legacy")
            print("   ✅ kunde_telefon → kunde_telefon_legacy")
            print("   ✅ kunde_email → kunde_email_legacy")
        else:
            print("   ℹ️  Legacy-Felder existieren bereits")
        
        # 3. Neue Spalte hinzufügen
        print("\n📦 Schritt 2: kunde_id Spalte hinzufügen...")
        cursor.execute("""
            ALTER TABLE reparaturen 
            ADD COLUMN kunde_id INTEGER REFERENCES kunden(id) ON DELETE SET NULL
        """)
        print("   ✅ kunde_id INTEGER hinzugefügt")
        print("   ✅ Foreign Key zu kunden(id) erstellt")
        print("   ✅ ON DELETE SET NULL (Kunde gelöscht → NULL)")
        
        # 4. Index erstellen
        print("\n📦 Schritt 3: Index erstellen...")
        cursor.execute("""
            CREATE INDEX idx_reparaturen_kunde_id 
            ON reparaturen(kunde_id)
        """)
        print("   ✅ Index idx_reparaturen_kunde_id erstellt")
        
        # 5. Statistik
        print("\n📊 Analysiere Daten...")
        cursor.execute("SELECT COUNT(*) FROM reparaturen")
        total = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM reparaturen WHERE kunde_name_legacy IS NOT NULL")
        with_legacy = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM kunden")
        total_kunden = cursor.fetchone()[0]
        
        # Commit!
        conn.commit()
        conn.close()
        
        print("\n" + "="*60)
        print("✅ MIGRATION ERFOLGREICH!")
        print("="*60)
        print(f"\n📊 Statistik:")
        print(f"   ├─ Reparaturen gesamt: {total}")
        print(f"   ├─ Mit Legacy-Daten: {with_legacy}")
        print(f"   ├─ Mit kunde_id: 0 (noch keine verknüpft)")
        print(f"   └─ Kunden in DB: {total_kunden}")
        
        print("\n💡 Nächste Schritte:")
        print("   1. Backend neu starten (Ctrl+C → python -m uvicorn ...)")
        print("   2. Frontend deployen (siehe INSTALLATION.md)")
        print("   3. Neue Reparaturen mit Kunden verknüpfen!")
        
        print("\n🔄 Alte Reparaturen:")
        print("   → Behalten kunde_name_legacy")
        print("   → Funktionieren weiterhin normal")
        print("   → Können nachträglich verknüpft werden\n")
        
        return True
        
    except psycopg2.OperationalError as e:
        print(f"\n❌ PostgreSQL Verbindungsfehler!")
        print(f"   Fehler: {e}")
        print("\n🔧 Mögliche Lösungen:")
        print("   1. PostgreSQL läuft? → sudo systemctl start postgresql")
        print("   2. Passwort korrekt? → Siehe app/config.py")
        print("   3. Database 'radstation' existiert?")
        return False
        
    except psycopg2.Error as e:
        print(f"\n❌ PostgreSQL Fehler: {e}")
        if conn:
            conn.rollback()
            conn.close()
        print("\n🔧 Rollback durchgeführt - keine Änderungen gespeichert")
        return False
        
    except Exception as e:
        print(f"\n❌ Unerwarteter Fehler: {e}")
        if conn:
            conn.rollback()
            conn.close()
        return False

if __name__ == "__main__":
    success = migrate()
    sys.exit(0 if success else 1)