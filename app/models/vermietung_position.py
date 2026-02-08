"""
VermietungPosition Model - TYP-BASIERTE BUCHUNGEN
Phase 5 - Session 8.2.2026

Ermöglicht Buchungen wie:
- 2× E-Bike + 1× Normal pro Vermietung
- Historische Preise bleiben erhalten
- Detaillierte Aufschlüsselung pro Typ
"""

from sqlalchemy import Column, Integer, String, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class VermietungPosition(Base):
    __tablename__ = "vermietung_positionen"

    id = Column(Integer, primary_key=True, index=True)
    vermietung_id = Column(Integer, ForeignKey("vermietungen.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Rad-Typ (E-Bike, Normal, Lastenrad, etc.)
    rad_typ = Column(String(50), nullable=False)
    
    # Anzahl dieses Typs
    anzahl = Column(Integer, nullable=False)
    
    # Preise (historisch gespeichert - auch wenn Rad-Preise später ändern)
    tagespreis = Column(Numeric(10, 2), nullable=False)  # Preis pro Tag für EINEN Rad
    anzahl_tage = Column(Integer, nullable=False)
    
    # Berechnet: anzahl × tagespreis × anzahl_tage
    gesamtpreis = Column(Numeric(10, 2), nullable=False)
    
    # Beziehung
    vermietung = relationship("Vermietung", back_populates="positionen")
    
    def __repr__(self):
        return f"<VermietungPosition {self.anzahl}× {self.rad_typ} @ {self.tagespreis}€/Tag = {self.gesamtpreis}€>"
