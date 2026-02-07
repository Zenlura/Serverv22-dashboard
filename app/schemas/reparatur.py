"""
Reparatur Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


# ============================================================================
# ReparaturPosition Schemas
# ============================================================================

class ReparaturPositionBase(BaseModel):
    typ: str = Field(..., description="'arbeit' oder 'teil'", pattern="^(arbeit|teil)$")
    artikel_id: Optional[int] = None
    bezeichnung: str
    beschreibung: Optional[str] = None
    menge: Decimal = Field(default=1, ge=0)
    einzelpreis: Decimal = Field(ge=0)


class ReparaturPositionCreate(ReparaturPositionBase):
    pass


class ReparaturPositionUpdate(BaseModel):
    typ: Optional[str] = Field(None, pattern="^(arbeit|teil)$")
    bezeichnung: Optional[str] = None
    beschreibung: Optional[str] = None
    menge: Optional[Decimal] = Field(None, ge=0)
    einzelpreis: Optional[Decimal] = Field(None, ge=0)


class ReparaturPositionResponse(ReparaturPositionBase):
    id: int
    reparatur_id: int
    gesamtpreis: Decimal
    created_at: datetime
    artikel: Optional[dict] = None  # Vereinfacht - könnte auch ArtikelResponse sein
    
    class Config:
        from_attributes = True


# ============================================================================
# Reparatur Schemas
# ============================================================================

class ReparaturBase(BaseModel):
    # Fahrrad
    fahrradmarke: str = Field(..., min_length=1, max_length=100)
    fahrradmodell: Optional[str] = Field(None, max_length=100)
    rahmennummer: Optional[str] = Field(None, max_length=100)
    schluesselnummer: Optional[str] = Field(None, max_length=50)
    fahrrad_anwesend: bool = False
    
    # Kunde (optional)
    kunde_name: Optional[str] = Field(None, max_length=200)
    kunde_telefon: Optional[str] = Field(None, max_length=50)
    kunde_email: Optional[str] = Field(None, max_length=200)
    
    # Reparatur
    maengelbeschreibung: str = Field(..., min_length=1)
    status: str = Field(default='angenommen', pattern="^(angenommen|in_arbeit|wartet_auf_teile|fertig|abgeholt|storniert)$")
    
    # Termine
    fertig_bis: Optional[datetime] = None
    abholtermin: Optional[str] = Field(None, max_length=100)
    
    # Kosten
    kostenvoranschlag: Optional[Decimal] = Field(None, ge=0)
    
    # Notizen
    notizen: Optional[str] = None


class ReparaturCreate(ReparaturBase):
    auftragsnummer: Optional[str] = Field(None, max_length=50)  # Wenn None → Auto-Generate
    positionen: List[ReparaturPositionCreate] = []


class ReparaturUpdate(BaseModel):
    # Fahrrad
    fahrradmarke: Optional[str] = Field(None, max_length=100)
    fahrradmodell: Optional[str] = Field(None, max_length=100)
    rahmennummer: Optional[str] = Field(None, max_length=100)
    schluesselnummer: Optional[str] = Field(None, max_length=50)
    fahrrad_anwesend: Optional[bool] = None
    
    # Kunde
    kunde_name: Optional[str] = Field(None, max_length=200)
    kunde_telefon: Optional[str] = Field(None, max_length=50)
    kunde_email: Optional[str] = Field(None, max_length=200)
    
    # Reparatur
    maengelbeschreibung: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(angenommen|in_arbeit|wartet_auf_teile|fertig|abgeholt|storniert)$")
    
    # Termine
    fertig_bis: Optional[datetime] = None
    fertig_am: Optional[datetime] = None
    abholtermin: Optional[str] = Field(None, max_length=100)
    abgeholt_am: Optional[datetime] = None
    
    # Kosten
    kostenvoranschlag: Optional[Decimal] = Field(None, ge=0)
    endbetrag: Optional[Decimal] = Field(None, ge=0)
    bezahlt: Optional[bool] = None
    
    # Notizen
    notizen: Optional[str] = None


class ReparaturStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(angenommen|in_arbeit|wartet_auf_teile|fertig|abgeholt|storniert)$")


class ReparaturResponse(ReparaturBase):
    id: int
    auftragsnummer: str
    
    # Zusätzliche Felder für Response
    reparaturdatum: datetime
    fertig_am: Optional[datetime] = None
    abgeholt_am: Optional[datetime] = None
    
    endbetrag: Optional[Decimal] = None
    bezahlt: bool
    bezahlt_am: Optional[datetime] = None
    
    created_at: datetime
    updated_at: datetime
    
    positionen: List[ReparaturPositionResponse] = []
    
    class Config:
        from_attributes = True


class ReparaturListItem(BaseModel):
    """Vereinfachte Darstellung für Listen"""
    id: int
    auftragsnummer: str
    fahrradmarke: str
    fahrradmodell: Optional[str] = None
    fahrrad_anwesend: bool
    kunde_name: Optional[str] = None
    maengelbeschreibung: str
    status: str
    reparaturdatum: datetime
    fertig_bis: Optional[datetime] = None
    endbetrag: Optional[Decimal] = None
    bezahlt: bool
    created_at: datetime
    
    class Config:
        from_attributes = True