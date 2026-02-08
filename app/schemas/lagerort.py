"""
Lagerort Schemas
Pydantic Models für API-Validierung
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class LagerortBase(BaseModel):
    """Basis-Daten für Lagerort"""
    name: str = Field(..., min_length=1, max_length=100)
    beschreibung: Optional[str] = Field(None, max_length=500)
    sortierung: int = Field(0, description="Sortierung (0 = oben)")
    aktiv: bool = Field(True)


class LagerortCreate(LagerortBase):
    """Neuen Lagerort erstellen"""
    pass


class LagerortUpdate(BaseModel):
    """Lagerort aktualisieren (alle Felder optional)"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    beschreibung: Optional[str] = Field(None, max_length=500)
    sortierung: Optional[int] = None
    aktiv: Optional[bool] = None


class LagerortResponse(LagerortBase):
    """Lagerort mit ID und Timestamps"""
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class LagerortListItem(BaseModel):
    """Vereinfachte Darstellung für Listen"""
    id: int
    name: str
    beschreibung: Optional[str] = None
    sortierung: int
    aktiv: bool
    
    class Config:
        from_attributes = True
