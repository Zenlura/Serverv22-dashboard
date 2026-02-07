"""
Pydantic Schemas für Kategorien
Session 1.5
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# Base Schema
class KategorieBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Kategoriename")
    beschreibung: Optional[str] = Field(None, description="Beschreibung")
    parent_id: Optional[int] = Field(None, description="Übergeordnete Kategorie (None = Hauptkategorie)")


# Schema für Create (POST)
class KategorieCreate(KategorieBase):
    """Schema zum Anlegen einer neuen Kategorie"""
    pass


# Schema für Update (PUT)
class KategorieUpdate(BaseModel):
    """Schema zum Bearbeiten einer Kategorie (alle Felder optional)"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    beschreibung: Optional[str] = None
    parent_id: Optional[int] = None


# Schema für Response (GET) - ohne Children
class KategorieResponse(KategorieBase):
    """Schema für API-Antworten"""
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Schema für Listen-Ansicht
class KategorieListItem(BaseModel):
    """Vereinfachtes Schema für Listen-Ansicht"""
    id: int
    name: str
    beschreibung: Optional[str]
    parent_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


# Schema für Baum-Ansicht (rekursiv)
class KategorieTree(BaseModel):
    """Schema für hierarchische Baum-Ansicht"""
    id: int
    name: str
    beschreibung: Optional[str]
    parent_id: Optional[int]
    children: List['KategorieTree'] = []

    class Config:
        from_attributes = True


# Für Pydantic v2 - rekursive Models
KategorieTree.model_rebuild()
