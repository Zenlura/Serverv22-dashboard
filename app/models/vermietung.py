"""
Vermietung Model - KOMPLETT ÜBERARBEITET
Session 7.2.2026

Änderungen:
- ausweis_typ & ausweis_nummer ENTFERNT
- ausweis_abgeglichen (BOOLEAN) HINZUGEFÜGT
- kaution_zurueck hinzugefügt
- erstellt_am mit server_default=func.now()

Kalender V2 Update (7.2.2026 23:59):
- anzahl_raeder (Wieviele Räder in dieser Buchung)
- von_zeit (Geplante Abholzeit, z.B. 10:00)
- bis_zeit (Geplante Rückgabezeit, z.B. 18:00)
"""

from sqlalchemy import Column, Integer, String, Date, DateTime, Boolean, Numeric, ForeignKey, Text, Time
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class VermietungStatus(str, enum.Enum):
    """Status einer Vermietung"""
    AKTIV = "aktiv"
    ABGESCHLOSSEN = "abgeschlossen"
    STORNIERT = "storniert"


class Vermietung(Base):
    __tablename__ = "vermietungen"

    id = Column(Integer, primary_key=True, index=True)
    leihrad_id = Column(Integer, ForeignKey("leihraeder.id"), nullable=True)  # ✅ KALENDER V2: Optional für Gruppenbuchungen
    
    # Kunde-Beziehung (NEU - Kundenkartei)
    kunde_id = Column(Integer, ForeignKey("kunden.id"), nullable=True)  # nullable=True für Migration
    
    # Kundendaten (ALT - werden später durch kunde_id ersetzt)
    kunde_name = Column(String(200), nullable=False)
    kunde_telefon = Column(String(50))
    kunde_email = Column(String(200))
    kunde_adresse = Column(Text)
    
    # Ausweis (nur Checkbox ob abgeglichen)
    ausweis_abgeglichen = Column(Boolean, default=False)
    
    # Zeitraum
    von_datum = Column(Date, nullable=False)
    von_zeit = Column(Time, nullable=True)  # ✅ Kalender V2: Geplante Abholzeit
    bis_datum = Column(Date, nullable=False)
    bis_zeit = Column(Time, nullable=True)  # ✅ Kalender V2: Geplante Rückgabezeit
    rueckgabe_datum = Column(Date)
    
    # Anzahl Räder (Kalender V2)
    anzahl_raeder = Column(Integer, nullable=False, default=1)  # ✅ Wieviele Räder
    
    # Abholung
    rad_abgeholt = Column(Boolean, default=False)
    abholzeit = Column(DateTime)  # Tatsächliche Abholung (wenn ausgegeben)
    
    # Preise
    tagespreis = Column(Numeric(10, 2), nullable=False)
    anzahl_tage = Column(Integer, nullable=False)
    gesamtpreis = Column(Numeric(10, 2), nullable=False)
    kaution = Column(Numeric(10, 2), default=0.00)
    
    # Zahlung
    bezahlt = Column(Boolean, default=False)
    bezahlt_am = Column(DateTime)
    kaution_zurueck = Column(Boolean, default=False)
    
    # Status
    status = Column(String(50), default='aktiv')  # aktiv, abgeschlossen, storniert
    
    # Zustand
    zustand_bei_ausgabe = Column(Text)
    zustand_bei_rueckgabe = Column(Text)
    schaeden = Column(Text)
    
    # Metadata
    erstellt_am = Column(DateTime, server_default=func.now())  # ✅ Auto-Timestamp
    notizen = Column(Text)
    
    # Beziehungen
    leihrad = relationship("Leihrad", back_populates="vermietungen")
    kunde = relationship("Kunde", back_populates="vermietungen")  # NEU