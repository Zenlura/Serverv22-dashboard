"""
Artikel Varianten Router
API-Endpoints für Varianten-Verwaltung
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.artikel import Artikel
from app.models.artikel_variante import ArtikelVariante
from app.schemas.artikel_variante import (
    ArtikelVarianteCreate,
    ArtikelVarianteUpdate,
    ArtikelVarianteResponse,
    ArtikelVarianteListItem,
)

router = APIRouter(
    prefix="/api/varianten",
    tags=["Artikel-Varianten"]
)


# ============================================================================
# Varianten eines Artikels
# ============================================================================

@router.get("/artikel/{artikel_id}", response_model=List[ArtikelVarianteListItem])
def get_artikel_varianten(
    artikel_id: int,
    db: Session = Depends(get_db),
    nur_aktive: bool = Query(True, description="Nur aktive Varianten anzeigen")
):
    """
    Alle Varianten eines Artikels abrufen
    """
    # Prüfe ob Artikel existiert
    artikel = db.query(Artikel).filter(Artikel.id == artikel_id).first()
    if not artikel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Artikel {artikel_id} nicht gefunden"
        )
    
    # Query
    query = db.query(ArtikelVariante).filter(ArtikelVariante.artikel_id == artikel_id)
    
    if nur_aktive:
        query = query.filter(ArtikelVariante.aktiv == True)
    
    varianten = query.order_by(ArtikelVariante.etrto).all()
    return varianten


# ============================================================================
# Einzelne Variante
# ============================================================================

@router.get("/{variante_id}", response_model=ArtikelVarianteResponse)
def get_variante(variante_id: int, db: Session = Depends(get_db)):
    """
    Eine Variante im Detail abrufen
    """
    variante = db.query(ArtikelVariante).filter(ArtikelVariante.id == variante_id).first()
    
    if not variante:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Variante {variante_id} nicht gefunden"
        )
    
    return variante


# ============================================================================
# Variante erstellen
# ============================================================================

@router.post("/artikel/{artikel_id}", response_model=ArtikelVarianteResponse, status_code=status.HTTP_201_CREATED)
def create_variante(
    artikel_id: int,
    variante: ArtikelVarianteCreate,
    db: Session = Depends(get_db)
):
    """
    Neue Variante für einen Artikel erstellen
    """
    # Prüfe ob Artikel existiert
    artikel = db.query(Artikel).filter(Artikel.id == artikel_id).first()
    if not artikel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Artikel {artikel_id} nicht gefunden"
        )
    
    # Prüfe ob Artikel Varianten unterstützt
    if not artikel.hat_varianten:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Artikel '{artikel.bezeichnung}' hat keine Varianten aktiviert. Setze 'hat_varianten' auf true."
        )
    
    # Prüfe ob Artikelnummer schon existiert (bei diesem Lieferanten)
    existing = db.query(ArtikelVariante).filter(
        ArtikelVariante.artikel_id == artikel_id,
        ArtikelVariante.artikelnummer == variante.artikelnummer
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Variante mit Artikelnummer '{variante.artikelnummer}' existiert bereits für diesen Artikel"
        )
    
    # ETRTO → Zoll-Info automatisch ableiten
    zoll_info = variante.zoll_info
    if variante.etrto and not zoll_info:
        zoll_info = etrto_to_zoll(variante.etrto)
    
    # Erstelle Variante
    neue_variante = ArtikelVariante(
        artikel_id=artikel_id,
        artikelnummer=variante.artikelnummer,
        barcode=variante.barcode,
        etrto=variante.etrto,
        zoll_info=zoll_info,
        farbe=variante.farbe,
        bestand_lager=variante.bestand_lager,
        bestand_werkstatt=variante.bestand_werkstatt,
        mindestbestand=variante.mindestbestand,
        preis_ek=variante.preis_ek,
        preis_ek_rabattiert=variante.preis_ek_rabattiert,
        preis_uvp=variante.preis_uvp,
        notizen=variante.notizen,
        aktiv=variante.aktiv,
    )
    
    db.add(neue_variante)
    db.commit()
    db.refresh(neue_variante)
    
    return neue_variante


# ============================================================================
# Variante aktualisieren
# ============================================================================

@router.put("/{variante_id}", response_model=ArtikelVarianteResponse)
def update_variante(
    variante_id: int,
    variante_update: ArtikelVarianteUpdate,
    db: Session = Depends(get_db)
):
    """
    Variante aktualisieren
    """
    variante = db.query(ArtikelVariante).filter(ArtikelVariante.id == variante_id).first()
    
    if not variante:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Variante {variante_id} nicht gefunden"
        )
    
    # Update Felder (nur wenn gesetzt)
    update_data = variante_update.model_dump(exclude_unset=True)
    
    # ETRTO geändert? → Zoll-Info aktualisieren
    if 'etrto' in update_data and update_data['etrto']:
        if 'zoll_info' not in update_data or not update_data['zoll_info']:
            update_data['zoll_info'] = etrto_to_zoll(update_data['etrto'])
    
    for field, value in update_data.items():
        setattr(variante, field, value)
    
    db.commit()
    db.refresh(variante)
    
    return variante


# ============================================================================
# Variante löschen
# ============================================================================

@router.delete("/{variante_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_variante(variante_id: int, db: Session = Depends(get_db)):
    """
    Variante löschen (nur wenn Bestand = 0!)
    """
    variante = db.query(ArtikelVariante).filter(ArtikelVariante.id == variante_id).first()
    
    if not variante:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Variante {variante_id} nicht gefunden"
        )
    
    # Prüfe Bestand
    if variante.bestand_gesamt > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Variante kann nicht gelöscht werden, Bestand ist {variante.bestand_gesamt}"
        )
    
    db.delete(variante)
    db.commit()
    
    return None


# ============================================================================
# Barcode-Suche (für Scanner später)
# ============================================================================

@router.get("/barcode/scan", response_model=ArtikelVarianteResponse)
def scan_barcode(
    code: str = Query(..., description="Barcode zum Scannen"),
    db: Session = Depends(get_db)
):
    """
    Variante per Barcode finden (für Scanner-Integration)
    """
    variante = db.query(ArtikelVariante).filter(
        ArtikelVariante.barcode == code,
        ArtikelVariante.aktiv == True
    ).first()
    
    if not variante:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Kein Artikel mit Barcode '{code}' gefunden"
        )
    
    return variante


# ============================================================================
# Helper Functions
# ============================================================================

def etrto_to_zoll(etrto: str) -> str:
    """
    Konvertiert ETRTO zu Zoll-Bezeichnung
    
    Beispiele:
    - 47-507 → 24"
    - 37-622 → 28"
    - 50-559 → 26"
    """
    if not etrto or '-' not in etrto:
        return ""
    
    try:
        breite, durchmesser = etrto.split('-')
        durchmesser = int(durchmesser)
        
        # Mapping ETRTO-Durchmesser → Zoll
        zoll_map = {
            622: '28"',
            635: '28"',
            590: '26"',
            559: '26"',
            571: '26"',
            507: '24"',
            520: '24"',
            540: '24"',
            451: '20"',
            406: '20"',
            419: '20"',
            355: '18"',
            369: '18"',
            305: '16"',
            317: '16"',
            203: '12"',
        }
        
        zoll = zoll_map.get(durchmesser, f'{durchmesser}mm')
        return f"{zoll} x {int(breite)/25.4:.2f}"  # Breite in Zoll umrechnen (ungefähr)
        
    except (ValueError, IndexError):
        return ""
