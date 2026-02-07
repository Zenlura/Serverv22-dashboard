from sqlalchemy import Column, Integer, String, Numeric, Enum, Text, DateTime
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
import enum

class LeihradStatus(str, enum.Enum):
    verfuegbar = "verfuegbar"
    verliehen = "verliehen"
    wartung = "wartung"
    defekt = "defekt"

class Kontrollstatus(str, enum.Enum):
    ok = "ok"
    faellig = "faellig"
    ueberfaellig = "ueberfaellig"

class Leihrad(Base):
    __tablename__ = "leihraeder"

    id = Column(Integer, primary_key=True, index=True)
    inventarnummer = Column(String(50), unique=True, nullable=False, index=True)
    rahmennummer = Column(String(100))
    marke = Column(String(100), nullable=False)
    modell = Column(String(100))
    farbe = Column(String(50))
    rahmenhoehe = Column(String(20))  # z.B. "M", "L", "54cm"
    typ = Column(String(50))  # z.B. "Citybike", "E-Bike", "MTB", "Normal", "Werkstatt"
    
    # Staffelpreise (für E-Bikes)
    preis_1tag = Column(Numeric(10, 2), nullable=False, default=25.00)
    preis_3tage = Column(Numeric(10, 2), default=22.00)  # Pro Tag ab 3 Tagen
    preis_5tage = Column(Numeric(10, 2), default=20.00)  # Pro Tag ab 5 Tagen
    
    # Status & Zustand
    status = Column(Enum(LeihradStatus), nullable=False, default=LeihradStatus.verfuegbar)
    kontrollstatus = Column(Enum(Kontrollstatus), default=Kontrollstatus.ok)
    zustand = Column(Text)  # Notizen zu Zustand/Mängeln
    
    # Metadaten
    angeschafft_am = Column(DateTime, default=datetime.utcnow)
    letzte_wartung = Column(DateTime)
    naechste_wartung = Column(DateTime)
    notizen = Column(Text)
    
    # Beziehungen
    vermietungen = relationship("Vermietung", back_populates="leihrad", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Leihrad {self.inventarnummer} - {self.marke} {self.modell} ({self.status})>"
