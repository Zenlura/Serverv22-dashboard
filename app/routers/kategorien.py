"""
Kategorien API Router
Session 1.5
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.kategorie import Kategorie
from app.schemas.kategorie import (
    KategorieCreate,
    KategorieUpdate,
    KategorieResponse,
    KategorieListItem,
    KategorieTree
)

router = APIRouter(prefix="/api/kategorien", tags=["Kategorien"])


def build_tree(kategorien: List[Kategorie], parent_id: Optional[int] = None) -> List[KategorieTree]:
    """
    Rekursive Funktion zum Aufbauen eines Kategorie-Baums
    """
    tree = []
    for kategorie in kategorien:
        if kategorie.parent_id == parent_id:
            children = build_tree(kategorien, kategorie.id)
            tree.append(
                KategorieTree(
                    id=kategorie.id,
                    name=kategorie.name,
                    beschreibung=kategorie.beschreibung,
                    parent_id=kategorie.parent_id,
                    children=children
                )
            )
    return tree


@router.get("", response_model=List[KategorieListItem])
def get_kategorien(
    skip: int = Query(0, ge=0, description="Anzahl zu überspringen"),
    limit: int = Query(100, ge=1, le=1000, description="Max. Anzahl Ergebnisse"),
    parent_id: Optional[int] = Query(None, description="Filter nach parent_id (None = Hauptkategorien)"),
    search: Optional[str] = Query(None, description="Suche in Name, Beschreibung"),
    db: Session = Depends(get_db)
):
    """
    Liste aller Kategorien (flach)
    
    - **skip**: Pagination
    - **limit**: Max. Anzahl Ergebnisse
    - **parent_id**: Filter nach Elternkategorie (None = nur Hauptkategorien)
    - **search**: Volltextsuche
    """
    query = db.query(Kategorie)
    
    # Filter: Parent
    if parent_id is not None:
        query = query.filter(Kategorie.parent_id == parent_id)
    
    # Filter: Suche
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Kategorie.name.ilike(search_pattern)) |
            (Kategorie.beschreibung.ilike(search_pattern))
        )
    
    # Sortierung
    query = query.order_by(Kategorie.name)
    
    # Pagination
    kategorien = query.offset(skip).limit(limit).all()
    
    return kategorien


@router.get("/tree", response_model=List[KategorieTree])
def get_kategorien_tree(
    db: Session = Depends(get_db)
):
    """
    Alle Kategorien als hierarchischer Baum
    
    Gibt die komplette Kategorie-Hierarchie zurück mit verschachtelten Children.
    """
    # Alle Kategorien laden
    kategorien = db.query(Kategorie).order_by(Kategorie.name).all()
    
    # Baum aufbauen (nur Root-Elemente, Children rekursiv)
    tree = build_tree(kategorien, parent_id=None)
    
    return tree


@router.post("", response_model=KategorieResponse, status_code=201)
def create_kategorie(
    kategorie_data: KategorieCreate,
    db: Session = Depends(get_db)
):
    """
    Neue Kategorie anlegen
    
    - **name**: Pflichtfeld
    - **parent_id**: Optional - wenn gesetzt, wird Unterkategorie erstellt
    """
    # Prüfen ob Name schon existiert (auf gleicher Ebene)
    existing = db.query(Kategorie).filter(
        Kategorie.name == kategorie_data.name,
        Kategorie.parent_id == kategorie_data.parent_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Kategorie '{kategorie_data.name}' existiert bereits auf dieser Ebene"
        )
    
    # Parent-ID validieren falls gesetzt
    if kategorie_data.parent_id:
        parent = db.query(Kategorie).filter(Kategorie.id == kategorie_data.parent_id).first()
        if not parent:
            raise HTTPException(
                status_code=404,
                detail=f"Parent-Kategorie mit ID {kategorie_data.parent_id} nicht gefunden"
            )
    
    # Neue Kategorie erstellen
    kategorie = Kategorie(**kategorie_data.model_dump())
    db.add(kategorie)
    db.commit()
    db.refresh(kategorie)
    
    return kategorie


@router.get("/{kategorie_id}", response_model=KategorieResponse)
def get_kategorie(
    kategorie_id: int,
    db: Session = Depends(get_db)
):
    """
    Einzelne Kategorie abrufen
    """
    kategorie = db.query(Kategorie).filter(Kategorie.id == kategorie_id).first()
    
    if not kategorie:
        raise HTTPException(
            status_code=404,
            detail=f"Kategorie mit ID {kategorie_id} nicht gefunden"
        )
    
    return kategorie


@router.get("/{kategorie_id}/children", response_model=List[KategorieListItem])
def get_kategorie_children(
    kategorie_id: int,
    db: Session = Depends(get_db)
):
    """
    Alle direkten Unterkategorien einer Kategorie
    """
    # Prüfen ob Kategorie existiert
    kategorie = db.query(Kategorie).filter(Kategorie.id == kategorie_id).first()
    if not kategorie:
        raise HTTPException(
            status_code=404,
            detail=f"Kategorie mit ID {kategorie_id} nicht gefunden"
        )
    
    # Unterkategorien laden
    children = db.query(Kategorie).filter(
        Kategorie.parent_id == kategorie_id
    ).order_by(Kategorie.name).all()
    
    return children


@router.put("/{kategorie_id}", response_model=KategorieResponse)
def update_kategorie(
    kategorie_id: int,
    kategorie_data: KategorieUpdate,
    db: Session = Depends(get_db)
):
    """
    Kategorie bearbeiten
    
    - Alle Felder optional
    - parent_id kann geändert werden (Kategorie verschieben)
    """
    # Kategorie finden
    kategorie = db.query(Kategorie).filter(Kategorie.id == kategorie_id).first()
    
    if not kategorie:
        raise HTTPException(
            status_code=404,
            detail=f"Kategorie mit ID {kategorie_id} nicht gefunden"
        )
    
    # Prüfen ob neuer Name auf gleicher Ebene schon existiert
    if kategorie_data.name:
        new_parent_id = kategorie_data.parent_id if kategorie_data.parent_id is not None else kategorie.parent_id
        existing = db.query(Kategorie).filter(
            Kategorie.name == kategorie_data.name,
            Kategorie.parent_id == new_parent_id,
            Kategorie.id != kategorie_id
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Kategorie '{kategorie_data.name}' existiert bereits auf dieser Ebene"
            )
    
    # Parent-ID validieren falls geändert
    if kategorie_data.parent_id:
        # Prüfen ob Parent existiert
        parent = db.query(Kategorie).filter(Kategorie.id == kategorie_data.parent_id).first()
        if not parent:
            raise HTTPException(
                status_code=404,
                detail=f"Parent-Kategorie mit ID {kategorie_data.parent_id} nicht gefunden"
            )
        
        # Prüfen ob Zirkel-Referenz (Kategorie kann nicht ihr eigenes Parent sein)
        if kategorie_data.parent_id == kategorie_id:
            raise HTTPException(
                status_code=400,
                detail="Kategorie kann nicht ihr eigenes Parent sein"
            )
        
        # TODO: Tiefere Zirkel-Prüfung (Parent of Parent etc.)
    
    # Felder aktualisieren
    update_data = kategorie_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(kategorie, field, value)
    
    db.commit()
    db.refresh(kategorie)
    
    return kategorie


@router.delete("/{kategorie_id}", status_code=204)
def delete_kategorie(
    kategorie_id: int,
    db: Session = Depends(get_db)
):
    """
    Kategorie löschen
    
    ⚠️ ACHTUNG: 
    - Löscht auch alle Unterkategorien (CASCADE)
    - Artikel werden NICHT gelöscht, nur kategorie_id wird NULL
    """
    kategorie = db.query(Kategorie).filter(Kategorie.id == kategorie_id).first()
    
    if not kategorie:
        raise HTTPException(
            status_code=404,
            detail=f"Kategorie mit ID {kategorie_id} nicht gefunden"
        )
    
    # Prüfen ob Unterkategorien existieren
    children_count = db.query(Kategorie).filter(Kategorie.parent_id == kategorie_id).count()
    if children_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Kategorie hat {children_count} Unterkategorien. Bitte erst diese löschen."
        )
    
    # TODO: Prüfen ob Artikel mit dieser Kategorie verknüpft sind?
    
    db.delete(kategorie)
    db.commit()
    
    return None


@router.get("/stats/count")
def get_kategorien_stats(
    db: Session = Depends(get_db)
):
    """
    Statistiken über Kategorien
    """
    total = db.query(Kategorie).count()
    hauptkategorien = db.query(Kategorie).filter(Kategorie.parent_id == None).count()
    unterkategorien = total - hauptkategorien
    
    return {
        "total": total,
        "hauptkategorien": hauptkategorien,
        "unterkategorien": unterkategorien
    }
