"""
Bestellung Schemas
Pydantic Models für API-Validierung
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


# ============================================================================
# BestellPosition Schemas
# ============================================================================

class BestellPositionBase(BaseModel):
    """Basis-Daten für BestellPosition"""
    artikel_id: Optional[int] = Field(None, description="Artikel aus Inventar (optional)")
    artikelnummer: str = Field(..., min_length=1, max_length=100, description="Lieferanten-Artikelnummer")
    beschreibung: str = Field(..., min_length=1, description="Was ist es?")
    
    # ETRTO-Support für Reifen/Schläuche
    etrto: Optional[str] = Field(None, max_length=20, description="ETRTO (z.B. 37-622)")
    zoll_info: Optional[str] = Field(None, max_length=50, description="Zoll-Info (z.B. 28 x 1.40)")
    
    # Mengen & Preise
    menge_bestellt: int = Field(..., ge=1, description="Bestellmenge")
    einkaufspreis: Decimal = Field(..., ge=0, description="EK pro Stück")
    verkaufspreis: Decimal = Field(..., ge=0, description="VK pro Stück")
    
    # Notizen
    notizen: Optional[str] = None


class BestellPositionCreate(BestellPositionBase):
    """Neue Position erstellen"""
    pass


class BestellPositionUpdate(BaseModel):
    """Position aktualisieren (alle Felder optional)"""
    artikel_id: Optional[int] = None
    artikelnummer: Optional[str] = Field(None, max_length=100)
    beschreibung: Optional[str] = None
    etrto: Optional[str] = Field(None, max_length=20)
    zoll_info: Optional[str] = Field(None, max_length=50)
    menge_bestellt: Optional[int] = Field(None, ge=1)
    einkaufspreis: Optional[Decimal] = Field(None, ge=0)
    verkaufspreis: Optional[Decimal] = Field(None, ge=0)
    notizen: Optional[str] = None


class WareneingangCreate(BaseModel):
    """Wareneingang erfassen"""
    menge: int = Field(..., ge=1, description="Gelieferte Menge")


class BestellPositionResponse(BestellPositionBase):
    """Position mit berechneten Feldern"""
    id: int
    bestellung_id: int
    
    # Mengen
    menge_geliefert: int
    menge_offen: int  # Berechnet
    
    # Summen
    summe_ek: Optional[Decimal] = None
    summe_vk: Optional[Decimal] = None
    
    # Status
    vollstaendig_geliefert: bool
    lieferstatus_prozent: int  # Berechnet
    zuletzt_geliefert_am: Optional[datetime] = None
    
    # Timestamps
    erstellt_am: datetime
    
    # Artikel-Details (wenn verknüpft)
    artikel: Optional[dict] = None
    
    class Config:
        from_attributes = True


# ============================================================================
# Bestellung Schemas
# ============================================================================

class BestellungBase(BaseModel):
    """Basis-Daten für Bestellung"""
    lieferant_id: int = Field(..., description="Lieferant-ID")
    notizen: Optional[str] = None


class BestellungCreate(BestellungBase):
    """Neue Bestellung erstellen"""
    bestellnummer: Optional[str] = Field(None, max_length=50, description="Wenn None → Auto-Generate")
    positionen: List[BestellPositionCreate] = Field(default=[], description="Initiale Positionen (optional)")


class BestellungUpdate(BaseModel):
    """Bestellung aktualisieren"""
    lieferant_id: Optional[int] = None
    notizen: Optional[str] = None


class BestellungStatusUpdate(BaseModel):
    """Status ändern"""
    status: str = Field(
        ..., 
        pattern="^(offen|bestellt|teilweise_geliefert|geliefert|abgeschlossen)$",
        description="Status: offen, bestellt, teilweise_geliefert, geliefert, abgeschlossen"
    )


class BestellungResponse(BestellungBase):
    """Vollständige Bestellung mit allen Details"""
    id: int
    bestellnummer: str
    status: str
    
    # Summen
    gesamtsumme_ek: Optional[Decimal] = None
    gesamtsumme_vk: Optional[Decimal] = None
    
    # Termine
    erstellt_am: datetime
    bestellt_am: Optional[datetime] = None
    geliefert_am: Optional[datetime] = None
    abgeschlossen_am: Optional[datetime] = None
    updated_at: datetime
    
    # Bearbeiter
    erstellt_von: Optional[str] = None
    bestellt_von: Optional[str] = None
    
    # Berechnete Felder
    anzahl_positionen: int
    positionen_offen: int
    lieferstatus_prozent: int
    
    # Relationships
    lieferant: Optional[dict] = None  # Lieferant-Daten
    positionen: List[BestellPositionResponse] = []
    
    class Config:
        from_attributes = True


class BestellungListItem(BaseModel):
    """Vereinfachte Darstellung für Listen"""
    id: int
    bestellnummer: str
    status: str
    
    # Lieferant
    lieferant_id: int
    lieferant: Optional[dict] = None  # {id, name, kurzname}
    
    # Summen
    gesamtsumme_ek: Optional[Decimal] = None
    anzahl_positionen: int
    positionen_offen: int
    lieferstatus_prozent: int
    
    # Termine
    erstellt_am: datetime
    bestellt_am: Optional[datetime] = None
    
    class Config:
        from_attributes = True
