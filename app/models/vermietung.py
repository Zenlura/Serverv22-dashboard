from sqlalchemy import Column, Integer, String, Numeric, Boolean, Date, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
import enum

class VermietungStatus(str, enum.Enum):
    reserviert = "reserviert"      # Rad ist reserviert, noch nicht abgeholt
    aktiv = "aktiv"                # Rad ist unterwegs
    abgeschlossen = "abgeschlossen"
    storniert = "storniert"

class Vermietung(Base):
    __tablename__ = "vermietungen"

    id = Column(Integer, primary_key=True, index=True)
    leihrad_id = Column(Integer, ForeignKey("leihraeder.id"), nullable=False)
    
    # Kunde
    kunde_name = Column(String(200), nullable=False)
    kunde_telefon = Column(String(50))
    kunde_email = Column(String(200))
    kunde_adresse = Column(Text)
    
    # Ausweis (Pflicht für Kaution)
    ausweis_typ = Column(String(50))  # z.B. "Personalausweis", "Reisepass"
    ausweis_nummer = Column(String(100))
    
    # Zeitraum
    von_datum = Column(Date, nullable=False)
    bis_datum = Column(Date, nullable=False)
    rueckgabe_datum = Column(Date)  # Tatsächliche Rückgabe
    
    # Reservierung (NEU)
    rad_abgeholt = Column(Boolean, default=False)  # Wurde das Rad schon ausgegeben?
    abholzeit = Column(DateTime, nullable=True)  # Wann wurde das Rad abgeholt?
    
    # Preise & Zahlung (Bezahlung bei Abholung, keine Kaution)
    tagespreis = Column(Numeric(10, 2), nullable=False)
    anzahl_tage = Column(Integer, nullable=False)
    gesamtpreis = Column(Numeric(10, 2), nullable=False)
    bezahlt = Column(Boolean, default=False)
    bezahlt_am = Column(DateTime)
    
    # Status & Zustand
    status = Column(Enum(VermietungStatus), nullable=False, default=VermietungStatus.aktiv)
    zustand_bei_ausgabe = Column(Text)  # Zustand bei Check-out
    zustand_bei_rueckgabe = Column(Text)  # Zustand bei Check-in
    schaeden = Column(Text)  # Schäden bei Rückgabe
    
    # Metadaten
    erstellt_am = Column(DateTime, default=datetime.utcnow)
    notizen = Column(Text)
    
    # Beziehungen
    leihrad = relationship("Leihrad", back_populates="vermietungen")
    
    def __repr__(self):
        return f"<Vermietung #{self.id} - {self.kunde_name} ({self.von_datum} - {self.bis_datum})>"
