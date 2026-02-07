"""
Bestellung Schemas
Pydantic Models für API
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Any
from datetime import datetime
from decimal import Decimal


# ==================== BestellPosition Schemas ====================

class BestellPositionBase(BaseModel):
    """Basis-Schema für BestellPosition"""
    artikel_id: int
    menge: int = Field(gt=0)
    einzelpreis: Decimal = Field(ge=0)
    notizen: Optional[str] = None


class BestellPositionCreate(BestellPositionBase):
    """Schema zum Erstellen einer Position"""
    pass


class BestellPositionResponse(BestellPositionBase):
    """Schema für API-Response mit allen Feldern"""
    id: int
    bestellung_id: int
    gesamtpreis: Decimal
    menge_geliefert: int
    geliefert: bool
    created_at: datetime
    
    # Nested Artikel-Info
    artikel: Optional[Any] = None
    
    model_config = ConfigDict(from_attributes=True)


# ==================== Bestellung Schemas ====================

class BestellungBase(BaseModel):
    """Basis-Schema für Bestellung"""
    lieferant_id: int
    notizen: Optional[str] = None
    interne_notizen: Optional[str] = None
    versandkosten: Optional[Decimal] = Field(default=Decimal("0.0"), ge=0)


class BestellungCreate(BestellungBase):
    """Schema zum Erstellen einer Bestellung"""
    positionen: List[BestellPositionCreate] = Field(min_length=1)


class BestellungUpdate(BaseModel):
    """Schema zum Aktualisieren einer Bestellung"""
    status: Optional[str] = None
    bestelldatum: Optional[datetime] = None
    lieferdatum_erwartet: Optional[datetime] = None
    lieferdatum_tatsaechlich: Optional[datetime] = None
    notizen: Optional[str] = None
    interne_notizen: Optional[str] = None
    versandkosten: Optional[Decimal] = None

class BestellungStatusUpdate(BaseModel):
    """Schema für Status-Änderung"""
    status: str  # "entwurf", "bestellt", "teilgeliefert", "geliefert", "storniert"


class BestellPositionUpdate(BaseModel):
    """Schema zum Aktualisieren einer Position"""
    menge: Optional[int] = Field(default=None, gt=0)
    einzelpreis: Optional[Decimal] = Field(default=None, ge=0)
    notizen: Optional[str] = None
    menge_geliefert: Optional[int] = Field(default=None, ge=0)


class BestellungResponse(BestellungBase):
    """Schema für API-Response mit allen Feldern"""
    id: int
    bestellnummer: str
    status: str
    bestelldatum: Optional[datetime] = None
    lieferdatum_erwartet: Optional[datetime] = None
    lieferdatum_tatsaechlich: Optional[datetime] = None
    gesamtpreis: Decimal
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Nested Relations
    lieferant: Optional[Any] = None
    positionen: List[BestellPositionResponse] = []
    
    model_config = ConfigDict(from_attributes=True)


class BestellungListItem(BaseModel):
    """Vereinfachtes Schema für Listen-Ansicht"""
    id: int
    bestellnummer: str
    status: str
    lieferant_id: int
    gesamtpreis: Decimal
    bestelldatum: Optional[datetime] = None
    lieferdatum_erwartet: Optional[datetime] = None
    created_at: datetime
    
    # Nested Lieferant-Info (nur Name)
    lieferant: Optional[Any] = None
    
    # Anzahl Positionen
    anzahl_positionen: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)