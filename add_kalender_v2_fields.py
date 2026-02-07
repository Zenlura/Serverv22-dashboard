"""
Migration: Kalender V2 - Anzahl Räder & Geplante Zeiten
Datum: 7. Februar 2026
Session: Kalender V2 Backend Foundation

Neue Felder:
- anzahl_raeder: Wieviele Räder werden gebucht (default 1)
- von_zeit: Geplante Abholzeit (z.B. 10:00)
- bis_zeit: Geplante Rückgabezeit (z.B. 18:00)

Hinweis:
- abholzeit (DateTime) bleibt → tatsächliche Abholung
- von_zeit (Time) = geplante Abholung (neu)
- bis_zeit (Time) = geplante Rückgabe (neu)
"""

from sqlalchemy import text
from app.database import engine

def upgrade():
    """Füge neue Felder für Kalender V2 hinzu"""
    
    with engine.connect() as conn:
        # 1. Anzahl Räder hinzufügen (Default 1 für alte Einträge)
        print("✅ Füge anzahl_raeder hinzu...")
        conn.execute(text("""
            ALTER TABLE vermietungen 
            ADD COLUMN IF NOT EXISTS anzahl_raeder INTEGER DEFAULT 1 NOT NULL
        """))
        conn.commit()
        
        # 2. Geplante Abholzeit hinzufügen (nullable, für alte Einträge)
        print("✅ Füge von_zeit hinzu...")
        conn.execute(text("""
            ALTER TABLE vermietungen 
            ADD COLUMN IF NOT EXISTS von_zeit TIME
        """))
        conn.commit()
        
        # 3. Geplante Rückgabezeit hinzufügen (nullable, für alte Einträge)
        print("✅ Füge bis_zeit hinzu...")
        conn.execute(text("""
            ALTER TABLE vermietungen 
            ADD COLUMN IF NOT EXISTS bis_zeit TIME
        """))
        conn.commit()
        
        print("✅ Migration erfolgreich!")
        print()
        print("Neue Felder:")
        print("  - anzahl_raeder (INTEGER, NOT NULL, DEFAULT 1)")
        print("  - von_zeit (TIME, nullable)")
        print("  - bis_zeit (TIME, nullable)")


def downgrade():
    """Entferne Felder wieder (für Rollback)"""
    
    with engine.connect() as conn:
        print("⚠️ Entferne Kalender V2 Felder...")
        
        conn.execute(text("ALTER TABLE vermietungen DROP COLUMN IF EXISTS anzahl_raeder"))
        conn.execute(text("ALTER TABLE vermietungen DROP COLUMN IF EXISTS von_zeit"))
        conn.execute(text("ALTER TABLE vermietungen DROP COLUMN IF EXISTS bis_zeit"))
        conn.commit()
        
        print("✅ Rollback erfolgreich!")


if __name__ == "__main__":
    import sys
    
    print("=" * 60)
    print("MIGRATION: Kalender V2 - Anzahl Räder & Zeiten")
    print("=" * 60)
    print()
    
    if len(sys.argv) > 1 and sys.argv[1] == "downgrade":
        downgrade()
    else:
        upgrade()
    
    print()
    print("=" * 60)
    print("FERTIG!")
    print("=" * 60)
