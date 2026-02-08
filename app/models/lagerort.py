"""
Lagerort Model - Lagerverwaltung
Keller, Schränke im Käfig, Werkstatt/Büro
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Lagerort(Base):
    __tablename__ = "lagerorte"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Name des Lagerorts
    name = Column(String(100), nullable=False, unique=True)  # z.B. "Keller", "Schränke im Käfig"
    
    # Beschreibung/Details
    beschreibung = Column(String(500), nullable=True)  # z.B. "Regal 1-5 im Keller"
    
    # Sortierung für Anzeige
    sortierung = Column(Integer, default=0)  # Niedrigere Zahl = weiter oben
    
    # Aktiv/Inaktiv
    aktiv = Column(Boolean, default=True, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), server_onupdate=func.now())
    
    # Relationships
    artikel = relationship("Artikel", back_populates="lagerort_obj")  # AKTIVIERT!
    artikel_varianten = relationship("ArtikelVariante", back_populates="lagerort_obj")  # AKTIVIERT!
    
    def __repr__(self):
        return f"<Lagerort {self.name}>"
