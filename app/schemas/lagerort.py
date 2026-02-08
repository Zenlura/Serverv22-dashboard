"""
Lagerort Schemas - Pydantic Models für API
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# ═══════════════════════════════════════════════════════════
# BASE SCHEMAS
# ═══════════════════════════════════════════════════════════

class LagerortBase(BaseModel):
    """Basis-Schema für Lagerort"""
    name: str = Field(..., min_length=1, max_length=100, description="Name des Lagerorts")
    beschreibung: Optional[str] = Field(None, max_length=500, description="Beschreibung/Details")
    sortierung: int = Field(default=0, description="Sortierung (niedrigere Zahl = weiter oben)")
    aktiv: bool = Field(default=True, description="Ist der Lagerort aktiv?")


class LagerortCreate(LagerortBase):
    """Schema für neue Lagerorte"""
    pass


class LagerortUpdate(BaseModel):
    """Schema für Lagerort-Updates (alle Felder optional)"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    beschreibung: Optional[str] = Field(None, max_length=500)
    sortierung: Optional[int] = None
    aktiv: Optional[bool] = None


class LagerortResponse(LagerortBase):
    """Schema für Lagerort-Responses"""
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# ═══════════════════════════════════════════════════════════
# LISTE MIT STATISTIKEN (optional - für später)
# ═══════════════════════════════════════════════════════════

class LagerortMitArtikelAnzahl(LagerortResponse):
    """Lagerort mit Anzahl zugeordneter Artikel"""
    artikel_anzahl: int = Field(default=0, description="Anzahl Artikel an diesem Lagerort")
