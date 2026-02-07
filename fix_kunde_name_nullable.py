"""
Migration: kunde_name nullable machen
Datum: 2026-02-07

Problem: kunde_name ist NOT NULL, aber neue Vermietungen nutzen kunde_id
Lösung: Alte Spalten nullable machen
"""

from app.database import engine
from sqlalchemy import text

def main():
    print("🔧 MIGRATION: kunde_name nullable machen")
    print("=" * 50)
    
    try:
        with engine.connect() as conn:
            # kunde_name nullable machen
            print("📝 ALTER COLUMN kunde_name...")
            conn.execute(text("ALTER TABLE vermietungen ALTER COLUMN kunde_name DROP NOT NULL"))
            
            # kunde_telefon nullable machen (falls NOT NULL)
            print("📝 ALTER COLUMN kunde_telefon...")
            conn.execute(text("ALTER TABLE vermietungen ALTER COLUMN kunde_telefon DROP NOT NULL"))
            
            # kunde_email nullable machen (falls NOT NULL)
            print("📝 ALTER COLUMN kunde_email...")
            conn.execute(text("ALTER TABLE vermietungen ALTER COLUMN kunde_email DROP NOT NULL"))
            
            # kunde_adresse nullable machen (falls NOT NULL)
            print("📝 ALTER COLUMN kunde_adresse...")
            conn.execute(text("ALTER TABLE vermietungen ALTER COLUMN kunde_adresse DROP NOT NULL"))
            
            conn.commit()
            
        print("=" * 50)
        print("✅ Migration erfolgreich!")
        print()
        print("Jetzt können neue Vermietungen mit kunde_id angelegt werden:")
        print("  - kunde_name = NULL")
        print("  - kunde_id = <ID>")
        print()
        print("Alte Vermietungen bleiben unverändert:")
        print("  - kunde_name = <Name>")
        print("  - kunde_id = NULL")
        
    except Exception as e:
        print(f"❌ Fehler bei Migration: {e}")
        print()
        print("Mögliche Ursachen:")
        print("  - Datenbank nicht erreichbar")
        print("  - Spalten existieren nicht")
        print("  - Keine Rechte für ALTER TABLE")
        return False
    
    return True

if __name__ == "__main__":
    success = main()
    if not success:
        exit(1)
