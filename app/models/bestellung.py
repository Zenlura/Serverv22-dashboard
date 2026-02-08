"""
Bestellung Model - Sammelbestellungen für Werkstatt
Workflow: offen → bestellt → teilweise_geliefert → geliefert → abgeschlossen
"""
from sqlalchemy import Column, Integer, String, Text, Numeric, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Bestellung(Base):
    """Sammelbestellung pro Lieferant"""
    __tablename__ = "bestellungen"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Bestellnummer (automatisch: BES-00001, BES-00002, ...)
    bestellnummer = Column(String(50), unique=True, nullable=False, index=True)
    
    # Lieferant
    lieferant_id = Column(Integer, ForeignKey("lieferanten.id"), nullable=False, index=True)
    
    # Status
    # offen: Sammeln von Positionen
    # bestellt: PDF erstellt, Bestellung raus
    # teilweise_geliefert: Einige Positionen geliefert
    # geliefert: Alle Positionen vollständig
    # abgeschlossen: Im Inventar eingebucht
    status = Column(String(50), nullable=False, default="offen", index=True)
    
    # Notizen
    notizen = Column(Text, nullable=True)
    
    # Summen (werden berechnet aus Positionen)
    gesamtsumme_ek = Column(Numeric(10, 2), nullable=True)  # Einkaufspreis gesamt
    gesamtsumme_vk = Column(Numeric(10, 2), nullable=True)  # Verkaufspreis gesamt
    
    # Termine
    erstellt_am = Column(DateTime(timezone=True), server_default=func.now())
    bestellt_am = Column(DateTime(timezone=True), nullable=True)  # Wann PDF erstellt
    geliefert_am = Column(DateTime(timezone=True), nullable=True)  # Wann alles da
    abgeschlossen_am = Column(DateTime(timezone=True), nullable=True)  # Wann eingebucht
    
    # Bearbeiter (später mit User-System verknüpfen)
    erstellt_von = Column(String(100), nullable=True)
    bestellt_von = Column(String(100), nullable=True)
    
    # Timestamps
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    lieferant = relationship("Lieferant", back_populates="bestellungen")
    positionen = relationship("BestellPosition", back_populates="bestellung", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Bestellung {self.bestellnummer} - {self.status}>"
    
    @property
    def anzahl_positionen(self) -> int:
        """Anzahl Positionen in Bestellung"""
        return len(self.positionen)
    
    @property
    def positionen_offen(self) -> int:
        """Anzahl Positionen die noch nicht vollständig geliefert sind"""
        return sum(1 for pos in self.positionen if not pos.vollstaendig_geliefert)
    
    @property
    def lieferstatus_prozent(self) -> int:
        """Lieferstatus gesamt in Prozent"""
        if not self.positionen:
            return 0
        geliefert = sum(pos.menge_geliefert for pos in self.positionen)
        bestellt = sum(pos.menge_bestellt for pos in self.positionen)
        if bestellt == 0:
            return 0
        return int((geliefert / bestellt) * 100)


class BestellPosition(Base):
    """Position in einer Bestellung"""
    __tablename__ = "bestellpositionen"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Bestellung
    bestellung_id = Column(Integer, ForeignKey("bestellungen.id", ondelete="CASCADE"), nullable=False)
    
    # Artikel (optional - kann aus Inventar kommen ODER manuell eingegeben werden)
    artikel_id = Column(Integer, ForeignKey("artikel.id"), nullable=True)
    
    # Artikel-Daten (Pflicht - entweder aus Inventar kopiert ODER manuell)
    artikelnummer = Column(String(100), nullable=False)  # Lieferanten-Artikelnummer
    beschreibung = Column(Text, nullable=False)  # Was ist es?
    
    # ETRTO-Support (für Reifen/Schläuche) - DEIN SYSTEM! 💪
    etrto = Column(String(20), nullable=True)  # z.B. "37-622"
    zoll_info = Column(String(50), nullable=True)  # z.B. "28 x 1.40" (für alte Meister 😉)
    
    # Mengen
    menge_bestellt = Column(Integer, nullable=False)  # Was wurde bestellt
    menge_geliefert = Column(Integer, nullable=False, default=0)  # Was ist schon da
    # menge_offen wird als Property berechnet
    
    # Preise (pro Stück)
    einkaufspreis = Column(Numeric(10, 2), nullable=False)  # EK
    verkaufspreis = Column(Numeric(10, 2), nullable=False)  # VK
    
    # Summen (werden berechnet)
    summe_ek = Column(Numeric(10, 2), nullable=True)  # menge_bestellt * einkaufspreis
    summe_vk = Column(Numeric(10, 2), nullable=True)  # menge_bestellt * verkaufspreis
    
    # Wareneingang
    vollstaendig_geliefert = Column(Boolean, nullable=False, default=False)
    zuletzt_geliefert_am = Column(DateTime(timezone=True), nullable=True)  # Letzte Teillieferung
    
    # Notizen pro Position
    notizen = Column(Text, nullable=True)
    
    # Timestamps
    erstellt_am = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    bestellung = relationship("Bestellung", back_populates="positionen")
    artikel = relationship("Artikel")
    
    def __repr__(self):
        return f"<BestellPosition {self.artikelnummer}: {self.menge_geliefert}/{self.menge_bestellt}>"
    
    @property
    def menge_offen(self) -> int:
        """Berechnet offene Menge"""
        return self.menge_bestellt - self.menge_geliefert
    
    @property
    def lieferstatus_prozent(self) -> int:
        """Lieferstatus in Prozent"""
        if self.menge_bestellt == 0:
            return 0
        return int((self.menge_geliefert / self.menge_bestellt) * 100)
