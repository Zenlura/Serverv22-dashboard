"""
Script zum Hinzufügen der kaution_zurueck-Spalte zur vermietungen-Tabelle
"""

from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://user:password@localhost/radstation')

print("🔧 Füge kaution_zurueck-Spalte zur vermietungen-Tabelle hinzu...")
print(f"📊 Datenbank: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'local'}")

try:
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        # Prüfen ob Spalte schon existiert
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'vermietungen' 
            AND column_name = 'kaution_zurueck'
        """))
        
        if result.fetchone():
            print("✅ kaution_zurueck-Spalte existiert bereits!")
        else:
            # Spalte hinzufügen
            conn.execute(text("""
                ALTER TABLE vermietungen 
                ADD COLUMN kaution_zurueck BOOLEAN DEFAULT FALSE
            """))
            conn.commit()
            print("✅ kaution_zurueck-Spalte erfolgreich hinzugefügt!")
            print("   Typ: BOOLEAN")
            print("   Default: FALSE")
    
    print("\n🎉 Migration abgeschlossen!")
    
except Exception as e:
    print(f"\n❌ Fehler: {e}")
