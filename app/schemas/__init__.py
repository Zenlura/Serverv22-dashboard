"""
Schemas Package - Fixed for OpenAPI generation
Handles circular dependencies between Kunde and Vermietung schemas
"""
from .kategorie import KategorieBase, KategorieCreate, KategorieResponse
from .lieferant import (
    LieferantBase, 
    LieferantCreate, 
    LieferantUpdate, 
    LieferantResponse
)
from .artikel import (
    ArtikelBase,
    ArtikelCreate,
    ArtikelUpdate,
    ArtikelResponse
)
from .bestellung import (
    BestellungBase,
    BestellungCreate,
    BestellungUpdate,
    BestellungResponse,
    BestellungStatusUpdate,
    BestellungListItem,
    BestellPositionBase,
    BestellPositionCreate,
    BestellPositionResponse,
    BestellPositionUpdate
)
from .reparatur import (
    ReparaturBase,
    ReparaturCreate,
    ReparaturUpdate,
    ReparaturResponse,
    ReparaturStatusUpdate,
    ReparaturListItem,
    ReparaturPositionBase,
    ReparaturPositionCreate,
    ReparaturPositionResponse,
    ReparaturPositionUpdate
)

# Import Kunde schemas first
from .kunde import (
    KundeBase,
    KundeCreate,
    KundeUpdate,
    KundeResponse,
    KundeDetail,
    KundeListItem,
    KundeSearchResult,
    WarnungCreate,
    WarnungResponse,
    WarnungAufheben,
    StatusCheck,
    KundenListResponse
)

# Then import Leihrad/Vermietung schemas
from .leihrad import (
    LeihradBase,
    LeihradCreate,
    LeihradUpdate,
    LeihradResponse,
    VermietungBase,
    VermietungCreate,
    VermietungUpdate,
    VermietungResponse,
    LeihradListResponse,
    VermietungListResponse
)

# Rebuild models to resolve forward references
# This is critical for circular dependencies between Kunde and Vermietung
try:
    KundeDetail.model_rebuild()
    VermietungResponse.model_rebuild()
except AttributeError:
    # If model_rebuild doesn't exist (older Pydantic), try update_forward_refs
    try:
        KundeDetail.update_forward_refs()
        VermietungResponse.update_forward_refs()
    except:
        pass  # Fail silently, will be caught during OpenAPI generation

__all__ = [
    # Kategorien
    "KategorieBase",
    "KategorieCreate",
    "KategorieResponse",
    # Lieferanten
    "LieferantBase",
    "LieferantCreate",
    "LieferantUpdate",
    "LieferantResponse",
    # Artikel
    "ArtikelBase",
    "ArtikelCreate",
    "ArtikelUpdate",
    "ArtikelResponse",
    # Bestellungen
    "BestellungBase",
    "BestellungCreate",
    "BestellungUpdate",
    "BestellungResponse",
    "BestellungStatusUpdate",
    "BestellungListItem",
    "BestellPositionBase",
    "BestellPositionCreate",
    "BestellPositionResponse",
    "BestellPositionUpdate",
    # Reparaturen
    "ReparaturBase",
    "ReparaturCreate",
    "ReparaturUpdate",
    "ReparaturResponse",
    "ReparaturStatusUpdate",
    "ReparaturListItem",
    "ReparaturPositionBase",
    "ReparaturPositionCreate",
    "ReparaturPositionResponse",
    "ReparaturPositionUpdate",
    # Kunden
    "KundeBase",
    "KundeCreate",
    "KundeUpdate",
    "KundeResponse",
    "KundeDetail",
    "KundeListItem",
    "KundeSearchResult",
    "WarnungCreate",
    "WarnungResponse",
    "WarnungAufheben",
    "StatusCheck",
    "KundenListResponse",
    # Leihräder & Vermietungen
    "LeihradBase",
    "LeihradCreate",
    "LeihradUpdate",
    "LeihradResponse",
    "VermietungBase",
    "VermietungCreate",
    "VermietungUpdate",
    "VermietungResponse",
    "LeihradListResponse",
    "VermietungListResponse",
]