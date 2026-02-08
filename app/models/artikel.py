"""
Artikel Model - Hauptmodel für Warenwirtschaft
Artikelnummer: ART-00001, ART-00002, ...
Bestand: Lager + Werkstatt getrennt
"""
from sqlalchemy import Column, Integer, String, Numeric, Boolean, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base
import enum


class ArtikelTyp(str, enum.Enum):
    """Unterscheidung zwischen Material, Dienstleistung und Werkzeug"""
    material = "material"              # Physisches Material (Schlauch, Reifen, Kette, ...)
    dienstleistung = "dienstleistung"  # Arbeitsleistung (Bremsen einstellen, Inspektion, ...)
    werkzeug = "werkzeug"              # Werkzeuge (nicht verkaufen, nur intern nutzen)
    sonstiges = "sonstiges"            # Alles andere


class Artikel(Base):
    __tablename__ = "artikel"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Artikelnummer (ART-00001, ART-00002, ...)
    artikelnummer = Column(String(20), unique=True, nullable=False, index=True)
    
    # Basis-Infos
    bezeichnung = Column(String(200), nullable=False)
    beschreibung = Column(String(1000))
    
    # Artikel-Typ (NEU: Material vs. Dienstleistung)
    typ = Column(Enum(ArtikelTyp), nullable=False, default=ArtikelTyp.material)
    
    # Kategorie
    kategorie_id = Column(Integer, ForeignKey("kategorien.id"), nullable=True)
    
    # Bestand (Lager + Werkstatt getrennt!)
    bestand_lager = Column(Integer, default=0, nullable=False)
    bestand_werkstatt = Column(Integer, default=0, nullable=False)
    mindestbestand = Column(Integer, default=0)
    
    # Varianten-Support (NEU!)
    hat_varianten = Column(Boolean, default=False, nullable=False)  # Hat dieser Artikel Varianten?
    
    # Preise (nur wenn KEINE Varianten!)
    einkaufspreis = Column(Numeric(10, 2))
    verkaufspreis = Column(Numeric(10, 2))
    
    # Einheit
    einheit = Column(String(20), default="Stück")  # Stück, Meter, Liter, etc.
    
    # Lagerort (NEU: Foreign Key statt nur String)
    lagerort_id = Column(Integer, ForeignKey("lagerorte.id"), nullable=True)
    lagerort = Column(String(100))  # DEPRECATED: Wird durch lagerort_id ersetzt, bleibt für Migration
    
    # Status
    aktiv = Column(Boolean, default=True)
    
    # Notizen
    notizen = Column(String(1000))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    kategorie = relationship("Kategorie", back_populates="artikel")
    artikel_lieferanten = relationship("ArtikelLieferant", back_populates="artikel", cascade="all, delete-orphan")
    bestand_historie = relationship("BestandHistorie", back_populates="artikel", cascade="all, delete-orphan")
    varianten = relationship("ArtikelVariante", back_populates="artikel", cascade="all, delete-orphan")
    # lagerort_obj = relationship("Lagerort", back_populates="artikel")  # DEAKTIVIERT: Lagerort-Tabelle existiert noch nicht
    
    def __repr__(self):
        return f"<Artikel {self.artikelnummer} - {self.bezeichnung}>"
    
    @property
    def bestand_gesamt(self) -> int:
        """Gesamtbestand (Lager + Werkstatt)"""
        return self.bestand_lager + self.bestand_werkstatt
    
    @property
    def ist_mindestbestand(self) -> bool:
        """Prüft ob Mindestbestand unterschritten - nur bei Material!"""
        # Dienstleistungen und Werkzeuge haben keinen Bestand
        if self.typ in (ArtikelTyp.dienstleistung, ArtikelTyp.werkzeug):
            return False
        return self.bestand_gesamt <= self.mindestbestand