"""
FastAPI Router für Artikel-Verwaltung
Endpoints: /api/artikel
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func
from typing import List, Optional
import math

from ..database import get_db
from ..models.artikel import Artikel
from ..models.artikel_lieferant import ArtikelLieferant
from ..models.bestand_historie import BestandHistorie
from ..schemas import artikel as schemas


router = APIRouter(prefix="/api/artikel", tags=["Artikel"])


# ═══════════════════════════════════════════════════════════
# GET /api/artikel - Liste mit Filter & Pagination
# ═══════════════════════════════════════════════════════════

@router.get("", response_model=schemas.ArtikelListResponse)
def get_artikel_liste(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="Seite"),
    page_size: int = Query(50, ge=1, le=100, description="Artikel pro Seite"),
    suche: Optional[str] = Query(None, description="Suche in Artikelnummer oder Bezeichnung"),
    kategorie_id: Optional[int] = Query(None, description="Filter nach Kategorie"),
    nur_aktive: bool = Query(True, description="Nur aktive Artikel"),
    unter_mindestbestand: bool = Query(False, description="Nur Artikel unter Mindestbestand"),
):
    """
    Gibt Artikel-Liste zurück mit:
    - Pagination
    - Suche (Artikelnummer, Bezeichnung)
    - Filter (Kategorie, Aktiv-Status, Mindestbestand)
    """
    # Base Query
    query = db.query(Artikel).options(
        joinedload(Artikel.kategorie),
        joinedload(Artikel.artikel_lieferanten).joinedload(ArtikelLieferant.lieferant)
    )
    
    # Filter: Nur aktive
    if nur_aktive:
        query = query.filter(Artikel.aktiv == True)
    
    # Filter: Kategorie
    if kategorie_id:
        query = query.filter(Artikel.kategorie_id == kategorie_id)
    
    # Filter: Suche
    if suche:
        search_pattern = f"%{suche}%"
        query = query.filter(
            or_(
                Artikel.artikelnummer.ilike(search_pattern),
                Artikel.bezeichnung.ilike(search_pattern)
            )
        )
    
    # Filter: Unter Mindestbestand
    if unter_mindestbestand:
        query = query.filter(
            (Artikel.bestand_lager + Artikel.bestand_werkstatt) < Artikel.mindestbestand
        )
    
    # Total count
    total = query.count()
    
    # Pagination
    offset = (page - 1) * page_size
    artikel = query.order_by(Artikel.artikelnummer).offset(offset).limit(page_size).all()
    
    # Hauptlieferant für jeden Artikel berechnen
    for art in artikel:
        # Hauptlieferant = bevorzugter Lieferant oder erster
        art.hauptlieferant = None
        if art.artikel_lieferanten:
            # Suche bevorzugten Lieferanten
            bevorzugt = next((al.lieferant for al in art.artikel_lieferanten if al.bevorzugt), None)
            if bevorzugt:
                art.hauptlieferant = bevorzugt
            else:
                # Fallback: erster Lieferant
                art.hauptlieferant = art.artikel_lieferanten[0].lieferant
    
    # Pages berechnen
    pages = math.ceil(total / page_size) if total > 0 else 1
    
    return schemas.ArtikelListResponse(
        items=[schemas.ArtikelResponse.model_validate(art) for art in artikel],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages
    )


# ═══════════════════════════════════════════════════════════
# GET /api/artikel/{id} - Einzelner Artikel
# ═══════════════════════════════════════════════════════════

@router.get("/{artikel_id}", response_model=schemas.ArtikelResponse)
def get_artikel(artikel_id: int, db: Session = Depends(get_db)):
    """Gibt einzelnen Artikel zurück"""
    artikel = db.query(Artikel).options(
        joinedload(Artikel.kategorie),
        joinedload(Artikel.artikel_lieferanten).joinedload(ArtikelLieferant.lieferant)
    ).filter(Artikel.id == artikel_id).first()
    
    if not artikel:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
    
    # Hauptlieferant = bevorzugter Lieferant oder erster
    artikel.hauptlieferant = None
    if artikel.artikel_lieferanten:
        # Suche bevorzugten Lieferanten
        bevorzugt = next((al.lieferant for al in artikel.artikel_lieferanten if al.bevorzugt), None)
        if bevorzugt:
            artikel.hauptlieferant = bevorzugt
        else:
            # Fallback: erster Lieferant
            artikel.hauptlieferant = artikel.artikel_lieferanten[0].lieferant
    
    return artikel


# ═══════════════════════════════════════════════════════════
# POST /api/artikel - Neuen Artikel anlegen
# ═══════════════════════════════════════════════════════════

@router.post("", response_model=schemas.ArtikelResponse, status_code=201)
def create_artikel(artikel_data: schemas.ArtikelCreate, db: Session = Depends(get_db)):
    """Legt neuen Artikel an"""
    
    # Prüfe ob Artikelnummer schon existiert
    existing = db.query(Artikel).filter(Artikel.artikelnummer == artikel_data.artikelnummer).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Artikelnummer '{artikel_data.artikelnummer}' existiert bereits")
    
    # Artikel erstellen
    artikel = Artikel(**artikel_data.model_dump())
    db.add(artikel)
    db.commit()
    db.refresh(artikel)
    
    return artikel


# ═══════════════════════════════════════════════════════════
# PUT /api/artikel/{id} - Artikel bearbeiten
# ═══════════════════════════════════════════════════════════

@router.put("/{artikel_id}", response_model=schemas.ArtikelResponse)
def update_artikel(
    artikel_id: int,
    artikel_data: schemas.ArtikelUpdate,
    db: Session = Depends(get_db)
):
    """Bearbeitet Artikel"""
    artikel = db.query(Artikel).filter(Artikel.id == artikel_id).first()
    if not artikel:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
    
    # Update nur gesetzte Felder
    update_data = artikel_data.model_dump(exclude_unset=True)
    
    # Prüfe Artikelnummer-Duplikat (falls geändert)
    if "artikelnummer" in update_data and update_data["artikelnummer"] != artikel.artikelnummer:
        existing = db.query(Artikel).filter(
            Artikel.artikelnummer == update_data["artikelnummer"],
            Artikel.id != artikel_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Artikelnummer '{update_data['artikelnummer']}' existiert bereits")
    
    # Update durchführen
    for field, value in update_data.items():
        setattr(artikel, field, value)
    
    db.commit()
    db.refresh(artikel)
    
    return artikel


# ═══════════════════════════════════════════════════════════
# DELETE /api/artikel/{id} - Artikel löschen
# ═══════════════════════════════════════════════════════════

@router.delete("/{artikel_id}", status_code=204)
def delete_artikel(artikel_id: int, db: Session = Depends(get_db)):
    """Löscht Artikel"""
    artikel = db.query(Artikel).filter(Artikel.id == artikel_id).first()
    if not artikel:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
    
    db.delete(artikel)
    db.commit()
    
    return None


# ═══════════════════════════════════════════════════════════
# POST /api/artikel/{id}/bestand - Bestand ändern
# ═══════════════════════════════════════════════════════════

@router.post("/{artikel_id}/bestand", response_model=schemas.ArtikelResponse)
def aendere_bestand(
    artikel_id: int,
    bestand_data: schemas.BestandAendern,
    db: Session = Depends(get_db)
):
    """
    Ändert Bestand eines Artikels und protokolliert die Änderung
    """
    artikel = db.query(Artikel).filter(Artikel.id == artikel_id).first()
    if not artikel:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
    
    # Bestand ändern
    if bestand_data.lager == "lager":
        neuer_bestand = artikel.bestand_lager + bestand_data.aenderung
        if neuer_bestand < 0:
            raise HTTPException(status_code=400, detail="Bestand kann nicht negativ werden")
        artikel.bestand_lager = neuer_bestand
    else:  # werkstatt
        neuer_bestand = artikel.bestand_werkstatt + bestand_data.aenderung
        if neuer_bestand < 0:
            raise HTTPException(status_code=400, detail="Bestand kann nicht negativ werden")
        artikel.bestand_werkstatt = neuer_bestand
    
    # Historie erstellen
    historie = BestandHistorie(
        artikel_id=artikel_id,
        aenderung=bestand_data.aenderung,
        lager=bestand_data.lager,
        grund=bestand_data.grund,
        notiz=bestand_data.notiz
    )
    db.add(historie)
    
    db.commit()
    db.refresh(artikel)
    
    return artikel


# ═══════════════════════════════════════════════════════════
# GET /api/artikel/next-nummer - Nächste Artikelnummer
# ═══════════════════════════════════════════════════════════

@router.get("/utils/next-nummer", response_model=schemas.NextNummerResponse)
def get_next_nummer(db: Session = Depends(get_db)):
    """
    Gibt nächste verfügbare Artikelnummer zurück
    Format: ART-00001, ART-00002, etc.
    """
    # Finde höchste Nummer
    result = db.query(
        func.max(func.cast(func.substr(Artikel.artikelnummer, 5), type_=int))
    ).filter(
        Artikel.artikelnummer.like("ART-%")
    ).scalar()
    
    naechste_nummer = (result or 0) + 1
    artikelnummer = f"ART-{naechste_nummer:05d}"
    
    return schemas.NextNummerResponse(
        artikelnummer=artikelnummer,
        naechste_nummer=naechste_nummer
    )