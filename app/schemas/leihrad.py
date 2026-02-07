from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from decimal import Decimal

# ========== LEIHRAD SCHEMAS ==========

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
    """
    ✅ FIXED - Session 7.2.2026
    - Tippfehler behoben: rahmenhoeho → rahmenhoehe
    - Alte Felder entfernt: tagespreis, wochenpreis, kaution
    - Neue Felder hinzugefügt: preis_1tag, preis_3tage, preis_5tage, kontrollstatus
    """
    inventarnummer: Optional[str] = None
    marke: Optional[str] = None
    modell: Optional[str] = None
    rahmennummer: Optional[str] = None
    farbe: Optional[str] = None
    rahmenhoehe: Optional[str] = None  # ✅ Tippfehler behoben
    typ: Optional[str] = None
    
    # ✅ Neue Feldnamen passend zum Model
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

# ========== VERMIETUNG SCHEMAS ==========

class VermietungBase(BaseModel):
    """
    ✅ UPDATED - Session 7.2.2026
    - Ausweis-Typ & Ausweis-Nummer entfernt
    - ausweis_abgeglichen (Checkbox) hinzugefügt
    - Kaution optional (Default 0.00)
    """
    leihrad_id: int
    
    # Kundendaten
    kunde_name: str = Field(..., max_length=200)
    kunde_telefon: Optional[str] = Field(None, max_length=50)
    kunde_email: Optional[str] = Field(None, max_length=200)
    kunde_adresse: Optional[str] = None
    
    # Ausweis (nur Checkbox ob abgeglichen)
    ausweis_abgeglichen: bool = Field(default=False)
    
    # Zeitraum
    von_datum: date
    bis_datum: date
    
    # Preise
    tagespreis: Decimal
    anzahl_tage: int
    gesamtpreis: Decimal
    kaution: Decimal = Field(default=Decimal("0.00"))  # Optional, Default 0
    
    # Zustand & Notizen
    zustand_bei_ausgabe: Optional[str] = None
    notizen: Optional[str] = None

class VermietungCreate(VermietungBase):
    pass

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

class VermietungResponse(VermietungBase):
    """
    ✅ UPDATED - Session 7.2.2026
    - Alle Felder optional die in DB nullable sind
    - erstellt_am optional (falls None bei alten Einträgen)
    """
    id: int
    rueckgabe_datum: Optional[date] = None
    status: str
    zustand_bei_rueckgabe: Optional[str] = None
    schaeden: Optional[str] = None
    kaution_zurueck: Optional[bool] = Field(default=False)  # Optional mit Default
    bezahlt: bool = Field(default=False)
    bezahlt_am: Optional[datetime] = None
    erstellt_am: Optional[datetime] = None  # Optional für alte Einträge
    rad_abgeholt: Optional[bool] = Field(default=False)
    abholzeit: Optional[datetime] = None
    
    # Nested Leihrad Info
    leihrad: Optional[LeihradResponse] = None
    
    class Config:
        from_attributes = True

# ========== LIST RESPONSES ==========

class LeihradListResponse(BaseModel):
    items: list[LeihradResponse]
    total: int
    skip: int
    limit: int

class VermietungListResponse(BaseModel):
    items: list[VermietungResponse]
    total: int
    skip: int
    limit: int