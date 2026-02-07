"""
Reparatur Models
"""
from sqlalchemy import Column, Integer, String, Text, Numeric, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Reparatur(Base):
    """Reparaturauftrag"""
    __tablename__ = "reparaturen"
    
    id = Column(Integer, primary_key=True, index=True)
    auftragsnummer = Column(String(50), unique=True, nullable=False, index=True)
    
    # Fahrrad-Daten
    fahrradmarke = Column(String(100), nullable=False)  # PFLICHT
    fahrradmodell = Column(String(100), nullable=True)  # Optional
    rahmennummer = Column(String(100), nullable=True)  # Optional - für teure Räder
    schluesselnummer = Column(String(50), nullable=True)  # Optional - Schlüssel-ID
    
    # Fahrrad Status
    fahrrad_anwesend = Column(Boolean, default=False)  # IST DAS FAHRRAD DA? ✅
    
    # Kunden-Daten (alle optional - Datenschutz!)
    kunde_name = Column(String(200), nullable=True)
    kunde_telefon = Column(String(50), nullable=True)
    kunde_email = Column(String(200), nullable=True)
    
    # Reparatur-Details
    maengelbeschreibung = Column(Text, nullable=False)  # Was ist kaputt?
    status = Column(String(50), nullable=False, default='angenommen', index=True)
    # Status: angenommen, in_arbeit, wartet_auf_teile, fertig, abgeholt, storniert
    
    # Workflow-Tracking (NEU)
    begonnen_am = Column(DateTime, nullable=True)  # Wann wurde mit Arbeit begonnen?
    prioritaet = Column(Integer, default=3)  # 1=sehr dringend, 5=normal
    meister_zugewiesen = Column(String(100), nullable=True)  # Welcher Meister arbeitet daran?
    
    # Termine
    reparaturdatum = Column(DateTime, nullable=False, default=func.now())  # Annahme
    fertig_bis = Column(DateTime, nullable=True)  # Geplant fertig
    fertig_am = Column(DateTime, nullable=True)  # Tatsächlich fertig
    abholtermin = Column(String(100), nullable=True)  # "anrufen" oder Datum
    abgeholt_am = Column(DateTime, nullable=True)  # Tatsächlich abgeholt
    
    # Kosten
    kostenvoranschlag = Column(Numeric(10, 2), nullable=True)
    endbetrag = Column(Numeric(10, 2), nullable=True)
    bezahlt = Column(Boolean, default=False)
    bezahlt_am = Column(DateTime, nullable=True)
    
    # Notizen
    notizen = Column(Text, nullable=True)  # Interne Notizen
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Beziehungen
    positionen = relationship("ReparaturPosition", back_populates="reparatur", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Reparatur {self.auftragsnummer}: {self.fahrradmarke} - {self.status}>"


class ReparaturPosition(Base):
    """Position in einer Reparatur (Arbeit oder Teil)"""
    __tablename__ = "reparatur_positionen"
    
    id = Column(Integer, primary_key=True, index=True)
    reparatur_id = Column(Integer, ForeignKey("reparaturen.id", ondelete="CASCADE"), nullable=False)
    
    # Position-Typ
    typ = Column(String(20), nullable=False)  # 'arbeit' oder 'teil'
    
    # Wenn Teil: Verknüpfung zu Artikel
    artikel_id = Column(Integer, ForeignKey("artikel.id"), nullable=True)
    
    # Details
    bezeichnung = Column(String(200), nullable=False)  # z.B. "Bremse einstellen" oder "Bremsbeläge"
    beschreibung = Column(Text, nullable=True)  # Zusätzliche Info
    
    # Menge & Preis
    menge = Column(Numeric(10, 2), nullable=False, default=1)
    einzelpreis = Column(Numeric(10, 2), nullable=False)
    gesamtpreis = Column(Numeric(10, 2), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    
    # Beziehungen
    reparatur = relationship("Reparatur", back_populates="positionen")
    artikel = relationship("Artikel")
    
    def __repr__(self):
        return f"<ReparaturPosition {self.typ}: {self.bezeichnung} ({self.menge}x {self.einzelpreis}€)>"
