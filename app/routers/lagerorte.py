"""
Lagerorte Router
FastAPI Endpoints für Lagerverwaltung
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.lagerort import Lagerort
from app.schemas.lagerort import (
    LagerortCreate,
    LagerortUpdate,
    LagerortResponse,
    LagerortListItem
)

router = APIRouter(
    prefix="/api/lagerorte",
    tags=["Lagerorte"]
)


@router.get("/", response_model=List[LagerortListItem])
def get_lagerorte(
    nur_aktive: bool = True,
    db: Session = Depends(get_db)
):
    """
    Liste aller Lagerorte
    Sortiert nach sortierung-Feld
    """
    query = db.query(Lagerort)
    
    if nur_aktive:
        query = query.filter(Lagerort.aktiv == True)
    
    lagerorte = query.order_by(Lagerort.sortierung, Lagerort.name).all()
    return lagerorte


@router.get("/{lagerort_id}", response_model=LagerortResponse)
def get_lagerort(lagerort_id: int, db: Session = Depends(get_db)):
    """Einzelner Lagerort"""
    lagerort = db.query(Lagerort).filter(Lagerort.id == lagerort_id).first()
    
    if not lagerort:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lagerort {lagerort_id} nicht gefunden"
        )
    
    return lagerort


@router.post("/", response_model=LagerortResponse, status_code=status.HTTP_201_CREATED)
def create_lagerort(lagerort_data: LagerortCreate, db: Session = Depends(get_db)):
    """Neuen Lagerort erstellen"""
    
    # Prüfen ob Name schon existiert
    existing = db.query(Lagerort).filter(Lagerort.name == lagerort_data.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lagerort '{lagerort_data.name}' existiert bereits"
        )
    
    lagerort = Lagerort(**lagerort_data.model_dump())
    db.add(lagerort)
    db.commit()
    db.refresh(lagerort)
    
    return lagerort


@router.patch("/{lagerort_id}", response_model=LagerortResponse)
def update_lagerort(
    lagerort_id: int,
    lagerort_data: LagerortUpdate,
    db: Session = Depends(get_db)
):
    """Lagerort aktualisieren"""
    lagerort = db.query(Lagerort).filter(Lagerort.id == lagerort_id).first()
    
    if not lagerort:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lagerort {lagerort_id} nicht gefunden"
        )
    
    # Prüfen ob neuer Name schon existiert
    if lagerort_data.name and lagerort_data.name != lagerort.name:
        existing = db.query(Lagerort).filter(Lagerort.name == lagerort_data.name).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Lagerort '{lagerort_data.name}' existiert bereits"
            )
    
    # Update
    update_data = lagerort_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lagerort, field, value)
    
    db.commit()
    db.refresh(lagerort)
    
    return lagerort


@router.delete("/{lagerort_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lagerort(lagerort_id: int, db: Session = Depends(get_db)):
    """
    Lagerort löschen
    
    ACHTUNG: Nur möglich wenn keine Artikel diesem Lagerort zugeordnet sind!
    """
    lagerort = db.query(Lagerort).filter(Lagerort.id == lagerort_id).first()
    
    if not lagerort:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lagerort {lagerort_id} nicht gefunden"
        )
    
    # Prüfen ob Artikel zugeordnet sind
    from app.models.artikel import Artikel
    artikel_count = db.query(Artikel).filter(Artikel.lagerort_id == lagerort_id).count()
    
    if artikel_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lagerort kann nicht gelöscht werden: {artikel_count} Artikel sind diesem Lagerort zugeordnet"
        )
    
    db.delete(lagerort)
    db.commit()
