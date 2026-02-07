from sqlalchemy import Column, Integer, String, Text, DECIMAL, Date, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Kunde(Base):
    __tablename__ = "kunden"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    kundennummer = Column(String(20), unique=True, nullable=False, index=True)
    
    # Stammdaten
    vorname = Column(String(100))
    nachname = Column(String(100), nullable=False)
    telefon = Column(String(50))
    email = Column(String(100))
    strasse = Column(String(200))
    plz = Column(String(10))
    ort = Column(String(100))
    
    # Status & Warnsystem
    status = Column(String(20), default='normal', nullable=False)  # normal, warnung, gesperrt
    gesperrt_grund = Column(Text)
    gesperrt_seit = Column(Date)
    gesperrt_von = Column(String(100))  # Mitarbeitername
    
    # Sprache
    sprache = Column(String(50))  # Deutsch, Englisch, Niederländisch
    sprache_notiz = Column(Text)  # "Spricht nur Englisch"
    
    # Finanzen
    offene_rechnungen = Column(DECIMAL(10, 2), default=0.00)
    zahlungsmoral = Column(String(20))  # gut, mittel, schlecht
    
    # Meta
    notizen = Column(Text)
    erstellt_am = Column(DateTime, server_default=func.now())
    geaendert_am = Column(DateTime, onupdate=func.now())
    
    # Relationships
    vermietungen = relationship("Vermietung", back_populates="kunde")
    warnungen = relationship("KundenWarnung", back_populates="kunde", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Kunde {self.kundennummer}: {self.vorname} {self.nachname}>"


class KundenWarnung(Base):
    __tablename__ = "kunden_warnungen"
    
    id = Column(Integer, primary_key=True, index=True)
    kunde_id = Column(Integer, ForeignKey("kunden.id"), nullable=False)
    
    # Warnung Details
    typ = Column(String(20), nullable=False)  # warnung, sperrung, entsperrung
    grund = Column(Text, nullable=False)
    betrag = Column(DECIMAL(10, 2))  # Optional bei finanziellen Gründen
    
    # Tracking
    erstellt_am = Column(DateTime, server_default=func.now())
    erstellt_von = Column(String(100))  # Mitarbeitername
    aufgehoben_am = Column(DateTime)
    aufgehoben_von = Column(String(100))
    
    # Relationship
    kunde = relationship("Kunde", back_populates="warnungen")
    
    def __repr__(self):
        return f"<KundenWarnung {self.typ} für Kunde {self.kunde_id}>"
