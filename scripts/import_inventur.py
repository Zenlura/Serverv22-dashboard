"""
Excel Import Script - Inventur.xlsx
Session 1.6

Importiert 175 Artikel aus der Inventur-Excel-Datei
"""
import sys
import os
from pathlib import Path
import pandas as pd
from decimal import Decimal

# Projekt-Root zum Path hinzufügen
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import sessionmaker
from app.database import engine
from app.models.artikel import Artikel
from app.models.lieferant import Lieferant
from app.models.artikel_lieferant import ArtikelLieferant


def ensure_valk_exists(session):
    """Stellt sicher dass VALK Lieferant existiert"""
    valk = session.query(Lieferant).filter_by(name="VALK").first()
    
    if not valk:
        print("📦 Erstelle VALK Lieferant...")
        valk = Lieferant(
            name="VALK",
            kurzname="VALK",
            notizen="Büromaterial-Lieferant",
            aktiv=True
        )
        session.add(valk)
        session.commit()
        session.refresh(valk)
        print("   ✅ VALK angelegt")
    
    return valk


def get_lieferanten_map(session):
    """Lädt alle Lieferanten und erstellt Mapping"""
    lieferanten = session.query(Lieferant).all()
    return {lief.name: lief for lief in lieferanten}


def clean_price(value):
    """Bereinigt Preis-Werte"""
    if pd.isna(value) or value == '' or value is None:
        return None
    
    try:
        # Komma durch Punkt ersetzen falls vorhanden
        if isinstance(value, str):
            value = value.replace(',', '.')
        return Decimal(str(value))
    except:
        return None


def import_artikel(excel_path: str):
    """Hauptfunktion für Import"""
    
    print("=" * 80)
    print("  SESSION 1.6 - EXCEL IMPORT")
    print("  Inventur.xlsx → Datenbank")
    print("=" * 80)
    print()
    
    # Excel einlesen
    print(f"📂 Lese Excel-Datei: {excel_path}")
    df = pd.read_excel(excel_path)
    print(f"   ✅ {len(df)} Zeilen geladen")
    print()
    
    # Datenbank-Verbindung
    print("🔌 Verbinde mit Datenbank...")
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    
    try:
        # VALK sicherstellen
        ensure_valk_exists(session)
        
        # Lieferanten laden
        lieferanten_map = get_lieferanten_map(session)
        print(f"📦 {len(lieferanten_map)} Lieferanten geladen: {', '.join(lieferanten_map.keys())}")
        print()
        
        # Statistiken
        stats = {
            'imported': 0,
            'skipped': 0,
            'errors': 0,
            'lieferanten_verknuepfungen': 0
        }
        
        # Import durchführen
        print("🔄 Starte Import...")
        print("-" * 80)
        
        for idx, row in df.iterrows():
            try:
                # Artikelnummer (als String wegen "102a" etc.)
                artikelnummer = str(row['Art_Nr']).strip()
                bezeichnung = str(row['Art_Bez_1']).strip()
                
                # Prüfen ob Artikel schon existiert
                existing = session.query(Artikel).filter_by(artikelnummer=artikelnummer).first()
                if existing:
                    print(f"⏭️  #{artikelnummer:6s} - '{bezeichnung[:40]}' existiert bereits")
                    stats['skipped'] += 1
                    continue
                
                # Preise
                hek = clean_price(row['HEK'])
                vk = None
                if hek:
                    vk = hek * Decimal('2.0')  # Standard Aufschlag 100%
                
                # Bestand (Lager + Werkstatt)
                lager = row['Lager'] if pd.notna(row['Lager']) else 0
                werkstatt = row['Werkstatt'] if pd.notna(row['Werkstatt']) else 0
                bestand = int(lager + werkstatt)
                
                # Artikel erstellen
                artikel = Artikel(
                    artikelnummer=artikelnummer,
                    bezeichnung=bezeichnung,
                    einkaufspreis=hek,
                    verkaufspreis=vk,
                    bestand_lager=int(lager),
    		    bestand_werkstatt=int(werkstatt),
                    kategorie_id=None,  # Später manuell zuordnen
                    notizen=f"Import aus Inventur.xlsx - Lager: {int(lager)}, Werkstatt: {int(werkstatt)}"
                )
                
                session.add(artikel)
                session.flush()  # Artikel-ID generieren
                
                # Lieferanten verknüpfen
                lieferanten_verknuepft = []
                
                for lief_spalte in ['Hartje', 'BBF', 'Magura', 'VALK']:
                    lief_artnr = row[lief_spalte]
                    
                    if pd.notna(lief_artnr) and str(lief_artnr).strip():
                        lieferant = lieferanten_map.get(lief_spalte)
                        
                        if lieferant:
                            verknuepfung = ArtikelLieferant(
                                artikel_id=artikel.id,
                                lieferant_id=lieferant.id,
                                lieferanten_artikelnummer=str(lief_artnr).strip(),
                                bevorzugt=(lief_spalte == 'Hartje')  # Hartje = bevorzugter Lieferant
                            )
                            session.add(verknuepfung)
                            lieferanten_verknuepft.append(lief_spalte)
                            stats['lieferanten_verknuepfungen'] += 1
                
                session.commit()
                
                # Status ausgeben
                lief_str = f"[{', '.join(lieferanten_verknuepft)}]" if lieferanten_verknuepft else "[keine Lief.]"
                preis_str = f"{float(vk):.2f}€" if vk else "n/a"
                print(f"✅ #{artikelnummer:6s} - {bezeichnung[:40]:40s} | {bestand:3d} Stk | VK: {preis_str:8s} | {lief_str}")
                
                stats['imported'] += 1
                
            except Exception as e:
                print(f"❌ Fehler bei Zeile {idx}: {e}")
                stats['errors'] += 1
                session.rollback()
                continue
        
        print("-" * 80)
        print()
        
        # Zusammenfassung
        print("=" * 80)
        print("🎉 IMPORT ABGESCHLOSSEN!")
        print("=" * 80)
        print()
        print(f"📊 STATISTIK:")
        print(f"   Importiert:             {stats['imported']:3d} Artikel")
        print(f"   Übersprungen (vorhanden): {stats['skipped']:3d} Artikel")
        print(f"   Fehler:                  {stats['errors']:3d} Artikel")
        print(f"   Lieferanten-Verknüpfungen: {stats['lieferanten_verknuepfungen']:3d}")
        print()
        
        # DB-Status
        total_artikel = session.query(Artikel).count()
        
        # Bestand = Lager + Werkstatt
        from sqlalchemy import func as sql_func
        total_bestand = session.query(
            sql_func.sum(Artikel.bestand_lager + Artikel.bestand_werkstatt)
        ).scalar() or 0
        
        print(f"📦 DATENBANK-STATUS:")
        print(f"   Artikel gesamt:    {total_artikel}")
        print(f"   Bestand gesamt:    {total_bestand} Stück")
        print()
        
        print("✅ Excel kann jetzt archiviert werden!")
        print()
        
    except Exception as e:
        print(f"\n❌ KRITISCHER FEHLER: {e}")
        session.rollback()
        sys.exit(1)
        
    finally:
        session.close()


def main():
    """Entry Point"""
    
    # Excel-Pfad
    excel_path = Path(__file__).parent.parent / "files" / "Inventur.xlsx"
    
    if not excel_path.exists():
        print(f"❌ Excel-Datei nicht gefunden: {excel_path}")
        print()
        print("Bitte lege die Datei 'Inventur.xlsx' in den 'files/' Ordner:")
        print(f"   {excel_path.parent}/")
        sys.exit(1)
    
    # Import starten
    import_artikel(str(excel_path))


if __name__ == "__main__":
    main()