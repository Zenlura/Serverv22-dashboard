"""
Artikel Variante Schemas
Pydantic Models für API-Validierung
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from decimal import Decimal


# ============================================================================
# Base Schemas
# ============================================================================

class ArtikelVarianteBase(BaseModel):
    """Base Schema für ArtikelVariante"""
    artikelnummer: str = Field(..., max_length=50, description="Lieferanten-Artikelnummer (z.B. Hartje: 0.754.432/3)")
    barcode: Optional[str] = Field(None, max_length=100, description="Barcode (EAN13, Code128, etc.) - kann leer sein")
    
    # Spezifikation
    etrto: Optional[str] = Field(None, max_length=20, description="ETRTO-Größe (z.B. 47-507)")
    zoll_info: Optional[str] = Field(None, max_length=50, description="Zoll-Bezeichnung (z.B. 24 x 1,75)")
    farbe: Optional[str] = Field(None, max_length=50, description="Farbe (z.B. schwarz)")
    
    # Bestand
    bestand_lager: int = Field(default=0, ge=0)
    bestand_werkstatt: int = Field(default=0, ge=0)
    mindestbestand: int = Field(default=0, ge=0)
    
    # Preise
    preis_ek: Decimal = Field(..., description="Einkaufspreis")
    preis_ek_rabattiert: Optional[Decimal] = Field(None, description="Rabattierter EK (optional)")
    preis_uvp: Decimal = Field(..., description="UVP / Verkaufspreis")
    
    # Meta
    notizen: Optional[str] = None
    aktiv: bool = True


# ============================================================================
# Create / Update
# ============================================================================

class ArtikelVarianteCreate(ArtikelVarianteBase):
    """Schema zum Erstellen einer Variante"""
    pass


class ArtikelVarianteUpdate(BaseModel):
    """Schema zum Updaten einer Variante (alle Felder optional)"""
    artikelnummer: Optional[str] = Field(None, max_length=50)
    barcode: Optional[str] = Field(None, max_length=100)
    
    etrto: Optional[str] = Field(None, max_length=20)
    zoll_info: Optional[str] = Field(None, max_length=50)
    farbe: Optional[str] = Field(None, max_length=50)
    
    bestand_lager: Optional[int] = Field(None, ge=0)
    bestand_werkstatt: Optional[int] = Field(None, ge=0)
    mindestbestand: Optional[int] = Field(None, ge=0)
    
    preis_ek: Optional[Decimal] = None
    preis_ek_rabattiert: Optional[Decimal] = None
    preis_uvp: Optional[Decimal] = None
    
    notizen: Optional[str] = None
    aktiv: Optional[bool] = None


# ============================================================================
# Response
# ============================================================================

class ArtikelVarianteResponse(ArtikelVarianteBase):
    """Schema für API-Response"""
    id: int
    artikel_id: int
    
    # Computed Properties
    bestand_gesamt: int
    ist_mindestbestand: bool
    preis_ek_effektiv: float
    
    # Timestamps
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# List Item (für Übersichten)
# ============================================================================

class ArtikelVarianteListItem(BaseModel):
    """Kompakte Varianten-Info für Listen"""
    id: int
    artikelnummer: str
    etrto: Optional[str] = None
    zoll_info: Optional[str] = None
    barcode: Optional[str] = None
    bestand_gesamt: int
    preis_ek_effektiv: float
    preis_uvp: Decimal
    ist_mindestbestand: bool
    
    model_config = ConfigDict(from_attributes=True)
