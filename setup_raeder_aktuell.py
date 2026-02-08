"""
Radstation V3 - Räder Setup (Clean Install)
Löscht alle existierenden Räder und legt die aktuellen an:
- 15× E-Bikes (8× Rose ExtraWatt Evo 1, 7× Rose ExtraWatt Evo 2)
- 4× Normale (Lehmkuhl Citybike)
- 2× Werkstatträder (Variable, für Notfälle)
- 1× Georg (Lastenrad der Stadt)
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent))

from app.database import SessionLocal
from app.models.leihrad import Leihrad, LeihradStatus
from app.models.kunde import Kunde  # Import damit SQLAlchemy Relation kennt
from app.models.vermietung import Vermietung  # Import damit SQLAlchemy Relation kennt
from datetime import datetime

def setup_raeder():
    db = SessionLocal()
    
    try:
        # SCHRITT 1: Alle existierenden Räder löschen
        existing_count = db.query(Leihrad).count()
        existing_vermietungen = db.query(Vermietung).count()
        
        if existing_count > 0 or existing_vermietungen > 0:
            print(f"\n⚠️  ACHTUNG:")
            if existing_count > 0:
                print(f"   - {existing_count} Räder in DB gefunden!")
            if existing_vermietungen > 0:
                print(f"   - {existing_vermietungen} Vermietungen in DB gefunden!")
            print("\nDiese werden ALLE gelöscht für einen sauberen Neustart.\n")
            answer = input("Fortfahren? (j/n): ")
            if answer.lower() != 'j':
                print("❌ Abgebrochen.")
                return
            
            # Erst Vermietungen löschen (Foreign Key!)
            if existing_vermietungen > 0:
                deleted_vermietungen = db.query(Vermietung).delete()
                db.commit()
                print(f"🗑️  {deleted_vermietungen} Vermietungen gelöscht.")
            
            # Dann Räder löschen
            if existing_count > 0:
                deleted = db.query(Leihrad).delete()
                db.commit()
                print(f"🗑️  {deleted} Räder gelöscht.\n")
        
        raeder_to_create = []
        
        # ========================================
        # E-BIKES (15 Stück)
        # ========================================
        
        print("📝 Erstelle 8× Rose ExtraWatt Evo 1 (8 Gang)...")
        for i in range(1, 9):
            raeder_to_create.append(
                Leihrad(
                    inventarnummer=f"EB-EVO1-{i:02d}",
                    rahmennummer=f"TEMP-EVO1-{i:03d}",  # Später nachtragen
                    marke="Rose",
                    modell="ExtraWatt Evo 1 8 Gang",
                    typ="E-Bike",
                    farbe="",  # Später nachtragen
                    rahmenhoehe="",  # Später nachtragen
                    preis_1tag=30.00,
                    preis_3tage=27.00,
                    preis_5tage=25.00,
                    status=LeihradStatus.verfuegbar,
                    angeschafft_am=datetime.now(),
                    notizen="Rose ExtraWatt Evo 1 - Details noch nachtragen"
                )
            )
        
        print("📝 Erstelle 7× Rose ExtraWatt Evo 2 (11 Gang)...")
        for i in range(1, 8):
            raeder_to_create.append(
                Leihrad(
                    inventarnummer=f"EB-EVO2-{i:02d}",
                    rahmennummer=f"TEMP-EVO2-{i:03d}",  # Später nachtragen
                    marke="Rose",
                    modell="ExtraWatt Evo 2 11 Gang",
                    typ="E-Bike",
                    farbe="",  # Später nachtragen
                    rahmenhoehe="",  # Später nachtragen
                    preis_1tag=30.00,
                    preis_3tage=27.00,
                    preis_5tage=25.00,
                    status=LeihradStatus.verfuegbar,
                    angeschafft_am=datetime.now(),
                    notizen="Rose ExtraWatt Evo 2 - Details noch nachtragen"
                )
            )
        
        # ========================================
        # NORMALE RÄDER (4 Stück)
        # ========================================
        
        print("📝 Erstelle 4× Lehmkuhl Citybike...")
        for i in range(1, 5):
            raeder_to_create.append(
                Leihrad(
                    inventarnummer=f"CB-{i:02d}",
                    rahmennummer=f"TEMP-CITY-{i:03d}",  # Später nachtragen
                    marke="Lehmkuhl",
                    modell="Citybike",  # Modell später präzisieren
                    typ="Normal",
                    farbe="",  # Später nachtragen
                    rahmenhoehe="",  # Später nachtragen
                    preis_1tag=10.00,
                    preis_3tage=10.00,
                    preis_5tage=10.00,
                    status=LeihradStatus.verfuegbar,
                    angeschafft_am=datetime.now(),
                    notizen="Lehmkuhl Citybike - Immer 10€/Tag (keine Staffelung)"
                )
            )
        
        # ========================================
        # WERKSTATTRÄDER (2 Stück)
        # ========================================
        
        print("📝 Erstelle 2× Werkstatträder...")
        for i in range(1, 3):
            raeder_to_create.append(
                Leihrad(
                    inventarnummer=f"WS-{i:02d}",
                    rahmennummer=f"WERKSTATT-{i:02d}",
                    marke="Werkstattrad",
                    modell="Variabel",
                    typ="Werkstatt",
                    farbe="Variabel",
                    rahmenhoehe="Variabel",
                    preis_1tag=0.00,  # Nicht zur Vermietung
                    preis_3tage=0.00,
                    preis_5tage=0.00,
                    status=LeihradStatus.wartung,  # Standardmäßig in Wartung
                    angeschafft_am=datetime.now(),
                    notizen="🔧 Werkstattrad - Zum Mitgeben wenn Kunden dringend Rad brauchen. Marke/Modell wechselt."
                )
            )
        
        # ========================================
        # GEORG (Lastenrad der Stadt)
        # ========================================
        
        print("📝 Erstelle Georg (Lastenrad)...")
        raeder_to_create.append(
            Leihrad(
                inventarnummer="GEORG",
                rahmennummer="LASTENRAD-STADT",
                marke="Lastenrad",
                modell="Cargo",
                typ="Lastenrad",
                farbe="",  # Später nachtragen
                rahmenhoehe="Einheitsgröße",
                preis_1tag=0.00,  # Kostenlos (Stadt-Förderung)
                preis_3tage=0.00,
                preis_5tage=0.00,
                status=LeihradStatus.verfuegbar,
                angeschafft_am=datetime.now(),
                notizen="🚲 GEORG - Kostenloses Lastenrad der Stadt! 🎉 GRATIS"
            )
        )
        
        # ========================================
        # SPEICHERN
        # ========================================
        
        print(f"\n💾 Speichere {len(raeder_to_create)} Räder in DB...")
        db.bulk_save_objects(raeder_to_create)
        db.commit()
        
        print("\n" + "="*60)
        print("✅ FERTIG! Räder erfolgreich angelegt:")
        print("="*60 + "\n")
        
        # Zusammenfassung nach Typ
        from sqlalchemy import func
        summary = db.query(
            Leihrad.typ,
            Leihrad.marke,
            func.count(Leihrad.id).label('anzahl')
        ).group_by(Leihrad.typ, Leihrad.marke).all()
        
        for typ, marke, anzahl in summary:
            print(f"  {typ:15s} | {marke:20s} | {anzahl:2d} Stück")
        
        print("\n" + "="*60)
        print(f"GESAMT: {len(raeder_to_create)} Räder")
        print("="*60)
        
        # Detail-Auflistung
        print("\n📋 DETAIL-ÜBERSICHT:\n")
        
        print("E-BIKES (15):")
        ebikes = db.query(Leihrad).filter(Leihrad.typ == 'E-Bike').order_by(Leihrad.inventarnummer).all()
        for rad in ebikes:
            print(f"  • {rad.inventarnummer:15s} - {rad.modell}")
        
        print("\nNORMALE RÄDER (4):")
        normal = db.query(Leihrad).filter(Leihrad.typ == 'Normal').order_by(Leihrad.inventarnummer).all()
        for rad in normal:
            print(f"  • {rad.inventarnummer:15s} - {rad.marke} {rad.modell}")
        
        print("\nWERKSTATT (2):")
        werkstatt = db.query(Leihrad).filter(Leihrad.typ == 'Werkstatt').order_by(Leihrad.inventarnummer).all()
        for rad in werkstatt:
            print(f"  • {rad.inventarnummer:15s} - Status: {rad.status}")
        
        print("\nGEORG (1):")
        georg = db.query(Leihrad).filter(Leihrad.inventarnummer == 'GEORG').first()
        if georg:
            print(f"  🎉 {georg.inventarnummer:15s} - {georg.notizen}")
        
        print("\n" + "="*60)
        print("💡 HINWEIS:")
        print("="*60)
        print("Fehlende Details (Rahmennummern, Farben, etc.)")
        print("können später im Frontend nachgetragen werden!")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"\n❌ FEHLER: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("\n" + "="*60)
    print("🚲 RADSTATION V3 - RÄDER SETUP")
    print("="*60)
    setup_raeder()