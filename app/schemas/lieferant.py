"""
Pydantic Schemas für Lieferanten
Session 1.4
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# Base Schema (gemeinsame Felder)
class LieferantBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="Firmenname")
    kurzname: Optional[str] = Field(None, max_length=50, description="Abkürzung (z.B. 'HAR')")
    kontakt_person: Optional[str] = Field(None, max_length=200, description="Ansprechpartner")
    email: Optional[str] = Field(None, max_length=200, description="E-Mail Adresse")
    telefon: Optional[str] = Field(None, max_length=50, description="Telefonnummer")
    website: Optional[str] = Field(None, max_length=500, description="Website URL")
    strasse: Optional[str] = Field(None, max_length=200, description="Straße + Hausnummer")
    plz: Optional[str] = Field(None, max_length=20, description="Postleitzahl")
    ort: Optional[str] = Field(None, max_length=100, description="Ort")
    land: Optional[str] = Field(None, max_length=100, description="Land")
    notizen: Optional[str] = Field(None, description="Interne Notizen")
    aktiv: bool = Field(True, description="Lieferant aktiv?")


# Schema für Create (POST)
class LieferantCreate(LieferantBase):
    """Schema zum Anlegen eines neuen Lieferanten"""
    pass


# Schema für Update (PUT)
class LieferantUpdate(BaseModel):
    """Schema zum Bearbeiten eines Lieferanten (alle Felder optional)"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    kurzname: Optional[str] = Field(None, max_length=50)
    kontakt_person: Optional[str] = Field(None, max_length=200)
    email: Optional[str] = Field(None, max_length=200)
    telefon: Optional[str] = Field(None, max_length=50)
    website: Optional[str] = Field(None, max_length=500)
    strasse: Optional[str] = Field(None, max_length=200)
    plz: Optional[str] = Field(None, max_length=20)
    ort: Optional[str] = Field(None, max_length=100)
    land: Optional[str] = Field(None, max_length=100)
    notizen: Optional[str] = None
    aktiv: Optional[bool] = None


# Schema für Response (GET)
class LieferantResponse(LieferantBase):
    """Schema für API-Antworten"""
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True  # Für SQLAlchemy Models


# Schema für Liste (vereinfacht)
class LieferantListItem(BaseModel):
    """Vereinfachtes Schema für Listen-Ansicht"""
    id: int
    name: str
    kurzname: Optional[str]
    ort: Optional[str]
    email: Optional[str]
    telefon: Optional[str]
    aktiv: bool
    created_at: datetime

    class Config:
        from_attributes = True