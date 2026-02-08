from pydantic import BaseModel, Field
from typing import Optional, TYPE_CHECKING
from datetime import datetime, date, time
from decimal import Decimal

# Conditional import to avoid circular dependencies
if TYPE_CHECKING:
    from app.schemas.kunde import KundeResponse

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
    ✅ UPDATED - Session 7.2.2026 23:59 - Kalender V2
    - Ausweis-Typ & Ausweis-Nummer entfernt
    - ausweis_abgeglichen (Checkbox) hinzugefügt
    - Kaution optional (Default 0.00)
    - kunde_id statt kunde_name/telefon/email/adresse
    - anzahl_raeder (Wieviele Räder werden gebucht)
    - von_zeit & bis_zeit (Geplante Abholung/Rückgabe-Zeiten)
    - leihrad_id OPTIONAL für Gruppenbuchungen (Kalender V2)
    """
    leihrad_id: Optional[int] = None  # ✅ KALENDER V2: Optional für Gruppenbuchungen
    
    # Kundendaten (NEU: nur noch kunde_id)
    kunde_id: int
    
    # Ausweis (nur Checkbox ob abgeglichen)
    ausweis_abgeglichen: bool = Field(default=False)
    
    # Anzahl Räder (Kalender V2)
    anzahl_raeder: int = Field(ge=1, le=50, default=1)  # Min 1, Max 50 Räder
    
    # Zeitraum
    von_datum: date
    von_zeit: Optional[time] = None  # Geplante Abholzeit (z.B. 10:00)
    bis_datum: date
    bis_zeit: Optional[time] = None  # Geplante Rückgabezeit (z.B. 18:00)
    
    # Status
    status: str = Field(default='reserviert')  # ✅ Neue Buchungen sind 'reserviert'
    
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

class VermietungResponse(BaseModel):
    """
    ✅ UPDATED - Session 7.2.2026 23:59 - Kalender V2
    - Alle Felder optional die in DB nullable sind
    - erstellt_am optional (falls None bei alten Einträgen)
    - Alte kunde_name Felder optional (für alte Vermietungen)
    - kunde_id ist Pflicht (für neue Vermietungen)
    - anzahl_raeder, von_zeit, bis_zeit (Kalender V2)
    - leihrad_id OPTIONAL für Gruppenbuchungen
    """
    id: int
    leihrad_id: Optional[int] = None  # ✅ KALENDER V2: Optional für Gruppenbuchungen
    kunde_id: Optional[int] = None  # Kann None sein bei alten Vermietungen
    
    # Alte Felder (für Backwards-Compatibility)
    kunde_name: Optional[str] = None
    kunde_telefon: Optional[str] = None
    kunde_email: Optional[str] = None
    kunde_adresse: Optional[str] = None
    
    # Anzahl Räder (Kalender V2)
    anzahl_raeder: int = Field(default=1)  # Default 1 für alte Einträge
    
    # Ausweis & Zeitraum
    ausweis_abgeglichen: bool = Field(default=False)
    von_datum: date
    von_zeit: Optional[time] = None  # Geplante Abholzeit
    bis_datum: date
    bis_zeit: Optional[time] = None  # Geplante Rückgabezeit
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
    
    # Nested Relations
    leihrad: Optional[LeihradResponse] = None
    kunde: Optional['KundeResponse'] = None  # ✅ Kunde-Relation für Kalender-Anzeige
    
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