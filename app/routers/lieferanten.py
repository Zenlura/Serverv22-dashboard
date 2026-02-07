"""
Lieferanten API Router
Session 1.4
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional

from app.database import get_db
from app.models.lieferant import Lieferant
from app.schemas.lieferant import (
    LieferantCreate,
    LieferantUpdate,
    LieferantResponse,
    LieferantListItem
)

router = APIRouter(prefix="/api/lieferanten", tags=["Lieferanten"])


@router.get("", response_model=List[LieferantListItem])
def get_lieferanten(
    skip: int = Query(0, ge=0, description="Anzahl zu überspringen"),
    limit: int = Query(100, ge=1, le=1000, description="Max. Anzahl Ergebnisse"),
    search: Optional[str] = Query(None, description="Suche in Name, Kurzname, Ort"),
    aktiv: Optional[bool] = Query(None, description="Filter nach aktiv/inaktiv"),
    db: Session = Depends(get_db)
):
    """
    Liste aller Lieferanten mit optionalen Filtern
    
    - **skip**: Pagination - Anzahl zu überspringen
    - **limit**: Pagination - Max. Anzahl Ergebnisse
    - **search**: Volltextsuche in Name, Kurzname, Ort
    - **aktiv**: true/false - nur aktive oder inaktive
    """
    query = db.query(Lieferant)
    
    # Filter: Aktiv/Inaktiv
    if aktiv is not None:
        query = query.filter(Lieferant.aktiv == aktiv)
    
    # Filter: Suche
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Lieferant.name.ilike(search_pattern),
                Lieferant.kurzname.ilike(search_pattern),
                Lieferant.ort.ilike(search_pattern)
            )
        )
    
    # Sortierung
    query = query.order_by(Lieferant.name)
    
    # Pagination
    lieferanten = query.offset(skip).limit(limit).all()
    
    return lieferanten


@router.post("", response_model=LieferantResponse, status_code=201)
def create_lieferant(
    lieferant_data: LieferantCreate,
    db: Session = Depends(get_db)
):
    """
    Neuen Lieferanten anlegen
    
    - **name**: Pflichtfeld - Firmenname
    - Alle anderen Felder optional
    """
    # Prüfen ob Name schon existiert
    existing = db.query(Lieferant).filter(
        Lieferant.name == lieferant_data.name
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Lieferant '{lieferant_data.name}' existiert bereits"
        )
    
    # Neuen Lieferanten erstellen
    lieferant = Lieferant(**lieferant_data.model_dump())
    db.add(lieferant)
    db.commit()
    db.refresh(lieferant)
    
    return lieferant


@router.get("/{lieferant_id}", response_model=LieferantResponse)
def get_lieferant(
    lieferant_id: int,
    db: Session = Depends(get_db)
):
    """
    Einzelnen Lieferanten abrufen
    """
    lieferant = db.query(Lieferant).filter(Lieferant.id == lieferant_id).first()
    
    if not lieferant:
        raise HTTPException(
            status_code=404,
            detail=f"Lieferant mit ID {lieferant_id} nicht gefunden"
        )
    
    return lieferant


@router.put("/{lieferant_id}", response_model=LieferantResponse)
def update_lieferant(
    lieferant_id: int,
    lieferant_data: LieferantUpdate,
    db: Session = Depends(get_db)
):
    """
    Lieferanten bearbeiten
    
    - Alle Felder optional
    - Nur übermittelte Felder werden geändert
    """
    # Lieferanten finden
    lieferant = db.query(Lieferant).filter(Lieferant.id == lieferant_id).first()
    
    if not lieferant:
        raise HTTPException(
            status_code=404,
            detail=f"Lieferant mit ID {lieferant_id} nicht gefunden"
        )
    
    # Prüfen ob neuer Name schon existiert (falls Name geändert wird)
    if lieferant_data.name and lieferant_data.name != lieferant.name:
        existing = db.query(Lieferant).filter(
            Lieferant.name == lieferant_data.name,
            Lieferant.id != lieferant_id
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Lieferant '{lieferant_data.name}' existiert bereits"
            )
    
    # Nur gesetzte Felder aktualisieren
    update_data = lieferant_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lieferant, field, value)
    
    db.commit()
    db.refresh(lieferant)
    
    return lieferant


@router.delete("/{lieferant_id}", status_code=204)
def delete_lieferant(
    lieferant_id: int,
    db: Session = Depends(get_db)
):
    """
    Lieferanten löschen
    
    ⚠️ ACHTUNG: Löscht auch alle Verknüpfungen zu Artikeln!
    """
    lieferant = db.query(Lieferant).filter(Lieferant.id == lieferant_id).first()
    
    if not lieferant:
        raise HTTPException(
            status_code=404,
            detail=f"Lieferant mit ID {lieferant_id} nicht gefunden"
        )
    
    # TODO: Prüfen ob Lieferant mit Artikeln verknüpft ist?
    # Für jetzt: Einfach löschen (CASCADE in DB regelt Rest)
    
    db.delete(lieferant)
    db.commit()
    
    return None


@router.patch("/{lieferant_id}/toggle", response_model=LieferantResponse)
def toggle_lieferant_aktiv(
    lieferant_id: int,
    db: Session = Depends(get_db)
):
    """
    Lieferanten aktivieren/deaktivieren (Toggle)
    
    - Wenn aktiv → wird inaktiv
    - Wenn inaktiv → wird aktiv
    """
    lieferant = db.query(Lieferant).filter(Lieferant.id == lieferant_id).first()
    
    if not lieferant:
        raise HTTPException(
            status_code=404,
            detail=f"Lieferant mit ID {lieferant_id} nicht gefunden"
        )
    
    # Toggle
    lieferant.aktiv = not lieferant.aktiv
    
    db.commit()
    db.refresh(lieferant)
    
    return lieferant


@router.get("/stats/count")
def get_lieferanten_stats(
    db: Session = Depends(get_db)
):
    """
    Statistiken über Lieferanten
    """
    total = db.query(Lieferant).count()
    aktiv = db.query(Lieferant).filter(Lieferant.aktiv == True).count()
    inaktiv = total - aktiv
    
    return {
        "total": total,
        "aktiv": aktiv,
        "inaktiv": inaktiv
    }