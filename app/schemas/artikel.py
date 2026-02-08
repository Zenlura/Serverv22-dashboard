"""
Pydantic Schemas für Artikel
"""
from pydantic import BaseModel, Field, field_validator, computed_field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


# Forward reference für ArtikelVariante
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
    
    class Config:
        from_attributes = True


# ═══════════════════════════════════════════════════════════
# LIEFERANT SCHEMAS (für Nested Response)
# ═══════════════════════════════════════════════════════════

class LieferantBase(BaseModel):
    """Basis-Info für Lieferant"""
    id: int
    name: str
    kurzname: Optional[str] = None
    
    class Config:
        from_attributes = True


class ArtikelLieferantInfo(BaseModel):
    """Info über Artikel-Lieferant-Zuordnung"""
    lieferant: LieferantBase
    lieferanten_artikelnr: Optional[str] = None
    ist_hauptlieferant: bool = False
    
    class Config:
        from_attributes = True


# ═══════════════════════════════════════════════════════════
# KATEGORIE SCHEMAS (für Nested Response)
# ═══════════════════════════════════════════════════════════

class KategorieBase(BaseModel):
    """Basis-Info für Kategorie"""
    id: int
    name: str
    beschreibung: Optional[str] = None
    
    class Config:
        from_attributes = True


# ═══════════════════════════════════════════════════════════
# ARTIKEL SCHEMAS
# ═══════════════════════════════════════════════════════════

class ArtikelBase(BaseModel):
    """Basis-Felder für Artikel"""
    artikelnummer: str = Field(..., min_length=1, max_length=50)
    bezeichnung: str = Field(..., min_length=1, max_length=200)
    beschreibung: Optional[str] = None
    typ: str = Field(default="material", pattern="^(material|dienstleistung|werkzeug|sonstiges)$")
    kategorie_id: Optional[int] = None
    
    # Varianten-Support
    hat_varianten: bool = Field(default=False, description="Hat dieser Artikel Varianten?")
    
    # Bestand (nur wenn KEINE Varianten!)
    bestand_lager: int = Field(default=0, ge=0)
    bestand_werkstatt: int = Field(default=0, ge=0)
    mindestbestand: int = Field(default=0, ge=0)
    
    # Preise (nur wenn KEINE Varianten!)
    einkaufspreis: Optional[Decimal] = Field(default=None, ge=0)
    verkaufspreis: Optional[Decimal] = Field(default=None, ge=0)
    
    # Flags
    aktiv: bool = True


class ArtikelCreate(ArtikelBase):
    """Schema für Artikel-Erstellung"""
    pass


class ArtikelUpdate(BaseModel):
    """Schema für Artikel-Update (alle Felder optional)"""
    artikelnummer: Optional[str] = Field(None, min_length=1, max_length=50)
    bezeichnung: Optional[str] = Field(None, min_length=1, max_length=200)
    beschreibung: Optional[str] = None
    typ: Optional[str] = Field(None, pattern="^(material|dienstleistung|werkzeug|sonstiges)$")
    kategorie_id: Optional[int] = None
    
    hat_varianten: Optional[bool] = None
    
    bestand_lager: Optional[int] = Field(None, ge=0)
    bestand_werkstatt: Optional[int] = Field(None, ge=0)
    mindestbestand: Optional[int] = Field(None, ge=0)
    
    einkaufspreis: Optional[Decimal] = Field(None, ge=0)
    verkaufspreis: Optional[Decimal] = Field(None, ge=0)
    
    aktiv: Optional[bool] = None


class ArtikelResponse(ArtikelBase):
    """Schema für Artikel-Antwort (mit ID und Relationships)"""
    id: int
    bestand_gesamt: int  # Computed: lager + werkstatt
    
    # Relationships
    kategorie: Optional[KategorieBase] = None
    lieferanten: List[ArtikelLieferantInfo] = []
    hauptlieferant: Optional[LieferantBase] = None  # Der bevorzugte Lieferant
    varianten: List[ArtikelVarianteListItem] = []  # Varianten (falls hat_varianten=True)
    
    # Timestamps
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class ArtikelListResponse(BaseModel):
    """Schema für Listen-Antwort mit Pagination"""
    items: List[ArtikelResponse]
    total: int
    page: int
    page_size: int
    pages: int


# ═══════════════════════════════════════════════════════════
# BESTAND ÄNDERN
# ═══════════════════════════════════════════════════════════

class BestandAendern(BaseModel):
    """Schema für Bestandsänderung"""
    aenderung: int = Field(..., description="Änderung (+5 oder -3)")
    lager: str = Field(..., pattern="^(lager|werkstatt)$", description="'lager' oder 'werkstatt'")
    grund: Optional[str] = Field(None, max_length=50, description="z.B. 'inventur', 'verkauf', 'verbrauch'")
    notiz: Optional[str] = None
    
    @field_validator('lager')
    @classmethod
    def validate_lager(cls, v):
        if v not in ['lager', 'werkstatt']:
            raise ValueError("Lager muss 'lager' oder 'werkstatt' sein")
        return v


# ═══════════════════════════════════════════════════════════
# NEXT NUMMER
# ═══════════════════════════════════════════════════════════

class NextNummerResponse(BaseModel):
    """Schema für nächste Artikelnummer"""
    artikelnummer: str
    naechste_nummer: int