"""
Bestellungen API Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from decimal import Decimal

from app.database import get_db
from app.models.bestellung import Bestellung, BestellPosition
from app.schemas.bestellung import (
    BestellungCreate,
    BestellungUpdate,
    BestellungResponse,
    BestellungListItem,
    BestellungStatusUpdate,
    BestellPositionCreate,
    BestellPositionUpdate
)

router = APIRouter(prefix="/api/bestellungen", tags=["Bestellungen"])


def generate_bestellnummer(db: Session) -> str:
    """Generiert eine eindeutige Bestellnummer"""
    heute = datetime.now()
    prefix = f"BEST-{heute.strftime('%Y%m%d')}"
    count = db.query(Bestellung).filter(
        Bestellung.bestellnummer.like(f"{prefix}%")
    ).count()
    return f"{prefix}-{count + 1:03d}"


@router.post("", status_code=201)
def create_bestellung(
    bestellung: BestellungCreate,
    db: Session = Depends(get_db)
):
    """Neue Bestellung erstellen"""
    bestellnummer = generate_bestellnummer(db)
    
    db_bestellung = Bestellung(
        bestellnummer=bestellnummer,
        lieferant_id=bestellung.lieferant_id,
        notizen=bestellung.notizen,
        interne_notizen=bestellung.interne_notizen,
        versandkosten=bestellung.versandkosten or Decimal("0.0"),
        status="entwurf"
    )
    
    gesamtpreis = Decimal("0.0")
    for pos in bestellung.positionen:
        pos_gesamtpreis = Decimal(str(pos.menge)) * pos.einzelpreis
        gesamtpreis += pos_gesamtpreis
        
        db_position = BestellPosition(
            artikel_id=pos.artikel_id,
            menge=pos.menge,
            einzelpreis=pos.einzelpreis,
            gesamtpreis=pos_gesamtpreis,
            notizen=pos.notizen
        )
        db_bestellung.positionen.append(db_position)
    
    db_bestellung.gesamtpreis = gesamtpreis + (bestellung.versandkosten or Decimal("0.0"))
    
    db.add(db_bestellung)
    db.commit()
    db.refresh(db_bestellung)
    
    return jsonable_encoder(db_bestellung)


@router.get("")
def get_bestellungen(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = None,
    lieferant_id: Optional[int] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = Query(None, regex="^(created_at|bestelldatum|gesamtpreis|bestellnummer|status)$"),
    sort_order: Optional[str] = Query("desc", regex="^(asc|desc)$"),
    db: Session = Depends(get_db)
):
    """Liste aller Bestellungen mit Suche und Sortierung"""
    from app.models.lieferant import Lieferant
    from app.models.artikel import Artikel
    
    query = db.query(Bestellung)
    
    # Status Filter
    if status:
        query = query.filter(Bestellung.status == status)
    
    # Lieferant Filter
    if lieferant_id:
        query = query.filter(Bestellung.lieferant_id == lieferant_id)
    
    # Suchfunktion
    if search:
        search_term = f"%{search}%"
        query = query.join(Bestellung.lieferant).filter(
            (Bestellung.bestellnummer.ilike(search_term)) |
            (Lieferant.name.ilike(search_term)) |
            (Bestellung.notizen.ilike(search_term))
        )
    
    # Sortierung
    if sort_by:
        sort_column = getattr(Bestellung, sort_by)
        if sort_order == "asc":
            query = query.order_by(sort_column.asc())
        else:
            query = query.order_by(sort_column.desc())
    else:
        # Default: neueste zuerst
        query = query.order_by(Bestellung.created_at.desc())
    
    total = query.count()
    bestellungen = query.offset(skip).limit(limit).all()
    
    return {
        "items": jsonable_encoder(bestellungen),
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/{bestellung_id}")
def get_bestellung(
    bestellung_id: int,
    db: Session = Depends(get_db)
):
    """Einzelne Bestellung"""
    bestellung = db.query(Bestellung).filter(Bestellung.id == bestellung_id).first()
    if not bestellung:
        raise HTTPException(status_code=404, detail="Bestellung nicht gefunden")
    return jsonable_encoder(bestellung)


@router.put("/{bestellung_id}")
def update_bestellung(
    bestellung_id: int,
    update: BestellungUpdate,
    db: Session = Depends(get_db)
):
    """Bestellung aktualisieren"""
    bestellung = db.query(Bestellung).filter(Bestellung.id == bestellung_id).first()
    if not bestellung:
        raise HTTPException(status_code=404, detail="Bestellung nicht gefunden")
    
    if update.status:
        bestellung.status = update.status
    if update.bestelldatum is not None:
        bestellung.bestelldatum = update.bestelldatum
    if update.lieferdatum_erwartet is not None:
        bestellung.lieferdatum_erwartet = update.lieferdatum_erwartet
    if update.lieferdatum_tatsaechlich is not None:
        bestellung.lieferdatum_tatsaechlich = update.lieferdatum_tatsaechlich
    if update.notizen is not None:
        bestellung.notizen = update.notizen
    if update.interne_notizen is not None:
        bestellung.interne_notizen = update.interne_notizen
    if update.versandkosten is not None:
        bestellung.versandkosten = update.versandkosten
        positionen_summe = sum(Decimal(str(pos.gesamtpreis)) for pos in bestellung.positionen)
        bestellung.gesamtpreis = positionen_summe + update.versandkosten
    
    db.commit()
    db.refresh(bestellung)
    return jsonable_encoder(bestellung)


@router.patch("/{bestellung_id}/status")
def update_bestellung_status(
    bestellung_id: int,
    status_update: BestellungStatusUpdate,
    db: Session = Depends(get_db)
):
    """Status der Bestellung ändern"""
    bestellung = db.query(Bestellung).filter(Bestellung.id == bestellung_id).first()
    if not bestellung:
        raise HTTPException(status_code=404, detail="Bestellung nicht gefunden")
    
    # Validiere Status-Übergang
    gueltige_status = ["entwurf", "bestellt", "teilgeliefert", "geliefert", "storniert"]
    if status_update.status not in gueltige_status:
        raise HTTPException(
            status_code=400, 
            detail=f"Ungültiger Status. Erlaubt: {', '.join(gueltige_status)}"
        )
    
    # Setze automatisch Bestelldatum wenn von entwurf -> bestellt
    if bestellung.status == "entwurf" and status_update.status == "bestellt":
        bestellung.bestelldatum = datetime.now()
    
    # Setze automatisch Lieferdatum wenn -> geliefert
    if status_update.status == "geliefert" and not bestellung.lieferdatum_tatsaechlich:
        bestellung.lieferdatum_tatsaechlich = datetime.now()
    
    bestellung.status = status_update.status
    
    db.commit()
    db.refresh(bestellung)
    return jsonable_encoder(bestellung)


@router.post("/{bestellung_id}/positionen")
def add_position(
    bestellung_id: int,
    position: BestellPositionCreate,
    db: Session = Depends(get_db)
):
    """Position zu bestehender Bestellung hinzufügen"""
    bestellung = db.query(Bestellung).filter(Bestellung.id == bestellung_id).first()
    if not bestellung:
        raise HTTPException(status_code=404, detail="Bestellung nicht gefunden")
    
    # Nur bei Entwürfen erlauben
    if bestellung.status != "entwurf":
        raise HTTPException(
            status_code=400, 
            detail="Positionen können nur bei Entwürfen hinzugefügt werden"
        )
    
    # Neue Position erstellen
    pos_gesamtpreis = Decimal(str(position.menge)) * position.einzelpreis
    db_position = BestellPosition(
        bestellung_id=bestellung_id,
        artikel_id=position.artikel_id,
        menge=position.menge,
        einzelpreis=position.einzelpreis,
        gesamtpreis=pos_gesamtpreis,
        notizen=position.notizen
    )
    
    db.add(db_position)
    
    # Gesamtpreis neu berechnen
    positionen_summe = sum(Decimal(str(pos.gesamtpreis)) for pos in bestellung.positionen)
    positionen_summe += pos_gesamtpreis
    bestellung.gesamtpreis = positionen_summe + bestellung.versandkosten
    
    db.commit()
    db.refresh(bestellung)
    return jsonable_encoder(bestellung)


@router.put("/{bestellung_id}/positionen/{position_id}")
def update_position(
    bestellung_id: int,
    position_id: int,
    update: BestellPositionUpdate,
    db: Session = Depends(get_db)
):
    """Einzelne Position aktualisieren"""
    bestellung = db.query(Bestellung).filter(Bestellung.id == bestellung_id).first()
    if not bestellung:
        raise HTTPException(status_code=404, detail="Bestellung nicht gefunden")
    
    position = db.query(BestellPosition).filter(
        BestellPosition.id == position_id,
        BestellPosition.bestellung_id == bestellung_id
    ).first()
    if not position:
        raise HTTPException(status_code=404, detail="Position nicht gefunden")
    
    # Nur bei Entwürfen Menge/Preis ändern erlauben
    if bestellung.status != "entwurf" and (update.menge or update.einzelpreis):
        raise HTTPException(
            status_code=400,
            detail="Menge und Preis können nur bei Entwürfen geändert werden"
        )
    
    # Update Felder
    if update.menge is not None:
        position.menge = update.menge
    if update.einzelpreis is not None:
        position.einzelpreis = update.einzelpreis
    if update.notizen is not None:
        position.notizen = update.notizen
    if update.menge_geliefert is not None:
        position.menge_geliefert = update.menge_geliefert
        position.geliefert = (position.menge_geliefert >= position.menge)
    
    # Gesamtpreis Position neu berechnen
    position.gesamtpreis = Decimal(str(position.menge)) * position.einzelpreis
    
    # Gesamtpreis Bestellung neu berechnen
    positionen_summe = sum(Decimal(str(pos.gesamtpreis)) for pos in bestellung.positionen)
    bestellung.gesamtpreis = positionen_summe + bestellung.versandkosten
    
    db.commit()
    db.refresh(position)
    return jsonable_encoder(position)


@router.delete("/{bestellung_id}/positionen/{position_id}", status_code=204)
def delete_position(
    bestellung_id: int,
    position_id: int,
    db: Session = Depends(get_db)
):
    """Position löschen"""
    bestellung = db.query(Bestellung).filter(Bestellung.id == bestellung_id).first()
    if not bestellung:
        raise HTTPException(status_code=404, detail="Bestellung nicht gefunden")
    
    # Nur bei Entwürfen erlauben
    if bestellung.status != "entwurf":
        raise HTTPException(
            status_code=400,
            detail="Positionen können nur bei Entwürfen gelöscht werden"
        )
    
    position = db.query(BestellPosition).filter(
        BestellPosition.id == position_id,
        BestellPosition.bestellung_id == bestellung_id
    ).first()
    if not position:
        raise HTTPException(status_code=404, detail="Position nicht gefunden")
    
    # Mindestens 1 Position muss bleiben
    if len(bestellung.positionen) <= 1:
        raise HTTPException(
            status_code=400,
            detail="Mindestens eine Position muss verbleiben"
        )
    
    db.delete(position)
    
    # Gesamtpreis neu berechnen
    positionen_summe = sum(
        Decimal(str(pos.gesamtpreis)) 
        for pos in bestellung.positionen 
        if pos.id != position_id
    )
    bestellung.gesamtpreis = positionen_summe + bestellung.versandkosten
    
    db.commit()
    return None


@router.post("/{bestellung_id}/wareneingang")
def wareneingang_buchen(
    bestellung_id: int,
    db: Session = Depends(get_db)
):
    """Wareneingang buchen"""
    bestellung = db.query(Bestellung).filter(Bestellung.id == bestellung_id).first()
    if not bestellung:
        raise HTTPException(status_code=404, detail="Bestellung nicht gefunden")
    
    for position in bestellung.positionen:
        if not position.geliefert:
            artikel = position.artikel
            artikel.bestand_lager += position.menge
            position.menge_geliefert = position.menge
            position.geliefert = True
    
    bestellung.status = "geliefert"
    bestellung.lieferdatum_tatsaechlich = datetime.now()
    
    db.commit()
    db.refresh(bestellung)
    return jsonable_encoder(bestellung)


@router.delete("/{bestellung_id}", status_code=204)
def delete_bestellung(
    bestellung_id: int,
    db: Session = Depends(get_db)
):
    """Bestellung löschen (nur Entwürfe)"""
    bestellung = db.query(Bestellung).filter(Bestellung.id == bestellung_id).first()
    if not bestellung:
        raise HTTPException(status_code=404, detail="Bestellung nicht gefunden")
    if bestellung.status != "entwurf":
        raise HTTPException(status_code=400, detail="Nur Entwürfe können gelöscht werden")
    
    db.delete(bestellung)
    db.commit()
    return None