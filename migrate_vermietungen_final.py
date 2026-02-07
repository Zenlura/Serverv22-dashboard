"""
KOMPLETTE Migration für vermietungen-Tabelle
Session 7.2.2026

Änderungen:
1. ausweis_typ & ausweis_nummer LÖSCHEN
2. ausweis_abgeglichen HINZUFÜGEN
3. kaution_zurueck HINZUFÜGEN (falls noch nicht da)
4. erstellt_am DEFAULT setzen (falls NULL)
"""

from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://user:password@localhost/radstation')

print("=" * 60)
print("🔧 VERMIETUNGEN-TABELLE MIGRATION")
print("=" * 60)
print(f"📊 Datenbank: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'local'}\n")

try:
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        
        # === SCHRITT 1: Alte Felder löschen ===
        print("🗑️  SCHRITT 1: Alte Ausweis-Felder löschen...")
        
        # Check ob ausweis_typ existiert
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'vermietungen' 
            AND column_name IN ('ausweis_typ', 'ausweis_nummer')
        """))
        
        old_cols = [row[0] for row in result.fetchall()]
        
        if 'ausweis_typ' in old_cols:
            conn.execute(text("ALTER TABLE vermietungen DROP COLUMN ausweis_typ"))
            print("   ✅ ausweis_typ gelöscht")
        else:
            print("   ℹ️  ausweis_typ existiert nicht (bereits gelöscht?)")
            
        if 'ausweis_nummer' in old_cols:
            conn.execute(text("ALTER TABLE vermietungen DROP COLUMN ausweis_nummer"))
            print("   ✅ ausweis_nummer gelöscht")
        else:
            print("   ℹ️  ausweis_nummer existiert nicht (bereits gelöscht?)")
        
        # === SCHRITT 2: Neue Felder hinzufügen ===
        print("\n➕ SCHRITT 2: Neue Felder hinzufügen...")
        
        # Check welche Felder schon existieren
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'vermietungen'
        """))
        
        existing_cols = [row[0] for row in result.fetchall()]
        
        # ausweis_abgeglichen
        if 'ausweis_abgeglichen' not in existing_cols:
            conn.execute(text("""
                ALTER TABLE vermietungen 
                ADD COLUMN ausweis_abgeglichen BOOLEAN DEFAULT FALSE
            """))
            print("   ✅ ausweis_abgeglichen hinzugefügt (BOOLEAN, DEFAULT FALSE)")
        else:
            print("   ℹ️  ausweis_abgeglichen existiert bereits")
        
        # kaution_zurueck
        if 'kaution_zurueck' not in existing_cols:
            conn.execute(text("""
                ALTER TABLE vermietungen 
                ADD COLUMN kaution_zurueck BOOLEAN DEFAULT FALSE
            """))
            print("   ✅ kaution_zurueck hinzugefügt (BOOLEAN, DEFAULT FALSE)")
        else:
            print("   ℹ️  kaution_zurueck existiert bereits")
        
        # === SCHRITT 3: erstellt_am Default setzen ===
        print("\n🕐 SCHRITT 3: erstellt_am Timestamps setzen...")
        
        if 'erstellt_am' in existing_cols:
            # Für NULL-Werte: Setze auf 'now'
            result = conn.execute(text("""
                UPDATE vermietungen 
                SET erstellt_am = NOW() 
                WHERE erstellt_am IS NULL
            """))
            updated = result.rowcount
            if updated > 0:
                print(f"   ✅ {updated} Einträge mit aktuellem Timestamp versehen")
            else:
                print("   ℹ️  Alle Einträge haben bereits einen Timestamp")
        else:
            # Spalte hinzufügen mit DEFAULT
            conn.execute(text("""
                ALTER TABLE vermietungen 
                ADD COLUMN erstellt_am TIMESTAMP DEFAULT NOW()
            """))
            print("   ✅ erstellt_am Spalte hinzugefügt (mit DEFAULT NOW())")
        
        conn.commit()
        
        print("\n" + "=" * 60)
        print("🎉 MIGRATION ERFOLGREICH ABGESCHLOSSEN!")
        print("=" * 60)
        print("\n📋 Zusammenfassung:")
        print("   ❌ Entfernt: ausweis_typ, ausweis_nummer")
        print("   ✅ Hinzugefügt: ausweis_abgeglichen, kaution_zurueck")
        print("   🕐 Gefixt: erstellt_am Timestamps")
        print("\n💡 Backend neu starten mit:")
        print("   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
        print("=" * 60)
    
except Exception as e:
    print(f"\n❌ FEHLER: {e}")
    print("\nPrüfe:")
    print("  - DATABASE_URL in .env")
    print("  - Datenbank läuft")
    print("  - Berechtigungen OK")
