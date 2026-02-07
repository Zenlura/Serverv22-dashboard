"""
Bestellung Models
Verwaltung von Bestellungen bei Lieferanten
"""
from sqlalchemy import Column, Integer, String, DateTime, Numeric, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum as PyEnum
from ..database import Base


class BestellStatus(str, PyEnum):
    """Status einer Bestellung"""
    ENTWURF = "entwurf"
    BESTELLT = "bestellt"
    TEILGELIEFERT = "teilgeliefert"
    GELIEFERT = "geliefert"
    STORNIERT = "storniert"


class Bestellung(Base):
    """
    Bestellung bei einem Lieferanten
    """
    __tablename__ = "bestellungen"
    
    id = Column(Integer, primary_key=True, index=True)
    bestellnummer = Column(String(50), nullable=False, unique=True, index=True)
    lieferant_id = Column(Integer, ForeignKey("lieferanten.id"), nullable=False)
    
    # Status - als String statt Enum (wegen SQLAlchemy Bug)
    status = Column(String(20), nullable=False, default="entwurf")
    
    # Daten
    bestelldatum = Column(DateTime(timezone=True))  # Wann bei Lieferant bestellt
    lieferdatum_erwartet = Column(DateTime(timezone=True))  # Wann erwartet
    lieferdatum_tatsaechlich = Column(DateTime(timezone=True))  # Wann tatsächlich geliefert
    
    # Preise
    gesamtpreis = Column(Numeric(10, 2), nullable=False, default=0.0)
    versandkosten = Column(Numeric(10, 2), nullable=False, default=0.0)
    
    # Notizen
    notizen = Column(Text)  # Für Lieferant (z.B. "Bitte schnell liefern")
    interne_notizen = Column(Text)  # Interne Notizen
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    lieferant = relationship("Lieferant", back_populates="bestellungen")
    positionen = relationship(
        "BestellPosition",
        back_populates="bestellung",
        cascade="all, delete-orphan"
    )
    
    def __repr__(self):
        return f"<Bestellung {self.bestellnummer} - {self.status}>"


class BestellPosition(Base):
    """
    Position in einer Bestellung (ein Artikel)
    """
    __tablename__ = "bestellpositionen"
    
    id = Column(Integer, primary_key=True, index=True)
    bestellung_id = Column(Integer, ForeignKey("bestellungen.id", ondelete="CASCADE"), nullable=False)
    artikel_id = Column(Integer, ForeignKey("artikel.id"), nullable=False)
    
    # Bestellung
    menge = Column(Integer, nullable=False)  # Bestellte Menge
    einzelpreis = Column(Numeric(10, 2), nullable=False)  # Einkaufspreis vom Lieferanten
    gesamtpreis = Column(Numeric(10, 2), nullable=False)  # Automatisch berechnet
    
    # Wareneingang
    menge_geliefert = Column(Integer, nullable=False, default=0)
    geliefert = Column(Boolean, nullable=False, default=False)
    
    # Notizen
    notizen = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    bestellung = relationship("Bestellung", back_populates="positionen")
    artikel = relationship("Artikel")
    
    def __repr__(self):
        return f"<BestellPosition {self.artikel_id} x {self.menge}>"