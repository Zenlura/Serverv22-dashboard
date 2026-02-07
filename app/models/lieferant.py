"""
Lieferant Model
Hauptlieferanten: Hartje, BBF, Magura, Rose Biketown
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class Lieferant(Base):
    __tablename__ = "lieferanten"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True, index=True)
    kurzname = Column(String(20))  # z.B. "HAR" für Hartje
    
    # Kontakt
    kontakt_person = Column(String(100))
    email = Column(String(100))
    telefon = Column(String(50))
    website = Column(String(200))
    
    # Adresse
    strasse = Column(String(200))
    plz = Column(String(10))
    ort = Column(String(100))
    land = Column(String(50), default="Deutschland")
    
    # Notizen
    notizen = Column(String(1000))
    
    # Status
    aktiv = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    artikel_lieferanten = relationship("ArtikelLieferant", back_populates="lieferant")
    bestellungen = relationship("Bestellung", back_populates="lieferant")  # ← NEU!
    
    def __repr__(self):
        return f"<Lieferant {self.name}>"
