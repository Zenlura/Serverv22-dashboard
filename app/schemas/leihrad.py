"""
SCHEMAS - COMPLETE FIX + PHASE 6
Session: 08.02.2026 12:00

ADDITIONS:
- VermietungPositionCreate/Response Schemas
- VermietungCreate erweitert mit positionen
- VermietungResponse erweitert mit positionen
"""

from pydantic import BaseModel, Field
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime, date, time
from decimal import Decimal

if TYPE_CHECKING:
    from app.schemas.kunde import KundeResponse


# ========== LEIHRAD SCHEMAS (UNCHANGED) ==========

class LeihradBase(BaseModel):
    inventarnummer: str = Field(..., max_length=50)
    marke: str = Field(..., max_length=100)
    modell: Optional[str] = Field(None, max_length=100)
    rahmennummer: Optional[str] = Field(None, max_length=100)
    farbe: Optional[str] = Field(None, max_length=50)
    rahmenhoehe: Optional[str] = Field(None, max_length=20)
    typ: Optional[str] = Field(None, max_length=50)
    
    preis_1tag: Decimal = Field(default=Decimal("25.00"))
    preis_3tage: Optional[Decimal] = Field(default=Decimal("22.00"))
    preis_5tage: Optional[Decimal] = Field(default=Decimal("20.00"))
    kontrollstatus: Optional[str] = Field(default="ok")
    
    status: str = Field(default="verfuegbar")
    zustand: Optional[str] = None
    
    angeschafft_am: Optional[datetime] = None
    letzte_wartung: Optional[datetime] = None
    naechste_wartung: Optional[datetime] = None
    notizen: Optional[str] = None


class LeihradCreate(LeihradBase):
    pass


class LeihradUpdate(BaseModel):
    inventarnummer: Optional[str] = None
    marke: Optional[str] = None
    modell: Optional[str] = None
    rahmennummer: Optional[str] = None
    farbe: Optional[str] = None
    rahmenhoehe: Optional[str] = None
    typ: Optional[str] = None
    
    preis_1tag: Optional[Decimal] = None
    preis_3tage: Optional[Decimal] = None
    preis_5tage: Optional[Decimal] = None
    kontrollstatus: Optional[str] = None
    
    status: Optional[str] = None
    zustand: Optional[str] = None
    letzte_wartung: Optional[datetime] = None
    naechste_wartung: Optional[datetime] = None
    notizen: Optional[str] = None


class LeihradResponse(LeihradBase):
    id: int
    
    class Config:
        from_attributes = True


# ========== ✨ NEU: VERMIETUNG POSITION SCHEMAS ==========

class VermietungPositionBase(BaseModel):
    """
    Position für typ-basierte Buchungen
    Beispiel: 2× E-Bike, 1× Normal
    """
    rad_typ: str = Field(..., max_length=50, description="Rad-Typ (E-Bike, Normal, Lastenrad, etc.)")
    anzahl: int = Field(ge=1, le=50, description="Anzahl Räder dieses Typs")


class VermietungPositionCreate(VermietungPositionBase):
    """
    Für Buchungs-Request vom Frontend
    Preise werden vom Backend berechnet
    """
    pass


class VermietungPositionResponse(VermietungPositionBase):
    """
    Für Response mit berechneten Preisen
    """
    id: int
    vermietung_id: int
    tagespreis: Decimal  # Preis pro Tag für EIN Rad
    anzahl_tage: int
    gesamtpreis: Decimal  # anzahl × tagespreis × anzahl_tage
    
    class Config:
        from_attributes = True


# ========== VERMIETUNG SCHEMAS ==========

class VermietungBase(BaseModel):
    """
    ✅ UPDATED - Phase 6
    - positionen Optional hinzugefügt (für typ-basierte Buchung)
    - leihrad_id Optional (für typ-basierte Buchung)
    """
    leihrad_id: Optional[int] = None  # Optional für typ-basierte Buchungen
    
    # Kunde
    kunde_id: int
    
    # Ausweis
    ausweis_abgeglichen: bool = Field(default=False)
    
    # Anzahl Räder (wird automatisch aus positionen berechnet wenn vorhanden)
    anzahl_raeder: int = Field(ge=1, le=50, default=1)
    
    # Zeitraum
    von_datum: date
    von_zeit: Optional[time] = None
    bis_datum: date
    bis_zeit: Optional[time] = None
    
    # Status
    status: str = Field(default='reserviert')
    
    # Preise (werden automatisch berechnet aus positionen wenn vorhanden)
    tagespreis: Decimal
    anzahl_tage: int
    gesamtpreis: Decimal
    kaution: Decimal = Field(default=Decimal("0.00"))
    
    # Zustand & Notizen
    zustand_bei_ausgabe: Optional[str] = None
    notizen: Optional[str] = None


class VermietungCreate(VermietungBase):
    """
    ✨ PHASE 6: Erweitert mit Positionen
    
    ZWEI MODI:
    1. ALT: leihrad_id gesetzt → klassische Einzel-Rad Buchung
    2. NEU: positionen gesetzt → typ-basierte Buchung (2× E-Bike + 1× Normal)
    """
    positionen: Optional[List[VermietungPositionCreate]] = Field(
        default=None,
        description="Positionen für typ-basierte Buchung (z.B. 2× E-Bike, 1× Normal)"
    )
    
    # ✅ Override: tagespreis/anzahl_tage/gesamtpreis optional wenn positionen vorhanden
    tagespreis: Optional[Decimal] = None
    anzahl_tage: Optional[int] = None
    gesamtpreis: Optional[Decimal] = None


class VermietungUpdate(BaseModel):
    bis_datum: Optional[date] = None
    rueckgabe_datum: Optional[date] = None
    status: Optional[str] = None
    zustand_bei_rueckgabe: Optional[str] = None
    schaeden: Optional[str] = None
    kaution_zurueck: Optional[bool] = None
    bezahlt: Optional[bool] = None
    bezahlt_am: Optional[datetime] = None
    notizen: Optional[str] = None
    rad_abgeholt: Optional[bool] = None  # ✅ ADDED für Abholungs-Button
    abholzeit: Optional[datetime] = None


class VermietungResponse(BaseModel):
    """
    ✅ PHASE 6: Erweitert mit Positionen
    """
    id: int
    leihrad_id: Optional[int] = None
    kunde_id: Optional[int] = None
    
    # Alte Felder (Backwards-Compatibility)
    kunde_name: Optional[str] = None
    kunde_telefon: Optional[str] = None
    kunde_email: Optional[str] = None
    kunde_adresse: Optional[str] = None
    
    # Anzahl Räder
    anzahl_raeder: int = Field(default=1)
    
    # Ausweis & Zeitraum
    ausweis_abgeglichen: bool = Field(default=False)
    von_datum: date
    von_zeit: Optional[time] = None
    bis_datum: date
    bis_zeit: Optional[time] = None
    rueckgabe_datum: Optional[date] = None
    
    # Preise
    tagespreis: Decimal
    anzahl_tage: int
    gesamtpreis: Decimal
    kaution: Decimal = Field(default=Decimal("0.00"))
    
    # Status & Zustand
    status: str
    zustand_bei_ausgabe: Optional[str] = None
    zustand_bei_rueckgabe: Optional[str] = None
    schaeden: Optional[str] = None
    
    # Zahlungen
    kaution_zurueck: Optional[bool] = Field(default=False)
    bezahlt: bool = Field(default=False)
    bezahlt_am: Optional[datetime] = None
    
    # Timestamps
    erstellt_am: Optional[datetime] = None
    rad_abgeholt: Optional[bool] = Field(default=False)
    abholzeit: Optional[datetime] = None
    
    # Notizen
    notizen: Optional[str] = None
    
    # ✨ NEU: Positionen
    positionen: Optional[List[VermietungPositionResponse]] = Field(
        default=None,
        description="Positionen für typ-basierte Buchungen"
    )
    
    # Nested Relations
    leihrad: Optional[LeihradResponse] = None
    kunde: Optional['KundeResponse'] = None
    
    class Config:
        from_attributes = True


# ========== LIST RESPONSES ==========

class LeihradListResponse(BaseModel):
    items: List[LeihradResponse]
    total: int
    skip: int
    limit: int


class VermietungListResponse(BaseModel):
    items: List[VermietungResponse]
    total: int
    skip: int
    limit: int