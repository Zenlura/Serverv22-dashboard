"""
Artikel Variante Model
Für Artikel mit mehreren Größen/Ausführungen (z.B. Reifen mit verschiedenen ETRTO)
"""
from sqlalchemy import Column, Integer, String, Numeric, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class ArtikelVariante(Base):
    __tablename__ = "artikel_varianten"
    
    id = Column(Integer, primary_key=True, index=True)
    artikel_id = Column(Integer, ForeignKey("artikel.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Identifikation
    artikelnummer = Column(String(50), nullable=False, index=True)  # Lieferanten-Nr (z.B. Hartje: 0.754.432/3)
    barcode = Column(String(100), nullable=True, index=True)  # EAN13, Code128, etc. - kann leer sein!
    
    # Spezifikation (UNIVERSELL - nicht nur Reifen!)
    spezifikation = Column(String(200), nullable=True)  # z.B. "KSA18 (11-28T)", "28x1.85", "M5x20mm"
    kompatibilitaet = Column(String(200), nullable=True)  # z.B. "Shimano 11-fach", "SRAM eTap"
    
    # Reifen-spezifisch (optional)
    etrto = Column(String(20), nullable=True)  # z.B. "47-507", "37-622" (nur Reifen/Felgen)
    zoll_info = Column(String(50), nullable=True)  # z.B. "24 x 1,75", "28 x 1,40" (auto-generiert)
    farbe = Column(String(50), nullable=True)  # z.B. "schwarz", "weiß"
    
    # Bestand & Preise (pro Variante!)
    bestand_lager = Column(Integer, default=0, nullable=False)
    bestand_werkstatt = Column(Integer, default=0, nullable=False)
    mindestbestand = Column(Integer, default=0)
    
    preis_ek = Column(Numeric(10, 2), nullable=False)  # Einkaufspreis
    preis_ek_rabattiert = Column(Numeric(10, 2), nullable=True)  # Rabattierter EK (optional)
    preis_uvp = Column(Numeric(10, 2), nullable=False)  # UVP / Verkaufspreis
    
    # Lager (später für Inventur)
    lagerort_id = Column(Integer, ForeignKey("lagerorte.id"), nullable=True)
    
    # Meta
    notizen = Column(Text, nullable=True)
    aktiv = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    artikel = relationship("Artikel", back_populates="varianten")
    lagerort_obj = relationship("Lagerort", back_populates="artikel_varianten")  # AKTIVIERT!
    
    def __repr__(self):
        etrto_str = f" ({self.etrto})" if self.etrto else ""
        return f"<ArtikelVariante {self.artikelnummer}{etrto_str}>"
    
    @property
    def bestand_gesamt(self) -> int:
        """Gesamtbestand (Lager + Werkstatt)"""
        return self.bestand_lager + self.bestand_werkstatt
    
    @property
    def ist_mindestbestand(self) -> bool:
        """Prüft ob Mindestbestand unterschritten"""
        return self.bestand_gesamt <= self.mindestbestand
    
    @property
    def preis_ek_effektiv(self) -> float:
        """Gibt den effektiven EK zurück (rabattiert falls vorhanden, sonst normal)"""
        return float(self.preis_ek_rabattiert if self.preis_ek_rabattiert else self.preis_ek)