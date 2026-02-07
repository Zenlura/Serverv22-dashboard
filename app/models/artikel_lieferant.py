"""
ArtikelLieferant Model - Many-to-Many Zuordnung
Ein Artikel kann mehrere Lieferanten haben
Ein Lieferant liefert mehrere Artikel
"""
from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class ArtikelLieferant(Base):
    __tablename__ = "artikel_lieferanten"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign Keys
    artikel_id = Column(Integer, ForeignKey("artikel.id"), nullable=False)
    lieferant_id = Column(Integer, ForeignKey("lieferanten.id"), nullable=False)
    
    # Lieferanten-spezifische Daten
    lieferanten_artikelnummer = Column(String(100))  # Artikelnr beim Lieferanten
    einkaufspreis = Column(Numeric(10, 2))           # Preis bei diesem Lieferanten
    lieferzeit_tage = Column(Integer)                # Lieferzeit in Tagen
    
    # Ist das der bevorzugte Lieferant für diesen Artikel?
    bevorzugt = Column(Boolean, default=False)
    
    # Notizen
    notizen = Column(String(500))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    artikel = relationship("Artikel", back_populates="artikel_lieferanten")
    lieferant = relationship("Lieferant", back_populates="artikel_lieferanten")
    
    def __repr__(self):
        return f"<ArtikelLieferant Artikel:{self.artikel_id} Lieferant:{self.lieferant_id}>"
