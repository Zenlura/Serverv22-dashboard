"""
Script zum Hinzufügen der kaution-Spalte zur vermietungen-Tabelle

Führe dieses Script aus mit:
python add_kaution_column.py
"""

from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

# .env laden
load_dotenv()

# Database URL aus .env
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://user:password@localhost/radstation')

print("🔧 Füge kaution-Spalte zur vermietungen-Tabelle hinzu...")
print(f"📊 Datenbank: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'local'}")

try:
    # Engine erstellen
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        # Prüfen ob Spalte schon existiert
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'vermietungen' 
            AND column_name = 'kaution'
        """))
        
        if result.fetchone():
            print("✅ kaution-Spalte existiert bereits!")
        else:
            # Spalte hinzufügen
            conn.execute(text("""
                ALTER TABLE vermietungen 
                ADD COLUMN kaution NUMERIC(10, 2) DEFAULT 0.00
            """))
            conn.commit()
            print("✅ kaution-Spalte erfolgreich hinzugefügt!")
            print("   Typ: NUMERIC(10, 2)")
            print("   Default: 0.00")
    
    print("\n🎉 Migration abgeschlossen!")
    
except Exception as e:
    print(f"\n❌ Fehler: {e}")
    print("\nFalls die Tabelle nicht existiert oder andere Probleme auftreten,")
    print("prüfe bitte deine DATABASE_URL in der .env Datei.")
