"""
Models Package
Exportiert alle SQLAlchemy Models
"""
from .kategorie import Kategorie
from .lieferant import Lieferant
from .artikel import Artikel
from .artikel_variante import ArtikelVariante
from .artikel_lieferant import ArtikelLieferant
from .bestand_historie import BestandHistorie, BestandArt, BestandOrt
from .bestellung import Bestellung, BestellPosition
from .reparatur import Reparatur, ReparaturPosition
from .leihrad import Leihrad, LeihradStatus
from .vermietung import Vermietung, VermietungStatus
from .vermietung_position import VermietungPosition  # ✨ Phase 5
from .kunde import Kunde, KundenWarnung  # Kunden-System
from app.models.lagerort import Lagerort

__all__ = [
    "Kategorie",
    "Lieferant",
    "Artikel",
    "ArtikelVariante",
    "ArtikelLieferant",
    "BestandHistorie",
    "BestandArt",
    "BestandOrt",
    "Bestellung",
    "BestellPosition",
    "Reparatur",
    "ReparaturPosition",
    "Leihrad",
    "LeihradStatus",
    "Vermietung",
    "VermietungStatus",
    "VermietungPosition",  # ✨ Phase 5
    "Kunde",  # Kunden-System
    "KundenWarnung",
]