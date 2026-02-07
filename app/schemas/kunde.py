from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal

# ============================================================================
# KUNDEN SCHEMAS
# ============================================================================

class KundeBase(BaseModel):
    vorname: Optional[str] = None
    nachname: str
    telefon: Optional[str] = None
    email: Optional[EmailStr] = None
    strasse: Optional[str] = None
    plz: Optional[str] = None
    ort: Optional[str] = None
    sprache: Optional[str] = None
    sprache_notiz: Optional[str] = None
    notizen: Optional[str] = None


class KundeCreate(KundeBase):
    """Minimale Daten zum Anlegen eines Kunden"""
    pass


class KundeUpdate(BaseModel):
    """Alle Felder optional für Updates"""
    vorname: Optional[str] = None
    nachname: Optional[str] = None
    telefon: Optional[str] = None
    email: Optional[EmailStr] = None
    strasse: Optional[str] = None
    plz: Optional[str] = None
    ort: Optional[str] = None
    sprache: Optional[str] = None
    sprache_notiz: Optional[str] = None
    notizen: Optional[str] = None


class KundeResponse(KundeBase):
    id: int
    kundennummer: str
    status: str
    gesperrt_grund: Optional[str] = None
    gesperrt_seit: Optional[date] = None
    gesperrt_von: Optional[str] = None
    offene_rechnungen: Decimal
    zahlungsmoral: Optional[str] = None
    erstellt_am: datetime
    geaendert_am: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class KundeDetail(KundeResponse):
    """Erweiterte Response mit Verlauf"""
    vermietungen_anzahl: int = 0
    letzte_vermietung: Optional[datetime] = None
    warnungen: List['WarnungResponse'] = []
    
    class Config:
        from_attributes = True


class KundeListItem(BaseModel):
    """Kompakte Darstellung für Listen"""
    id: int
    kundennummer: str
    vorname: Optional[str]
    nachname: str
    telefon: Optional[str]
    status: str
    offene_rechnungen: Decimal
    sprache: Optional[str]
    
    class Config:
        from_attributes = True


class KundeSearchResult(BaseModel):
    """Für Autocomplete-Suche"""
    id: int
    kundennummer: str
    display_name: str  # "Max Mustermann (K-0001)"
    telefon: Optional[str]
    status: str
    
    class Config:
        from_attributes = True


# ============================================================================
# WARNUNGEN SCHEMAS
# ============================================================================

class WarnungCreate(BaseModel):
    typ: str = Field(..., pattern='^(warnung|sperrung)$')
    grund: str = Field(..., min_length=10)
    betrag: Optional[Decimal] = None
    erstellt_von: str = Field(..., min_length=2)


class WarnungResponse(BaseModel):
    id: int
    kunde_id: int
    typ: str
    grund: str
    betrag: Optional[Decimal]
    erstellt_am: datetime
    erstellt_von: str
    aufgehoben_am: Optional[datetime]
    aufgehoben_von: Optional[str]
    
    class Config:
        from_attributes = True


class WarnungAufheben(BaseModel):
    aufgehoben_von: str = Field(..., min_length=2)


# ============================================================================
# STATUS CHECK
# ============================================================================

class StatusCheck(BaseModel):
    """Response für Status-Checks vor Vermietung"""
    can_rent: bool
    warnings: List[dict] = []
    
    class Config:
        from_attributes = True


# ============================================================================
# LISTE RESPONSES
# ============================================================================

class KundenListResponse(BaseModel):
    items: List[KundeListItem]
    total: int
    page: int = 1
    page_size: int = 50
