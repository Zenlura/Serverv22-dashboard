"""
BestandHistorie Model - Tracking aller Bestandsänderungen
Für Auswertungen und Nachvollziehbarkeit
"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base
import enum


class BestandArt(str, enum.Enum):
    """Art der Bestandsänderung"""
    ZUGANG = "zugang"              # Wareneingang
    ABGANG = "abgang"              # Verkauf/Verbrauch
    KORREKTUR = "korrektur"        # Manuelle Korrektur
    UMLAGERUNG = "umlagerung"      # Lager <-> Werkstatt
    INVENTUR = "inventur"          # Inventur-Anpassung


class BestandOrt(str, enum.Enum):
    """Lagerort"""
    LAGER = "lager"
    WERKSTATT = "werkstatt"


class BestandHistorie(Base):
    __tablename__ = "bestand_historie"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Artikel
    artikel_id = Column(Integer, ForeignKey("artikel.id"), nullable=False)
    
    # Änderung
    art = Column(SQLEnum(BestandArt), nullable=False)
    ort = Column(SQLEnum(BestandOrt), nullable=False)
    
    # Menge (positiv oder negativ)
    menge = Column(Integer, nullable=False)
    
    # Bestand vorher/nachher
    bestand_vorher = Column(Integer, nullable=False)
    bestand_nachher = Column(Integer, nullable=False)
    
    # Grund / Referenz
    grund = Column(String(200))
    referenz_typ = Column(String(50))  # z.B. "auftrag", "bestellung", "inventur"
    referenz_id = Column(Integer)       # ID des referenzierten Objekts
    
    # Erfasst von
    erfasst_von = Column(String(100))   # z.B. "Werkstatt", "Empfang", "Admin"
    
    # Timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship
    artikel = relationship("Artikel", back_populates="bestand_historie")
    
    def __repr__(self):
        return f"<BestandHistorie Artikel:{self.artikel_id} {self.art.value} {self.menge}>"
