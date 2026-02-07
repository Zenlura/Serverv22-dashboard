"""
Seed Data Script - Kategorien + Lieferanten
Session 1.2
"""
import sys
import os

# Füge app-Verzeichnis zum Path hinzu
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import sessionmaker
from app.database import engine
from app.models.kategorie import Kategorie
from app.models.lieferant import Lieferant


def seed_kategorien(session):
    """Fügt Kategorien ein"""
    print("📁 Erstelle Kategorien...")
    
    kategorien = [
        {"name": "Antrieb", "beschreibung": "Ketten, Kassetten, Schaltungen"},
        {"name": "Beleuchtung", "beschreibung": "Scheinwerfer, Rücklichter, Dynamos"},
        {"name": "Bremsen", "beschreibung": "Bremsbeläge, Bremsscheiben, Bremszüge"},
        {"name": "Reifen & Schläuche", "beschreibung": "Mäntel, Schläuche, Felgenbänder"},
        {"name": "Lenkung & Sattel", "beschreibung": "Lenker, Griffe, Sättel, Sattelstützen"},
        {"name": "Rahmen & Gabel", "beschreibung": "Rahmenteile, Gabeln, Lager"},
        {"name": "Zubehör", "beschreibung": "Schlösser, Körbe, Schutzbleche, Gepäckträger"},
        {"name": "Werkzeug", "beschreibung": "Werkzeuge für Reparaturen"},
        {"name": "Elektronik", "beschreibung": "E-Bike Komponenten, Computer"},
        {"name": "Sonstiges", "beschreibung": "Andere Artikel"},
    ]
    
    created = 0
    for kat_data in kategorien:
        # Prüfen ob schon existiert
        existing = session.query(Kategorie).filter_by(name=kat_data["name"]).first()
        if existing:
            print(f"  ⏭️  Kategorie '{kat_data['name']}' existiert bereits")
            continue
            
        kategorie = Kategorie(**kat_data)
        session.add(kategorie)
        created += 1
        print(f"  ✅ Kategorie '{kat_data['name']}' erstellt")
    
    session.commit()
    print(f"✨ {created} Kategorien erstellt\n")


def seed_lieferanten(session):
    """Fügt Lieferanten ein"""
    print("🏢 Erstelle Lieferanten...")
    
    lieferanten = [
        {
            "name": "Hartje",
            "kurzname": "HAR",
            "kontakt_person": "Vertrieb",
            "email": "info@hartje.de",
            "telefon": "+49 4251 811-0",
            "website": "https://www.hartje.de",
            "ort": "Hoya",
            "notizen": "Großhändler - Hauptlieferant",
            "aktiv": True
        },
        {
            "name": "BBF",
            "kurzname": "BBF",
            "kontakt_person": "Vertrieb",
            "email": "info@bbf-bike.de",
            "telefon": "+49 4421 301-0",
            "website": "https://www.bbf-bike.de",
            "ort": "Wilhelmshaven",
            "notizen": "Bike & Business Factory",
            "aktiv": True
        },
        {
            "name": "Magura",
            "kurzname": "MAG",
            "kontakt_person": "Service",
            "email": "service@magura.com",
            "telefon": "+49 7362 95990",
            "website": "https://www.magura.com",
            "ort": "Bad Urach",
            "notizen": "Bremsen-Spezialist",
            "aktiv": True
        },
        {
            "name": "Rose Biketown",
            "kurzname": "ROSE",
            "kontakt_person": "B2B",
            "email": "b2b@rosebikes.de",
            "telefon": "+49 2871 2755-0",
            "website": "https://www.rosebikes.de",
            "ort": "Bocholt",
            "notizen": "Online-Großhändler",
            "aktiv": True
        },
    ]
    
    created = 0
    for lief_data in lieferanten:
        # Prüfen ob schon existiert
        existing = session.query(Lieferant).filter_by(name=lief_data["name"]).first()
        if existing:
            print(f"  ⏭️  Lieferant '{lief_data['name']}' existiert bereits")
            continue
            
        lieferant = Lieferant(**lief_data)
        session.add(lieferant)
        created += 1
        print(f"  ✅ Lieferant '{lief_data['name']}' erstellt")
    
    session.commit()
    print(f"✨ {created} Lieferanten erstellt\n")


def main():
    """Hauptfunktion"""
    print("═" * 60)
    print("  SESSION 1.2 - SEED DATA")
    print("  Kategorien + Lieferanten")
    print("═" * 60)
    print()
    
    # Datenbank-Verbindung
    print("🔌 Verbinde mit Datenbank...")
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    
    try:
        # Seed Data einfügen
        seed_kategorien(session)
        seed_lieferanten(session)
        
        # Zusammenfassung
        print("=" * 60)
        print("🎉 SEED DATA ERFOLGREICH!")
        print("=" * 60)
        
        # Stats
        kategorien_count = session.query(Kategorie).count()
        lieferanten_count = session.query(Lieferant).count()
        
        print(f"📊 Datenbank-Status:")
        print(f"   Kategorien:  {kategorien_count}")
        print(f"   Lieferanten: {lieferanten_count}")
        print()
        
    except Exception as e:
        print(f"\n❌ FEHLER: {e}")
        session.rollback()
        sys.exit(1)
        
    finally:
        session.close()


if __name__ == "__main__":
    main()