"""
Legt Standard-Kategorien für Fahrradteile an
Fahrrad-Baugruppen wie im Fahrradhandel üblich
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.kategorie import Kategorie


def setup_kategorien():
    """
    Erstellt Haupt- und Unterkategorien für Fahrradteile
    Struktur: Baugruppe > Spezifisch
    """
    session = SessionLocal()
    
    try:
        # Prüfen ob schon Kategorien existieren
        existing = session.query(Kategorie).count()
        if existing > 0:
            print(f"⚠️  Es existieren bereits {existing} Kategorien.")
            antwort = input("Trotzdem neue Kategorien hinzufügen? (j/n): ")
            if antwort.lower() != 'j':
                print("❌ Abgebrochen.")
                return
        
        # Hauptkategorien (Baugruppen am Fahrrad)
        kategorien = {
            "Antrieb": [
                "Ketten",
                "Ritzel & Kassetten",
                "Kettenblätter",
                "Kurbeln",
                "Pedale",
                "Tretlager"
            ],
            "Bremsen": [
                "Bremsbeläge",
                "Bremsscheiben",
                "Bremshebel",
                "Bremszüge",
                "Bremsflüssigkeit"
            ],
            "Reifen & Schläuche": [
                "Reifen 26 Zoll",
                "Reifen 28 Zoll",
                "Reifen 29 Zoll",
                "Schläuche",
                "Felgenbänder"
            ],
            "Beleuchtung": [
                "Frontlicht",
                "Rücklicht",
                "Dynamo",
                "Lampen & Leuchtmittel",
                "Kabel & Stecker"
            ],
            "Laufräder": [
                "Felgen",
                "Naben",
                "Speichen",
                "Laufradsätze"
            ],
            "Schaltung": [
                "Schalthebel",
                "Schaltwerke",
                "Umwerfer",
                "Schaltzüge"
            ],
            "Lenker & Vorbau": [
                "Lenker",
                "Vorbauten",
                "Griffe",
                "Lenkertaschen"
            ],
            "Sattel & Sattelstütze": [
                "Sättel",
                "Sattelstützen",
                "Sattelklemmen"
            ],
            "Rahmen & Gabel": [
                "Gabeln",
                "Steuersätze",
                "Dämpfer"
            ],
            "Gepäckträger & Taschen": [
                "Gepäckträger",
                "Körbe",
                "Taschen",
                "Spanngurte"
            ],
            "Werkzeug & Pflege": [
                "Reinigungsmittel",
                "Schmiermittel",
                "Spezialwerkzeug",
                "Montageständer"
            ],
            "Schutzbleche & Zubehör": [
                "Schutzbleche",
                "Ständer",
                "Klingeln",
                "Schlösser"
            ],
            "Service & Dienstleistungen": [
                "Inspektion",
                "Reparatur",
                "Einstellarbeiten",
                "Montage"
            ]
        }
        
        created_count = 0
        
        for haupt_name, unter_namen in kategorien.items():
            # Prüfe ob Hauptkategorie schon existiert
            haupt_kat = session.query(Kategorie).filter(
                Kategorie.name == haupt_name,
                Kategorie.parent_id == None
            ).first()
            
            if not haupt_kat:
                # Hauptkategorie anlegen
                haupt_kat = Kategorie(
                    name=haupt_name,
                    beschreibung=f"Baugruppe: {haupt_name}",
                    parent_id=None
                )
                session.add(haupt_kat)
                session.flush()  # Um ID zu bekommen
                created_count += 1
                print(f"✅ Hauptkategorie: {haupt_name}")
            else:
                print(f"⏭️  Hauptkategorie existiert: {haupt_name}")
            
            # Unterkategorien anlegen
            for unter_name in unter_namen:
                existing_unter = session.query(Kategorie).filter(
                    Kategorie.name == unter_name,
                    Kategorie.parent_id == haupt_kat.id
                ).first()
                
                if not existing_unter:
                    unter_kat = Kategorie(
                        name=unter_name,
                        beschreibung=f"{unter_name} für {haupt_name}",
                        parent_id=haupt_kat.id
                    )
                    session.add(unter_kat)
                    created_count += 1
                    print(f"   ➕ {unter_name}")
        
        session.commit()
        
        # Statistik
        total = session.query(Kategorie).count()
        haupt = session.query(Kategorie).filter(Kategorie.parent_id == None).count()
        unter = total - haupt
        
        print("\n" + "="*60)
        print(f"✅ Kategorien erfolgreich angelegt!")
        print(f"📊 Gesamt: {total} Kategorien ({haupt} Haupt, {unter} Unter)")
        print(f"🆕 Neu erstellt: {created_count}")
        print("="*60)
        
    except Exception as e:
        session.rollback()
        print(f"❌ Fehler: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    setup_kategorien()
