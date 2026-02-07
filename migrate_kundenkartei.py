"""
Migration: Kundenkartei-System (PostgreSQL Version)
- Erstellt kunden und kunden_warnungen Tabellen
- Migriert bestehende Vermietungen zu kunde_id
- Legt Testdaten an (Max Mustermann, Eva Musterfrau)
"""

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from sqlalchemy import create_engine, text, Column, Integer, ForeignKey
from sqlalchemy.orm import sessionmaker
from app.database import engine, Base
from app.config import settings
from app.models.kunde import Kunde, KundenWarnung
from datetime import datetime, date
from decimal import Decimal

# Session Factory (nutzt das bereits konfigurierte engine aus database.py)
SessionLocal = sessionmaker(bind=engine)

def migrate():
    db = SessionLocal()
    
    try:
        print("🚀 Migration: Kundenkartei-System")
        print("=" * 60)
        
        # ============================================================
        # STEP 1: Tabellen erstellen
        # ============================================================
        print("\n📋 STEP 1: Erstelle Tabellen...")
        
        # Kunden-Tabelle (PostgreSQL Syntax)
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS kunden (
                id SERIAL PRIMARY KEY,
                kundennummer VARCHAR(20) UNIQUE NOT NULL,
                
                -- Stammdaten
                vorname VARCHAR(100),
                nachname VARCHAR(100) NOT NULL,
                telefon VARCHAR(50),
                email VARCHAR(100),
                strasse VARCHAR(200),
                plz VARCHAR(10),
                ort VARCHAR(100),
                
                -- Status & Warnsystem
                status VARCHAR(20) DEFAULT 'normal' NOT NULL,
                gesperrt_grund TEXT,
                gesperrt_seit DATE,
                gesperrt_von VARCHAR(100),
                
                -- Sprache
                sprache VARCHAR(50),
                sprache_notiz TEXT,
                
                -- Finanzen
                offene_rechnungen DECIMAL(10,2) DEFAULT 0.00,
                zahlungsmoral VARCHAR(20),
                
                -- Meta
                notizen TEXT,
                erstellt_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                geaendert_am TIMESTAMP
            )
        """))
        
        # Kunden-Warnungen Tabelle (PostgreSQL Syntax)
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS kunden_warnungen (
                id SERIAL PRIMARY KEY,
                kunde_id INTEGER NOT NULL,
                
                typ VARCHAR(20) NOT NULL,
                grund TEXT NOT NULL,
                betrag DECIMAL(10,2),
                
                erstellt_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                erstellt_von VARCHAR(100),
                aufgehoben_am TIMESTAMP,
                aufgehoben_von VARCHAR(100),
                
                FOREIGN KEY (kunde_id) REFERENCES kunden(id) ON DELETE CASCADE
            )
        """))
        
        db.commit()
        print("   ✅ Tabellen erstellt: kunden, kunden_warnungen")
        
        # ============================================================
        # STEP 2: Vermietungen migrieren
        # ============================================================
        print("\n📋 STEP 2: Migriere Vermietungen...")
        
        # Prüfen ob vermietungen Tabelle existiert
        result = db.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'vermietungen'
            )
        """))
        
        if result.scalar():
            # Prüfen ob kunde_id Spalte schon existiert
            result = db.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'vermietungen' AND column_name = 'kunde_id'
            """))
            
            if not result.fetchone():
                print("   📄 Füge kunde_id Spalte hinzu...")
                
                # Spalte hinzufügen
                db.execute(text("ALTER TABLE vermietungen ADD COLUMN kunde_id INTEGER REFERENCES kunden(id)"))
                
                # Für jede bestehende Vermietung einen Kunden anlegen
                vermietungen = db.execute(text("""
                    SELECT id, kunde_name, kunde_telefon, kunde_email, kunde_adresse 
                    FROM vermietungen 
                    WHERE kunde_name IS NOT NULL AND kunde_name != ''
                """)).fetchall()
                
                kunde_counter = 1
                migrierte_kunden = 0
                
                for vm in vermietungen:
                    # Kunde anlegen
                    name_parts = vm[1].split(' ', 1) if vm[1] else ['', 'Unbekannt']
                    vorname = name_parts[0] if len(name_parts) > 1 else None
                    nachname = name_parts[1] if len(name_parts) > 1 else name_parts[0]
                    
                    # Adresse parsen (falls vorhanden)
                    adresse = vm[4] if len(vm) > 4 and vm[4] else None
                    strasse = adresse.split(',')[0] if adresse and ',' in adresse else adresse
                    
                    # Eindeutige Kundennummer finden
                    while True:
                        kundennummer = f'K-{kunde_counter:04d}'
                        exists = db.execute(text("""
                            SELECT id FROM kunden WHERE kundennummer = :nummer
                        """), {'nummer': kundennummer}).fetchone()
                        
                        if not exists:
                            break
                        kunde_counter += 1
                    
                    db.execute(text("""
                        INSERT INTO kunden (
                            kundennummer, vorname, nachname, telefon, email,
                            strasse, status
                        ) VALUES (
                            :kundennummer, :vorname, :nachname, :telefon, :email,
                            :strasse, 'normal'
                        )
                    """), {
                        'kundennummer': kundennummer,
                        'vorname': vorname,
                        'nachname': nachname,
                        'telefon': vm[2],
                        'email': vm[3] if len(vm) > 3 else None,
                        'strasse': strasse
                    })
                    
                    kunde_id = db.execute(text("SELECT currval('kunden_id_seq')")).scalar()
                    
                    # Vermietung mit kunde_id verknüpfen
                    db.execute(text("""
                        UPDATE vermietungen 
                        SET kunde_id = :kunde_id 
                        WHERE id = :vm_id
                    """), {'kunde_id': kunde_id, 'vm_id': vm[0]})
                    
                    kunde_counter += 1
                    migrierte_kunden += 1
                
                db.commit()
                print(f"   ✅ {migrierte_kunden} Kunden aus Vermietungen migriert")
                
                # Alte Spalten entfernen (später machen, erstmal behalten zur Sicherheit)
                print("   ℹ️  Alte Spalten (kunde_name, kunde_telefon, kunde_email, kunde_adresse) noch vorhanden")
                print("      → Manuell entfernen nach Verifikation!")
            else:
                print("   ℹ️  kunde_id Spalte existiert bereits")
        else:
            print("   ℹ️  Keine vermietungen Tabelle gefunden (wird später erstellt)")
        
        # ============================================================
        # STEP 3: Testdaten anlegen
        # ============================================================
        print("\n📋 STEP 3: Lege Testdaten an...")
        
        # Prüfen ob schon Testdaten existieren
        existing = db.execute(text("""
            SELECT COUNT(*) FROM kunden 
            WHERE kundennummer IN ('K-9001', 'K-9002')
        """)).scalar()
        
        if existing == 0:
            # Max Mustermann (gesperrt, offene Rechnung, Englisch)
            db.execute(text("""
                INSERT INTO kunden (
                    kundennummer, vorname, nachname, telefon, email,
                    strasse, plz, ort,
                    status, gesperrt_grund, gesperrt_seit, gesperrt_von,
                    sprache, sprache_notiz,
                    offene_rechnungen, zahlungsmoral,
                    notizen
                ) VALUES (
                    'K-9001', 'Max', 'Mustermann', '0171-1234567', 'max@example.com',
                    'Musterstraße 42', '46395', 'Bocholt',
                    'gesperrt', 'Rad mit Schaden zurückgegeben (beschädigtes Rücklicht)', 
                    :gesperrt_seit, 'Sarah',
                    'Englisch', 'Kunde spricht kein Deutsch',
                    45.00, 'mittel',
                    'Stammkunde seit 2020, bevorzugt E-Bikes'
                )
            """), {'gesperrt_seit': date.today()})
            
            max_id = db.execute(text("SELECT currval('kunden_id_seq')")).scalar()
            
            # Warnung für Max anlegen
            db.execute(text("""
                INSERT INTO kunden_warnungen (
                    kunde_id, typ, grund, betrag, erstellt_von
                ) VALUES (
                    :kunde_id, 'sperrung', 
                    'Rad LR-003 mit kaputtem Rücklicht zurückgegeben. Kunde weigerte sich Schaden zu melden.',
                    45.00, 'Sarah'
                )
            """), {'kunde_id': max_id})
            
            # Eva Musterfrau (normal, Stammkundin)
            db.execute(text("""
                INSERT INTO kunden (
                    kundennummer, vorname, nachname, telefon, email,
                    strasse, plz, ort,
                    status, sprache,
                    offene_rechnungen, zahlungsmoral,
                    notizen
                ) VALUES (
                    'K-9002', 'Eva', 'Musterfrau', '0160-9876543', 'eva@example.com',
                    'Hauptstraße 123', '46395', 'Bocholt',
                    'normal', 'Deutsch',
                    0.00, 'gut',
                    'Sehr zuverlässige Stammkundin, immer pünktlich'
                )
            """))
            
            db.commit()
            print("   ✅ Testdaten angelegt:")
            print("      • K-9001: Max Mustermann (GESPERRT, Englisch, 45€ offen)")
            print("      • K-9002: Eva Musterfrau (Normal, Stammkundin)")
        else:
            print("   ℹ️  Testdaten existieren bereits")
        
        # ============================================================
        # STEP 4: Zusammenfassung
        # ============================================================
        print("\n" + "=" * 60)
        print("✅ MIGRATION ERFOLGREICH!")
        print("=" * 60)
        
        # Statistiken
        kunden_count = db.execute(text("SELECT COUNT(*) FROM kunden")).scalar()
        warnungen_count = db.execute(text("SELECT COUNT(*) FROM kunden_warnungen")).scalar()
        gesperrt_count = db.execute(text("SELECT COUNT(*) FROM kunden WHERE status = 'gesperrt'")).scalar()
        
        print(f"\n📊 Statistik:")
        print(f"   • Kunden gesamt: {kunden_count}")
        print(f"   • Warnungen gesamt: {warnungen_count}")
        print(f"   • Gesperrte Kunden: {gesperrt_count}")
        
        print("\n🎯 Nächste Schritte:")
        print("   1. ✅ Backend-Endpoints (bereits vorhanden)")
        print("   2. ⏳ Frontend-Integration")
        print("   3. ⏳ Alte Spalten in vermietungen entfernen")
        
    except Exception as e:
        print(f"\n❌ FEHLER: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise
    
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
