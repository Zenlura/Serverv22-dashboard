#!/usr/bin/env python3
"""
RADSTATION V3 - E-Bike Preise korrigieren
==========================================
Ändert nur die Preise der E-Bikes, ohne Räder neu anzulegen.

KORREKTE PREISE:
- E-Bikes (Rose ExtraWatt): 25€ / 22€ / 20€
- Normale Bikes (Lehmkuhl): 10€ / 10€ / 10€
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Datenbank-URL aus Umgebungsvariable oder Standard
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/radstation"
)

def fix_ebike_preise():
    """Korrigiert die E-Bike Preise"""
    
    print("\n" + "="*60)
    print("🔧 E-BIKE PREISE KORRIGIEREN")
    print("="*60 + "\n")
    
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # 1. E-Bikes aktualisieren (beide Varianten)
        print("📝 Aktualisiere E-Bike Preise...")
        
        result = session.execute(text("""
            UPDATE leihraeder 
            SET preis_1tag = 25.00,
                preis_3tage = 22.00,
                preis_5tage = 20.00
            WHERE rad_typ = 'E-Bike'
        """))
        
        print(f"✅ {result.rowcount} E-Bikes aktualisiert")
        print("   Neue Preise: 25€ / 22€ / 20€")
        
        # 2. Überprüfung
        print("\n📊 Preisübersicht:")
        print("-" * 60)
        
        result = session.execute(text("""
            SELECT 
                rad_typ,
                COUNT(*) as anzahl,
                preis_1tag,
                preis_3tage,
                preis_5tage
            FROM leihraeder
            WHERE status = 'verfuegbar'
            GROUP BY rad_typ, preis_1tag, preis_3tage, preis_5tage
            ORDER BY rad_typ
        """))
        
        for row in result:
            print(f"{row.rad_typ:15} ({row.anzahl:2}x): "
                  f"{row.preis_1tag:.2f}€ / {row.preis_3tage:.2f}€ / {row.preis_5tage:.2f}€")
        
        session.commit()
        print("\n✅ Preise erfolgreich korrigiert!")
        
    except Exception as e:
        session.rollback()
        print(f"\n❌ Fehler: {e}")
        sys.exit(1)
    finally:
        session.close()

if __name__ == "__main__":
    fix_ebike_preise()
