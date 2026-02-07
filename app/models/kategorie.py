"""
Kategorie Model - Hierarchische Artikel-Kategorien
Beispiel: Reifen > 28 Zoll > Mit Pannenschutz
"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class Kategorie(Base):
    __tablename__ = "kategorien"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    beschreibung = Column(String(500))
    
    # Hierarchie (Self-Referencing)
    parent_id = Column(Integer, ForeignKey("kategorien.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    parent = relationship("Kategorie", remote_side=[id], backref="children")
    artikel = relationship("Artikel", back_populates="kategorie")
    
    def __repr__(self):
        return f"<Kategorie {self.name}>"
    
    @property
    def full_path(self) -> str:
        """
        Gibt vollständigen Pfad zurück.
        Beispiel: "Reifen > 28 Zoll > Mit Pannenschutz"
        """
        if self.parent:
            return f"{self.parent.full_path} > {self.name}"
        return self.name
