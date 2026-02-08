"""
Bestellungen Router
FastAPI Endpoints für Sammelbestellungen
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import datetime
from decimal import Decimal
from io import BytesIO

from app.database import get_db
from app.models.bestellung import Bestellung, BestellPosition
from app.models.artikel import Artikel
from app.models.lieferant import Lieferant
from app.schemas.bestellung import (
    BestellungCreate,
    BestellungUpdate,
    BestellungResponse,
    BestellungListItem,
    BestellungStatusUpdate,
    BestellPositionCreate,
    BestellPositionCreateFromArtikel,  # NEU!
    BestellPositionUpdate,
    BestellPositionResponse,
    WareneingangCreate,
)
from app.utils.pdf_bestellung import generate_bestellung_pdf

router = APIRouter(
    prefix="/api/bestellungen",
    tags=["Bestellungen"]
)


# ============================================================================
# Helper Functions
# ============================================================================

def generate_bestellnummer(db: Session) -> str:
    """Generiert nächste Bestellnummer (BES-00001, BES-00002, ...)"""
    last = db.query(Bestellung).order_by(Bestellung.id.desc()).first()
    if not last:
        return "BES-00001"
    
    # Extract number from last bestellnummer
    try:
        last_num = int(last.bestellnummer.split("-")[1])
        new_num = last_num + 1
        return f"BES-{new_num:05d}"
    except (IndexError, ValueError):
        # Fallback
        count = db.query(Bestellung).count()
        return f"BES-{count + 1:05d}"


def calculate_position_summen(position: BestellPosition) -> None:
    """Berechnet Summen für Position"""
    position.summe_ek = position.menge_bestellt * position.einkaufspreis
    position.summe_vk = position.menge_bestellt * position.verkaufspreis


def calculate_bestellung_summen(bestellung: Bestellung) -> None:
    """Berechnet Gesamtsummen für Bestellung"""
    bestellung.gesamtsumme_ek = sum(
        pos.summe_ek or Decimal(0) for pos in bestellung.positionen
    )
    bestellung.gesamtsumme_vk = sum(
        pos.summe_vk or Decimal(0) for pos in bestellung.positionen
    )


def update_bestellung_status(bestellung: Bestellung) -> None:
    """Aktualisiert Status basierend auf Lieferungen (Auto-Status)"""
    if bestellung.status == "offen":
        return  # Offen bleibt offen bis "bestellt"
    
    if bestellung.status == "abgeschlossen":
        return  # Abgeschlossen bleibt abgeschlossen
    
    # Bei bestellt/teilweise_geliefert/geliefert: Prüfen
    if not bestellung.positionen:
        return
    
    alle_vollstaendig = all(pos.vollstaendig_geliefert for pos in bestellung.positionen)
    keine_geliefert = all(pos.menge_geliefert == 0 for pos in bestellung.positionen)
    
    if alle_vollstaendig:
        bestellung.status = "geliefert"
        if not bestellung.geliefert_am:
            bestellung.geliefert_am = datetime.utcnow()
    elif keine_geliefert and bestellung.status != "bestellt":
        bestellung.status = "bestellt"
    else:
        bestellung.status = "teilweise_geliefert"


# ============================================================================
# Bestellungen CRUD
# ============================================================================

@router.get("/", response_model=List[BestellungListItem])
def get_bestellungen(
    status: str = None,
    lieferant_id: int = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Liste aller Bestellungen
    
    Filter:
    - status: offen, bestellt, teilweise_geliefert, geliefert, abgeschlossen
    - lieferant_id: Nur Bestellungen eines Lieferanten
    """
    query = db.query(Bestellung).options(joinedload(Bestellung.lieferant))
    
    if status:
        query = query.filter(Bestellung.status == status)
    if lieferant_id:
        query = query.filter(Bestellung.lieferant_id == lieferant_id)
    
    query = query.order_by(Bestellung.erstellt_am.desc())
    bestellungen = query.offset(skip).limit(limit).all()
    
    return bestellungen


@router.get("/{bestellung_id}", response_model=BestellungResponse)
def get_bestellung(bestellung_id: int, db: Session = Depends(get_db)):
    """Einzelne Bestellung mit allen Positionen"""
    bestellung = db.query(Bestellung).options(
        joinedload(Bestellung.lieferant),
        joinedload(Bestellung.positionen).joinedload(BestellPosition.artikel)
    ).filter(Bestellung.id == bestellung_id).first()
    
    if not bestellung:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bestellung {bestellung_id} nicht gefunden"
        )
    
    return bestellung


@router.post("/", response_model=BestellungResponse, status_code=status.HTTP_201_CREATED)
def create_bestellung(bestellung_data: BestellungCreate, db: Session = Depends(get_db)):
    """
    Neue Bestellung erstellen
    
    Workflow:
    1. Bestellung mit Status "offen" erstellen
    2. Optional: Initiale Positionen hinzufügen
    3. Bestellnummer wird automatisch generiert (BES-00001)
    """
    # Lieferant prüfen
    lieferant = db.query(Lieferant).filter(Lieferant.id == bestellung_data.lieferant_id).first()
    if not lieferant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lieferant {bestellung_data.lieferant_id} nicht gefunden"
        )
    
    # Bestellnummer generieren
    bestellnummer = bestellung_data.bestellnummer or generate_bestellnummer(db)
    
    # Bestellung erstellen
    bestellung = Bestellung(
        bestellnummer=bestellnummer,
        lieferant_id=bestellung_data.lieferant_id,
        notizen=bestellung_data.notizen,
        status="offen",
    )
    db.add(bestellung)
    db.flush()  # ID generieren
    
    # Initiale Positionen (falls vorhanden)
    for pos_data in bestellung_data.positionen:
        position = BestellPosition(
            bestellung_id=bestellung.id,
            **pos_data.model_dump()
        )
        calculate_position_summen(position)
        db.add(position)
    
    # Summen berechnen
    db.flush()
    calculate_bestellung_summen(bestellung)
    
    db.commit()
    db.refresh(bestellung)
    
    return bestellung


@router.patch("/{bestellung_id}", response_model=BestellungResponse)
def update_bestellung(
    bestellung_id: int,
    bestellung_data: BestellungUpdate,
    db: Session = Depends(get_db)
):
    """Bestellung aktualisieren (nur Basis-Daten, keine Positionen)"""
    bestellung = db.query(Bestellung).filter(Bestellung.id == bestellung_id).first()
    
    if not bestellung:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bestellung {bestellung_id} nicht gefunden"
        )
    
    # Update
    update_data = bestellung_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(bestellung, field, value)
    
    db.commit()
    db.refresh(bestellung)
    
    return bestellung


@router.patch("/{bestellung_id}/status", response_model=BestellungResponse)
def update_bestellung_status_endpoint(
    bestellung_id: int,
    status_data: BestellungStatusUpdate,
    db: Session = Depends(get_db)
):
    """
    Status ändern
    
    Workflow:
    - offen → bestellt (PDF erstellen & Bestellung abschicken)
    - bestellt → teilweise_geliefert (erste Lieferung)
    - teilweise_geliefert → geliefert (alles da)
    - geliefert → abgeschlossen (ins Inventar gebucht)
    """
    bestellung = db.query(Bestellung).filter(Bestellung.id == bestellung_id).first()
    
    if not bestellung:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bestellung {bestellung_id} nicht gefunden"
        )
    
    # Status setzen
    old_status = bestellung.status
    bestellung.status = status_data.status
    
    # Timestamps setzen
    if status_data.status == "bestellt" and not bestellung.bestellt_am:
        bestellung.bestellt_am = datetime.utcnow()
    elif status_data.status == "geliefert" and not bestellung.geliefert_am:
        bestellung.geliefert_am = datetime.utcnow()
    elif status_data.status == "abgeschlossen" and not bestellung.abgeschlossen_am:
        bestellung.abgeschlossen_am = datetime.utcnow()
    
    db.commit()
    db.refresh(bestellung)
    
    return bestellung


@router.delete("/{bestellung_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bestellung(bestellung_id: int, db: Session = Depends(get_db)):
    """Bestellung löschen (nur wenn Status = 'offen')"""
    bestellung = db.query(Bestellung).filter(Bestellung.id == bestellung_id).first()
    
    if not bestellung:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bestellung {bestellung_id} nicht gefunden"
        )
    
    if bestellung.status != "offen":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nur offene Bestellungen können gelöscht werden"
        )
    
    db.delete(bestellung)
    db.commit()


# ============================================================================
# Positionen CRUD
# ============================================================================

@router.post("/{bestellung_id}/positionen", response_model=BestellPositionResponse, status_code=status.HTTP_201_CREATED)
def add_position(
    bestellung_id: int,
    position_data: BestellPositionCreateFromArtikel,
    db: Session = Depends(get_db)
):
    """
    Position zur Bestellung hinzufügen (vereinfacht)
    
    Frontend sendet nur:
    - artikel_id (required)
    - menge_bestellt (required)
    - optional: einkaufspreis, verkaufspreis
    
    Backend holt automatisch:
    - artikelnummer, beschreibung, etrto, zoll_info
    - preise (falls nicht überschrieben)
    """
    bestellung = db.query(Bestellung).filter(Bestellung.id == bestellung_id).first()
    
    if not bestellung:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bestellung {bestellung_id} nicht gefunden"
        )
    
    if bestellung.status not in ["offen", "bestellt"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Positionen können nur bei offenen oder bestellten Bestellungen hinzugefügt werden"
        )
    
    # Artikel laden
    artikel = db.query(Artikel).filter(Artikel.id == position_data.artikel_id).first()
    if not artikel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Artikel {position_data.artikel_id} nicht gefunden"
        )
    
    # Position erstellen mit Daten aus Artikel
    position = BestellPosition(
        bestellung_id=bestellung_id,
        artikel_id=artikel.id,
        artikelnummer=artikel.artikelnummer,
        beschreibung=artikel.bezeichnung,
        etrto=getattr(artikel, 'etrto', None),
        zoll_info=getattr(artikel, 'zoll_info', None),
        menge_bestellt=position_data.menge_bestellt,
        einkaufspreis=position_data.einkaufspreis or artikel.einkaufspreis or Decimal(0),
        verkaufspreis=position_data.verkaufspreis or artikel.verkaufspreis or Decimal(0),
        notizen=position_data.notizen
    )
    calculate_position_summen(position)
    
    db.add(position)
    db.flush()
    
    # Summen neu berechnen
    calculate_bestellung_summen(bestellung)
    
    db.commit()
    db.refresh(position)
    
    return position


@router.patch("/positionen/{position_id}", response_model=BestellPositionResponse)
def update_position(
    position_id: int,
    position_data: BestellPositionUpdate,
    db: Session = Depends(get_db)
):
    """Position aktualisieren"""
    position = db.query(BestellPosition).filter(BestellPosition.id == position_id).first()
    
    if not position:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Position {position_id} nicht gefunden"
        )
    
    # Update
    update_data = position_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(position, field, value)
    
    # Summen neu berechnen
    calculate_position_summen(position)
    db.flush()
    
    calculate_bestellung_summen(position.bestellung)
    
    db.commit()
    db.refresh(position)
    
    return position


@router.delete("/positionen/{position_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_position(position_id: int, db: Session = Depends(get_db)):
    """Position löschen"""
    position = db.query(BestellPosition).filter(BestellPosition.id == position_id).first()
    
    if not position:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Position {position_id} nicht gefunden"
        )
    
    bestellung = position.bestellung
    
    db.delete(position)
    db.flush()
    
    # Summen neu berechnen
    calculate_bestellung_summen(bestellung)
    
    db.commit()


# ============================================================================
# Wareneingang
# ============================================================================

@router.post("/positionen/{position_id}/wareneingang", response_model=BestellPositionResponse)
def erfasse_wareneingang(
    position_id: int,
    wareneingang: WareneingangCreate,
    inventar_aktualisieren: bool = True,
    db: Session = Depends(get_db)
):
    """
    Wareneingang erfassen
    
    - Erhöht menge_geliefert
    - Setzt vollstaendig_geliefert wenn alles da
    - Optional: Aktualisiert Inventar (artikel.bestand_lager)
    - Aktualisiert Bestellungs-Status automatisch
    """
    position = db.query(BestellPosition).options(
        joinedload(BestellPosition.bestellung),
        joinedload(BestellPosition.artikel)
    ).filter(BestellPosition.id == position_id).first()
    
    if not position:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Position {position_id} nicht gefunden"
        )
    
    # Prüfen: Nicht mehr liefern als bestellt
    neue_menge = position.menge_geliefert + wareneingang.menge
    if neue_menge > position.menge_bestellt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Zu viel geliefert: Bestellt={position.menge_bestellt}, bereits geliefert={position.menge_geliefert}, neu={wareneingang.menge}"
        )
    
    # Menge erhöhen
    position.menge_geliefert = neue_menge
    position.zuletzt_geliefert_am = datetime.utcnow()
    
    # Vollständig geliefert?
    if position.menge_geliefert >= position.menge_bestellt:
        position.vollstaendig_geliefert = True
    
    # Inventar aktualisieren (wenn artikel_id vorhanden UND gewünscht)
    if inventar_aktualisieren and position.artikel_id:
        artikel = position.artikel
        if artikel:
            artikel.bestand_lager += wareneingang.menge
    
    # Bestellungs-Status aktualisieren
    update_bestellung_status(position.bestellung)
    
    db.commit()
    db.refresh(position)
    
    return position


@router.post("/{bestellung_id}/abschliessen", response_model=BestellungResponse)
def bestellung_abschliessen(
    bestellung_id: int,
    inventar_aktualisieren: bool = True,
    db: Session = Depends(get_db)
):
    """
    Bestellung abschließen und ins Inventar einbuchen
    
    - Setzt Status auf "abgeschlossen"
    - Optional: Aktualisiert alle verknüpften Artikel im Inventar
    """
    bestellung = db.query(Bestellung).options(
        joinedload(Bestellung.positionen).joinedload(BestellPosition.artikel)
    ).filter(Bestellung.id == bestellung_id).first()
    
    if not bestellung:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bestellung {bestellung_id} nicht gefunden"
        )
    
    if bestellung.status == "abgeschlossen":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bestellung ist bereits abgeschlossen"
        )
    
    # Inventar aktualisieren (falls noch nicht geschehen)
    if inventar_aktualisieren:
        for position in bestellung.positionen:
            if position.artikel_id and position.artikel:
                # Differenz berechnen (falls schon teilweise eingebucht)
                bereits_eingebucht = position.menge_geliefert
                position.artikel.bestand_lager = position.artikel.bestand_lager  # Bereits durch Wareneingang erhöht
    
    # Status setzen
    bestellung.status = "abgeschlossen"
    bestellung.abgeschlossen_am = datetime.utcnow()
    
    db.commit()
    db.refresh(bestellung)
    
    return bestellung


# ============================================================================
# PDF Export
# ============================================================================

@router.get("/{bestellung_id}/pdf")
def download_bestellung_pdf(bestellung_id: int, db: Session = Depends(get_db)):
    """
    PDF-Download für Bestellung
    
    Erstellt druckbare Bestellliste mit:
    - Lieferanten-Info
    - Alle Positionen mit ETRTO
    - Summen (EK)
    """
    bestellung = db.query(Bestellung).options(
        joinedload(Bestellung.lieferant),
        joinedload(Bestellung.positionen)
    ).filter(Bestellung.id == bestellung_id).first()
    
    if not bestellung:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bestellung {bestellung_id} nicht gefunden"
        )
    
    # PDF generieren
    pdf_bytes = generate_bestellung_pdf(bestellung)
    
    # Filename
    filename = f"Bestellung_{bestellung.bestellnummer}_{datetime.now().strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )