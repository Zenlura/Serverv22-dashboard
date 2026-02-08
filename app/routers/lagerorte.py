"""
FastAPI Router für Lagerort-Verwaltung
Endpoints: /api/lagerorte
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from ..database import get_db
from ..models.lagerort import Lagerort
from ..models.artikel import Artikel
from ..schemas import lagerort as schemas


router = APIRouter(prefix="/api/lagerorte", tags=["Lagerorte"])


# ═══════════════════════════════════════════════════════════
# GET /api/lagerorte - Liste aller Lagerorte
# ═══════════════════════════════════════════════════════════

@router.get("", response_model=List[schemas.LagerortResponse])
def get_lagerorte(
    db: Session = Depends(get_db),
    nur_aktive: bool = Query(True, description="Nur aktive Lagerorte anzeigen")
):
    """
    Gibt Liste aller Lagerorte zurück
    - Sortiert nach sortierung ASC
    - Optional: nur aktive
    """
    query = db.query(Lagerort)
    
    if nur_aktive:
        query = query.filter(Lagerort.aktiv == True)
    
    lagerorte = query.order_by(Lagerort.sortierung, Lagerort.name).all()
    
    return lagerorte


# ═══════════════════════════════════════════════════════════
# GET /api/lagerorte/{id} - Einzelner Lagerort
# ═══════════════════════════════════════════════════════════

@router.get("/{lagerort_id}", response_model=schemas.LagerortResponse)
def get_lagerort(lagerort_id: int, db: Session = Depends(get_db)):
    """Gibt einzelnen Lagerort zurück"""
    lagerort = db.query(Lagerort).filter(Lagerort.id == lagerort_id).first()
    
    if not lagerort:
        raise HTTPException(status_code=404, detail="Lagerort nicht gefunden")
    
    return lagerort


# ═══════════════════════════════════════════════════════════
# POST /api/lagerorte - Neuen Lagerort anlegen
# ═══════════════════════════════════════════════════════════

@router.post("", response_model=schemas.LagerortResponse, status_code=201)
def create_lagerort(lagerort_data: schemas.LagerortCreate, db: Session = Depends(get_db)):
    """Legt neuen Lagerort an"""
    
    # Prüfe ob Name schon existiert
    existing = db.query(Lagerort).filter(Lagerort.name == lagerort_data.name).first()
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"Lagerort '{lagerort_data.name}' existiert bereits"
        )
    
    # Lagerort erstellen
    lagerort = Lagerort(**lagerort_data.model_dump())
    db.add(lagerort)
    db.commit()
    db.refresh(lagerort)
    
    return lagerort


# ═══════════════════════════════════════════════════════════
# PATCH /api/lagerorte/{id} - Lagerort bearbeiten
# ═══════════════════════════════════════════════════════════

@router.patch("/{lagerort_id}", response_model=schemas.LagerortResponse)
def update_lagerort(
    lagerort_id: int,
    lagerort_data: schemas.LagerortUpdate,
    db: Session = Depends(get_db)
):
    """Bearbeitet Lagerort (nur gesetzte Felder)"""
    lagerort = db.query(Lagerort).filter(Lagerort.id == lagerort_id).first()
    if not lagerort:
        raise HTTPException(status_code=404, detail="Lagerort nicht gefunden")
    
    # Update nur gesetzte Felder
    update_data = lagerort_data.model_dump(exclude_unset=True)
    
    # Prüfe Name-Duplikat (falls geändert)
    if "name" in update_data and update_data["name"] != lagerort.name:
        existing = db.query(Lagerort).filter(
            Lagerort.name == update_data["name"],
            Lagerort.id != lagerort_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=400, 
                detail=f"Lagerort '{update_data['name']}' existiert bereits"
            )
    
    # Update durchführen
    for field, value in update_data.items():
        setattr(lagerort, field, value)
    
    db.commit()
    db.refresh(lagerort)
    
    return lagerort


# ═══════════════════════════════════════════════════════════
# DELETE /api/lagerorte/{id} - Lagerort löschen
# ═══════════════════════════════════════════════════════════

@router.delete("/{lagerort_id}", status_code=204)
def delete_lagerort(lagerort_id: int, db: Session = Depends(get_db)):
    """
    Löscht Lagerort
    - Nur möglich wenn keine Artikel zugeordnet sind
    """
    lagerort = db.query(Lagerort).filter(Lagerort.id == lagerort_id).first()
    if not lagerort:
        raise HTTPException(status_code=404, detail="Lagerort nicht gefunden")
    
    # Prüfe ob Artikel zugeordnet sind
    artikel_count = db.query(func.count(Artikel.id)).filter(
        Artikel.lagerort_id == lagerort_id
    ).scalar()
    
    if artikel_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Lagerort kann nicht gelöscht werden: {artikel_count} Artikel sind noch zugeordnet"
        )
    
    db.delete(lagerort)
    db.commit()
    
    return None


# ═══════════════════════════════════════════════════════════
# GET /api/lagerorte/{id}/artikel - Artikel an diesem Lagerort
# ═══════════════════════════════════════════════════════════

@router.get("/{lagerort_id}/artikel")
def get_artikel_an_lagerort(
    lagerort_id: int,
    db: Session = Depends(get_db)
):
    """
    Gibt alle Artikel zurück die an diesem Lagerort liegen
    - Nützlich für Inventur, Übersicht, etc.
    """
    lagerort = db.query(Lagerort).filter(Lagerort.id == lagerort_id).first()
    if not lagerort:
        raise HTTPException(status_code=404, detail="Lagerort nicht gefunden")
    
    artikel = db.query(Artikel).filter(
        Artikel.lagerort_id == lagerort_id,
        Artikel.aktiv == True
    ).all()
    
    return {
        "lagerort": lagerort,
        "artikel_anzahl": len(artikel),
        "artikel": [
            {
                "id": a.id,
                "artikelnummer": a.artikelnummer,
                "bezeichnung": a.bezeichnung,
                "bestand_gesamt": a.bestand_gesamt
            }
            for a in artikel
        ]
    }
