from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, desc
from typing import List, Optional
from datetime import datetime, date

from app.database import get_db
from app.models.kunde import Kunde, KundenWarnung
from app.schemas.kunde import (
    KundeCreate, KundeUpdate, KundeResponse, KundeDetail, 
    KundeListItem, KundenListResponse, KundeSearchResult,
    WarnungCreate, WarnungResponse, WarnungAufheben, StatusCheck
)

router = APIRouter(prefix="/api/kunden", tags=["kunden"])


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def generate_kundennummer(db: Session) -> str:
    """Generiert nächste Kundennummer (K-0001, K-0002, etc.)"""
    last_kunde = db.query(Kunde).order_by(desc(Kunde.id)).first()
    
    if not last_kunde:
        return "K-0001"
    
    # Aus letzter Nummer extrahieren
    try:
        last_num = int(last_kunde.kundennummer.split('-')[1])
        next_num = last_num + 1
        return f"K-{next_num:04d}"
    except:
        # Fallback bei fehlerhaften Nummern
        count = db.query(Kunde).count()
        return f"K-{count + 1:04d}"


def check_kunde_status(kunde: Kunde) -> dict:
    """Prüft Kunden-Status und gibt Warnungen zurück"""
    warnings = []
    can_rent = True
    
    # GESPERRT?
    if kunde.status == 'gesperrt':
        can_rent = False
        warnings.append({
            'level': 'error',
            'type': 'gesperrt',
            'message': kunde.gesperrt_grund or 'Kunde ist gesperrt',
            'seit': kunde.gesperrt_seit.isoformat() if kunde.gesperrt_seit else None,
            'von': kunde.gesperrt_von
        })
    
    # WARNUNG?
    elif kunde.status == 'warnung':
        warnings.append({
            'level': 'warning',
            'type': 'warnung',
            'message': 'Kunde hat eine aktive Warnung'
        })
    
    # OFFENE RECHNUNGEN?
    if kunde.offene_rechnungen and kunde.offene_rechnungen > 0:
        warnings.append({
            'level': 'warning',
            'type': 'rechnung',
            'message': f'Offene Rechnung: {kunde.offene_rechnungen} €',
            'betrag': float(kunde.offene_rechnungen)
        })
    
    # SPRACHBARRIERE?
    if kunde.sprache and kunde.sprache != 'Deutsch':
        warnings.append({
            'level': 'info',
            'type': 'sprache',
            'message': f'Sprache: {kunde.sprache}',
            'sprache': kunde.sprache,
            'notiz': kunde.sprache_notiz
        })
    
    return {
        'can_rent': can_rent,
        'warnings': warnings
    }


# ============================================================================
# KUNDEN CRUD
# ============================================================================

@router.get("/", response_model=KundenListResponse)
def get_kunden(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Liste aller Kunden mit Suche und Filter"""
    query = db.query(Kunde)
    
    # Suche
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Kunde.vorname.ilike(search_term),
                Kunde.nachname.ilike(search_term),
                Kunde.telefon.ilike(search_term),
                Kunde.email.ilike(search_term),
                Kunde.kundennummer.ilike(search_term)
            )
        )
    
    # Status-Filter
    if status:
        query = query.filter(Kunde.status == status)
    
    total = query.count()
    kunden = query.order_by(Kunde.nachname, Kunde.vorname).offset(skip).limit(limit).all()
    
    return {
        "items": kunden,
        "total": total,
        "page": (skip // limit) + 1,
        "page_size": limit
    }


@router.get("/search", response_model=List[KundeSearchResult])
def search_kunden(
    q: str = Query(..., min_length=2),
    limit: int = 5,
    db: Session = Depends(get_db)
):
    """Autocomplete-Suche für Kunden"""
    search_term = f"%{q}%"
    
    kunden = db.query(Kunde).filter(
        or_(
            Kunde.vorname.ilike(search_term),
            Kunde.nachname.ilike(search_term),
            Kunde.telefon.ilike(search_term),
            Kunde.kundennummer.ilike(search_term)
        )
    ).limit(limit).all()
    
    results = []
    for kunde in kunden:
        display_name = f"{kunde.vorname or ''} {kunde.nachname}".strip()
        if kunde.kundennummer:
            display_name += f" ({kunde.kundennummer})"
        
        results.append({
            'id': kunde.id,
            'kundennummer': kunde.kundennummer,
            'display_name': display_name,
            'telefon': kunde.telefon,
            'status': kunde.status
        })
    
    return results


@router.get("/{kunde_id}", response_model=KundeDetail)
def get_kunde(kunde_id: int, db: Session = Depends(get_db)):
    """Einzelner Kunde mit Details"""
    kunde = db.query(Kunde).filter(Kunde.id == kunde_id).first()
    
    if not kunde:
        raise HTTPException(status_code=404, detail="Kunde nicht gefunden")
    
    # Zusätzliche Stats berechnen
    from app.models.vermietung import Vermietung
    
    vermietungen_anzahl = db.query(Vermietung).filter(
        Vermietung.kunde_id == kunde_id
    ).count()
    
    letzte_vermietung = db.query(Vermietung).filter(
        Vermietung.kunde_id == kunde_id
    ).order_by(desc(Vermietung.erstellt_am)).first()
    
    # Response bauen
    response = KundeDetail.from_orm(kunde)
    response.vermietungen_anzahl = vermietungen_anzahl
    response.letzte_vermietung = letzte_vermietung.erstellt_am if letzte_vermietung else None
    
    return response


@router.post("/", response_model=KundeResponse)
def create_kunde(kunde: KundeCreate, db: Session = Depends(get_db)):
    """Neuen Kunden anlegen"""
    
    # Kundennummer generieren
    kundennummer = generate_kundennummer(db)
    
    db_kunde = Kunde(
        kundennummer=kundennummer,
        **kunde.dict()
    )
    
    db.add(db_kunde)
    db.commit()
    db.refresh(db_kunde)
    
    return db_kunde


@router.put("/{kunde_id}", response_model=KundeResponse)
def update_kunde(kunde_id: int, kunde: KundeUpdate, db: Session = Depends(get_db)):
    """Kunde bearbeiten"""
    db_kunde = db.query(Kunde).filter(Kunde.id == kunde_id).first()
    
    if not db_kunde:
        raise HTTPException(status_code=404, detail="Kunde nicht gefunden")
    
    # Nur gesetzte Felder updaten
    update_data = kunde.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_kunde, key, value)
    
    db_kunde.geaendert_am = datetime.now()
    
    db.commit()
    db.refresh(db_kunde)
    
    return db_kunde


@router.delete("/{kunde_id}")
def delete_kunde(kunde_id: int, db: Session = Depends(get_db)):
    """Kunde löschen (DSGVO)"""
    kunde = db.query(Kunde).filter(Kunde.id == kunde_id).first()
    
    if not kunde:
        raise HTTPException(status_code=404, detail="Kunde nicht gefunden")
    
    # Prüfen ob aktive Vermietungen
    from app.models.vermietung import Vermietung
    aktive_vermietungen = db.query(Vermietung).filter(
        Vermietung.kunde_id == kunde_id,
        Vermietung.status.in_(['reserviert', 'aktiv'])
    ).count()
    
    if aktive_vermietungen > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Kunde hat {aktive_vermietungen} aktive Vermietungen und kann nicht gelöscht werden"
        )
    
    db.delete(kunde)
    db.commit()
    
    return {"message": "Kunde gelöscht"}


# ============================================================================
# STATUS & WARNUNGEN
# ============================================================================

@router.get("/{kunde_id}/check-status", response_model=StatusCheck)
def check_status(kunde_id: int, db: Session = Depends(get_db)):
    """Status-Check vor Vermietung"""
    kunde = db.query(Kunde).filter(Kunde.id == kunde_id).first()
    
    if not kunde:
        raise HTTPException(status_code=404, detail="Kunde nicht gefunden")
    
    return check_kunde_status(kunde)


@router.post("/{kunde_id}/warnung", response_model=WarnungResponse)
def create_warnung(
    kunde_id: int, 
    warnung: WarnungCreate, 
    db: Session = Depends(get_db)
):
    """Warnung oder Sperre für Kunden anlegen"""
    kunde = db.query(Kunde).filter(Kunde.id == kunde_id).first()
    
    if not kunde:
        raise HTTPException(status_code=404, detail="Kunde nicht gefunden")
    
    # Warnung anlegen
    db_warnung = KundenWarnung(
        kunde_id=kunde_id,
        **warnung.dict()
    )
    db.add(db_warnung)
    
    # Kunden-Status aktualisieren
    if warnung.typ == 'sperrung':
        kunde.status = 'gesperrt'
        kunde.gesperrt_grund = warnung.grund
        kunde.gesperrt_seit = date.today()
        kunde.gesperrt_von = warnung.erstellt_von
    else:
        kunde.status = 'warnung'
    
    # Offene Rechnung eintragen (falls vorhanden)
    if warnung.betrag:
        kunde.offene_rechnungen = (kunde.offene_rechnungen or 0) + warnung.betrag
    
    db.commit()
    db.refresh(db_warnung)
    
    return db_warnung


@router.delete("/{kunde_id}/warnung/{warnung_id}")
def aufheben_warnung(
    kunde_id: int,
    warnung_id: int,
    aufhebung: WarnungAufheben,
    db: Session = Depends(get_db)
):
    """Warnung/Sperre aufheben"""
    warnung = db.query(KundenWarnung).filter(
        KundenWarnung.id == warnung_id,
        KundenWarnung.kunde_id == kunde_id
    ).first()
    
    if not warnung:
        raise HTTPException(status_code=404, detail="Warnung nicht gefunden")
    
    kunde = db.query(Kunde).filter(Kunde.id == kunde_id).first()
    
    # Warnung als aufgehoben markieren
    warnung.aufgehoben_am = datetime.now()
    warnung.aufgehoben_von = aufhebung.aufgehoben_von
    
    # Kunden-Status zurücksetzen
    # Prüfen ob noch andere aktive Warnungen existieren
    andere_aktive = db.query(KundenWarnung).filter(
        KundenWarnung.kunde_id == kunde_id,
        KundenWarnung.id != warnung_id,
        KundenWarnung.aufgehoben_am.is_(None)
    ).count()
    
    if andere_aktive == 0:
        kunde.status = 'normal'
        kunde.gesperrt_grund = None
        kunde.gesperrt_seit = None
        kunde.gesperrt_von = None
    
    db.commit()
    
    return {"message": "Warnung aufgehoben"}


@router.post("/{kunde_id}/rechnung-bezahlt")
def rechnung_bezahlt(
    kunde_id: int,
    db: Session = Depends(get_db)
):
    """Rechnung als bezahlt markieren (setzt offene_rechnungen auf 0)"""
    kunde = db.query(Kunde).filter(Kunde.id == kunde_id).first()
    
    if not kunde:
        raise HTTPException(status_code=404, detail="Kunde nicht gefunden")
    
    # Offene Rechnung auf 0 setzen
    kunde.offene_rechnungen = 0
    
    db.commit()
    db.refresh(kunde)
    
    return kunde