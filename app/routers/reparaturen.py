"""
Reparaturen API Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session, joinedload
from typing import Optional
from datetime import datetime
from decimal import Decimal

from app.database import get_db
from app.models.reparatur import Reparatur, ReparaturPosition
from app.models.artikel import Artikel
from app.schemas.reparatur import (
    ReparaturCreate,
    ReparaturUpdate,
    ReparaturResponse,
    ReparaturListItem,
    ReparaturStatusUpdate,
    ReparaturPositionCreate,
    ReparaturPositionUpdate
)
from app.utils.pdf_generator import generate_auftragszettel_pdf

router = APIRouter(prefix="/api/reparaturen", tags=["Reparaturen"])


def generate_auftragsnummer(db: Session, manual_number: Optional[str] = None) -> str:
    """
    Generiert Auftragsnummer
    - Wenn manual_number gegeben: Verwende diese (z.B. "8272" für Migration)
    - Sonst: Nehme höchste existierende Nummer + 1
    """
    if manual_number:
        # Prüfe ob Nummer schon existiert
        exists = db.query(Reparatur).filter(
            Reparatur.auftragsnummer == manual_number
        ).first()
        if exists:
            raise HTTPException(status_code=400, detail=f"Auftragsnummer {manual_number} existiert bereits")
        return manual_number
    
    # Auto-Generate: Finde höchste Nummer
    last = db.query(Reparatur).order_by(Reparatur.auftragsnummer.desc()).first()
    
    if not last:
        # Erste Reparatur ever
        return "1"
    
    try:
        # Versuche letzte Nummer als Int zu parsen und +1
        last_num = int(last.auftragsnummer)
        return str(last_num + 1)
    except ValueError:
        # Wenn letzte Nummer kein Int ist (z.B. "REP-123"), dann einfach Counter
        count = db.query(Reparatur).count()
        return str(count + 1)


@router.post("", status_code=201)
def create_reparatur(
    reparatur: ReparaturCreate,
    db: Session = Depends(get_db)
):
    """Neue Reparatur erstellen"""
    
    # Auftragsnummer generieren (manuell oder auto)
    auftragsnummer = generate_auftragsnummer(db, reparatur.auftragsnummer)
    
    # Reparatur erstellen
    db_reparatur = Reparatur(
        auftragsnummer=auftragsnummer,
        fahrradmarke=reparatur.fahrradmarke,
        fahrradmodell=reparatur.fahrradmodell,
        rahmennummer=reparatur.rahmennummer,
        schluesselnummer=reparatur.schluesselnummer,
        fahrrad_anwesend=reparatur.fahrrad_anwesend,
        # NEU: Kunde aus Datenbank ODER Legacy-Freitext
        kunde_id=reparatur.kunde_id if hasattr(reparatur, 'kunde_id') else None,
        kunde_name_legacy=reparatur.kunde_name if hasattr(reparatur, 'kunde_name') else None,
        kunde_telefon_legacy=reparatur.kunde_telefon if hasattr(reparatur, 'kunde_telefon') else None,
        kunde_email_legacy=reparatur.kunde_email if hasattr(reparatur, 'kunde_email') else None,
        maengelbeschreibung=reparatur.maengelbeschreibung,
        status=reparatur.status,
        fertig_bis=reparatur.fertig_bis,
        abholtermin=reparatur.abholtermin,
        kostenvoranschlag=reparatur.kostenvoranschlag,
        notizen=reparatur.notizen,
        endbetrag=Decimal("0.0")
    )
    
    # Positionen hinzufügen
    gesamtpreis = Decimal("0.0")
    for pos in reparatur.positionen:
        pos_gesamtpreis = Decimal(str(pos.menge)) * pos.einzelpreis
        gesamtpreis += pos_gesamtpreis
        
        db_position = ReparaturPosition(
            typ=pos.typ,
            artikel_id=pos.artikel_id,
            bezeichnung=pos.bezeichnung,
            beschreibung=pos.beschreibung,
            menge=pos.menge,
            einzelpreis=pos.einzelpreis,
            gesamtpreis=pos_gesamtpreis
        )
        db_reparatur.positionen.append(db_position)
    
    db_reparatur.endbetrag = gesamtpreis
    
    db.add(db_reparatur)
    db.commit()
    db.refresh(db_reparatur)
    
    return jsonable_encoder(db_reparatur)


@router.get("")
def get_reparaturen(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = Query(None, regex="^(auftragsnummer|reparaturdatum|fahrradmarke|status|endbetrag)$"),
    sort_order: Optional[str] = Query("desc", regex="^(asc|desc)$"),
    db: Session = Depends(get_db)
):
    """Liste aller Reparaturen mit Filter und Suche"""
    # WICHTIG: joinedload lädt Kunde mit (Eager Loading)
    query = db.query(Reparatur).options(joinedload(Reparatur.kunde))
    
    # Status Filter
    if status:
        query = query.filter(Reparatur.status == status)
    
    # Suchfunktion
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Reparatur.auftragsnummer.ilike(search_term)) |
            (Reparatur.fahrradmarke.ilike(search_term)) |
            (Reparatur.kunde_name_legacy.ilike(search_term)) |  # Legacy statt kunde_name
            (Reparatur.maengelbeschreibung.ilike(search_term))
        )
    
    # Sortierung
    if sort_by:
        sort_column = getattr(Reparatur, sort_by)
        if sort_order == "asc":
            query = query.order_by(sort_column.asc())
        else:
            query = query.order_by(sort_column.desc())
    else:
        # Default: neueste zuerst
        query = query.order_by(Reparatur.reparaturdatum.desc())
    
    total = query.count()
    reparaturen = query.offset(skip).limit(limit).all()
    
    return {
        "items": jsonable_encoder(reparaturen),
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/{reparatur_id}")
def get_reparatur(
    reparatur_id: int,
    db: Session = Depends(get_db)
):
    """Einzelne Reparatur mit allen Details"""
    # WICHTIG: joinedload lädt Positionen UND Kunde mit (Eager Loading)
    reparatur = db.query(Reparatur)\
        .options(joinedload(Reparatur.positionen), joinedload(Reparatur.kunde))\
        .filter(Reparatur.id == reparatur_id)\
        .first()
    
    if not reparatur:
        raise HTTPException(status_code=404, detail="Reparatur nicht gefunden")
    
    return jsonable_encoder(reparatur)


@router.put("/{reparatur_id}")
def update_reparatur(
    reparatur_id: int,
    reparatur_update: ReparaturUpdate,
    db: Session = Depends(get_db)
):
    """Reparatur aktualisieren"""
    db_reparatur = db.query(Reparatur).filter(Reparatur.id == reparatur_id).first()
    
    if not db_reparatur:
        raise HTTPException(status_code=404, detail="Reparatur nicht gefunden")
    
    # Update nur gesetzte Felder
    update_data = reparatur_update.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(db_reparatur, field, value)
    
    db.commit()
    db.refresh(db_reparatur)
    
    return jsonable_encoder(db_reparatur)


@router.patch("/{reparatur_id}/status")
def update_reparatur_status(
    reparatur_id: int,
    status_update: ReparaturStatusUpdate,
    db: Session = Depends(get_db)
):
    """Status schnell ändern mit Auto-Datums-Logik"""
    db_reparatur = db.query(Reparatur).filter(Reparatur.id == reparatur_id).first()
    
    if not db_reparatur:
        raise HTTPException(status_code=404, detail="Reparatur nicht gefunden")
    
    db_reparatur.status = status_update.status
    
    # Auto-Datums-Logik
    if status_update.status == 'fertig' and not db_reparatur.fertig_am:
        db_reparatur.fertig_am = datetime.now()
    
    if status_update.status == 'abgeholt':
        if not db_reparatur.abgeholt_am:
            db_reparatur.abgeholt_am = datetime.now()
        if not db_reparatur.bezahlt:
            # Optional: Auto-Bezahlt bei Abholung
            pass
    
    db.commit()
    db.refresh(db_reparatur)
    
    return jsonable_encoder(db_reparatur)


@router.delete("/{reparatur_id}")
def delete_reparatur(
    reparatur_id: int,
    db: Session = Depends(get_db)
):
    """Reparatur löschen"""
    db_reparatur = db.query(Reparatur).filter(Reparatur.id == reparatur_id).first()
    
    if not db_reparatur:
        raise HTTPException(status_code=404, detail="Reparatur nicht gefunden")
    
    db.delete(db_reparatur)
    db.commit()
    
    return {"message": "Reparatur gelöscht"}


@router.get("/{reparatur_id}/print")
def print_auftragszettel(
    reparatur_id: int,
    db: Session = Depends(get_db)
):
    """
    PDF-Download für Auftragszettel
    
    Generiert PDF mit 2 identischen Zetteln auf einer A4-Seite (Querformat)
    - Vorderseite: 2x Auftragsdetails
    - Rückseite: Notizen-Linien
    
    Args:
        reparatur_id: ID der Reparatur
        
    Returns:
        PDF als StreamingResponse
        
    Raises:
        404: Wenn Reparatur nicht gefunden
        500: Bei PDF-Generierungs-Fehler
    """
    try:
        pdf_buffer = generate_auftragszettel_pdf(reparatur_id, db)
        
        # Dateiname mit Auftragsnummer
        rep = db.query(Reparatur).filter(Reparatur.id == reparatur_id).first()
        filename = f"Auftrag_{rep.auftragsnummer if rep else reparatur_id}.pdf"
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"inline; filename={filename}"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Erstellen des PDFs: {str(e)}"
        )


# ============================================================================
# Positionen Management
# ============================================================================

@router.post("/{reparatur_id}/positionen", status_code=201)
def add_position(
    reparatur_id: int,
    position: ReparaturPositionCreate,
    db: Session = Depends(get_db)
):
    """Position zur Reparatur hinzufügen"""
    db_reparatur = db.query(Reparatur).filter(Reparatur.id == reparatur_id).first()
    
    if not db_reparatur:
        raise HTTPException(status_code=404, detail="Reparatur nicht gefunden")
    
    # Wenn Ersatzteil mit Artikel-ID: Bestand prüfen & reduzieren
    if position.typ == 'teil' and position.artikel_id:
        artikel = db.query(Artikel).filter(Artikel.id == position.artikel_id).first()
        
        if not artikel:
            raise HTTPException(status_code=404, detail=f"Artikel mit ID {position.artikel_id} nicht gefunden")
        
        # Bestand prüfen (Werkstatt hat Priorität)
        verfuegbar_werkstatt = artikel.bestand_werkstatt or 0
        verfuegbar_lager = artikel.bestand_lager or 0
        verfuegbar_gesamt = verfuegbar_werkstatt + verfuegbar_lager
        
        if verfuegbar_gesamt < position.menge:
            raise HTTPException(
                status_code=400,
                detail=f"Nicht genügend Bestand! Verfügbar: {verfuegbar_gesamt} (Werkstatt: {verfuegbar_werkstatt}, Lager: {verfuegbar_lager})"
            )
        
        # Bestand reduzieren (erst Werkstatt, dann Lager)
        menge_abzug = position.menge
        
        if verfuegbar_werkstatt >= menge_abzug:
            # Alles aus Werkstatt
            artikel.bestand_werkstatt -= menge_abzug
        else:
            # Werkstatt leeren, Rest aus Lager
            artikel.bestand_werkstatt = 0
            rest = menge_abzug - verfuegbar_werkstatt
            artikel.bestand_lager -= rest
        
        # bestand_gesamt wird automatisch berechnet (ist eine Property)
    
    # Position erstellen
    pos_gesamtpreis = Decimal(str(position.menge)) * position.einzelpreis
    
    db_position = ReparaturPosition(
        reparatur_id=reparatur_id,
        typ=position.typ,
        artikel_id=position.artikel_id,
        bezeichnung=position.bezeichnung,
        beschreibung=position.beschreibung,
        menge=position.menge,
        einzelpreis=position.einzelpreis,
        gesamtpreis=pos_gesamtpreis
    )
    
    db.add(db_position)
    
    # Endbetrag neu berechnen
    db_reparatur.endbetrag = (db_reparatur.endbetrag or Decimal("0")) + pos_gesamtpreis
    
    db.commit()
    db.refresh(db_position)
    
    # Gib die erstellte Position zurück
    return jsonable_encoder(db_position)


@router.put("/{reparatur_id}/positionen/{position_id}")
def update_position(
    reparatur_id: int,
    position_id: int,
    position_update: ReparaturPositionUpdate,
    db: Session = Depends(get_db)
):
    """Position bearbeiten"""
    db_position = db.query(ReparaturPosition).filter(
        ReparaturPosition.id == position_id,
        ReparaturPosition.reparatur_id == reparatur_id
    ).first()
    
    if not db_position:
        raise HTTPException(status_code=404, detail="Position nicht gefunden")
    
    # Alten Gesamtpreis & Menge merken
    alter_gesamtpreis = db_position.gesamtpreis
    alte_menge = db_position.menge
    
    # Bei Ersatzteil mit Artikel: Bestand anpassen wenn Menge sich ändert
    if db_position.typ == 'teil' and db_position.artikel_id and 'menge' in position_update.dict(exclude_unset=True):
        neue_menge = position_update.menge
        differenz = neue_menge - alte_menge
        
        if differenz != 0:
            artikel = db.query(Artikel).filter(Artikel.id == db_position.artikel_id).first()
            
            if artikel:
                if differenz > 0:
                    # Mehr benötigt: Bestand reduzieren
                    verfuegbar = (artikel.bestand_werkstatt or 0) + (artikel.bestand_lager or 0)
                    
                    if verfuegbar < differenz:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Nicht genügend Bestand! Benötigt: {differenz}, Verfügbar: {verfuegbar}"
                        )
                    
                    # Bestand reduzieren
                    if artikel.bestand_werkstatt >= differenz:
                        artikel.bestand_werkstatt -= differenz
                    else:
                        rest = differenz - (artikel.bestand_werkstatt or 0)
                        artikel.bestand_werkstatt = 0
                        artikel.bestand_lager -= rest
                else:
                    # Weniger benötigt: Bestand erhöhen
                    artikel.bestand_werkstatt = (artikel.bestand_werkstatt or 0) + abs(differenz)
                
                # bestand_gesamt wird automatisch berechnet
    
    # Update
    update_data = position_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_position, field, value)
    
    # Gesamtpreis neu berechnen
    db_position.gesamtpreis = db_position.menge * db_position.einzelpreis
    
    # Endbetrag der Reparatur anpassen
    db_reparatur = db_position.reparatur
    db_reparatur.endbetrag = (db_reparatur.endbetrag or Decimal("0")) - alter_gesamtpreis + db_position.gesamtpreis
    
    db.commit()
    db.refresh(db_position)
    
    return jsonable_encoder(db_position.reparatur)


@router.delete("/{reparatur_id}/positionen/{position_id}")
def delete_position(
    reparatur_id: int,
    position_id: int,
    db: Session = Depends(get_db)
):
    """Position löschen"""
    db_position = db.query(ReparaturPosition).filter(
        ReparaturPosition.id == position_id,
        ReparaturPosition.reparatur_id == reparatur_id
    ).first()
    
    if not db_position:
        raise HTTPException(status_code=404, detail="Position nicht gefunden")
    
    # Wenn Ersatzteil mit Artikel: Bestand zurückgeben
    if db_position.typ == 'teil' and db_position.artikel_id:
        artikel = db.query(Artikel).filter(Artikel.id == db_position.artikel_id).first()
        
        if artikel:
            # Bestand zur Werkstatt zurückgeben
            artikel.bestand_werkstatt = (artikel.bestand_werkstatt or 0) + db_position.menge
            # bestand_gesamt wird automatisch berechnet
    
    # Endbetrag anpassen
    db_reparatur = db_position.reparatur
    db_reparatur.endbetrag = (db_reparatur.endbetrag or Decimal("0")) - db_position.gesamtpreis
    
    db.delete(db_position)
    db.commit()
    
    return {"message": "Position gelöscht"}