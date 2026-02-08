from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import Optional
from datetime import date, datetime

from app.database import get_db
from app.models import Leihrad, LeihradStatus, Vermietung, VermietungStatus
from app.schemas.leihrad import (
    LeihradCreate, LeihradUpdate, LeihradResponse, LeihradListResponse,
    VermietungCreate, VermietungUpdate, VermietungResponse, VermietungListResponse
)

router = APIRouter(prefix="/api/leihraeder", tags=["Leihräder"])
router_vermietung = APIRouter(prefix="/api/vermietungen", tags=["Vermietungen"])

# ========== LEIHRÄDER ENDPOINTS ==========

@router.get("/", response_model=LeihradListResponse)
def get_leihraeder(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    typ: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Liste aller Leihräder mit Filter"""
    query = db.query(Leihrad)
    
    # Filter
    if status:
        query = query.filter(Leihrad.status == status)
    if typ:
        query = query.filter(Leihrad.typ == typ)
    if search:
        query = query.filter(
            (Leihrad.inventarnummer.ilike(f"%{search}%")) |
            (Leihrad.marke.ilike(f"%{search}%")) |
            (Leihrad.modell.ilike(f"%{search}%"))
        )
    
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    
    return {"items": items, "total": total, "skip": skip, "limit": limit}

@router.post("/", response_model=LeihradResponse)
def create_leihrad(leihrad: LeihradCreate, db: Session = Depends(get_db)):
    """Neues Leihrad erstellen"""
    # Check Inventarnummer unique
    exists = db.query(Leihrad).filter(Leihrad.inventarnummer == leihrad.inventarnummer).first()
    if exists:
        raise HTTPException(status_code=400, detail="Inventarnummer bereits vergeben")
    
    db_leihrad = Leihrad(**leihrad.model_dump())
    db.add(db_leihrad)
    db.commit()
    db.refresh(db_leihrad)
    return db_leihrad

@router.get("/{leihrad_id}", response_model=LeihradResponse)
def get_leihrad(leihrad_id: int, db: Session = Depends(get_db)):
    """Einzelnes Leihrad mit Details"""
    leihrad = db.query(Leihrad).filter(Leihrad.id == leihrad_id).first()
    if not leihrad:
        raise HTTPException(status_code=404, detail="Leihrad nicht gefunden")
    return leihrad

@router.put("/{leihrad_id}", response_model=LeihradResponse)
def update_leihrad(leihrad_id: int, leihrad_update: LeihradUpdate, db: Session = Depends(get_db)):
    """Leihrad aktualisieren"""
    db_leihrad = db.query(Leihrad).filter(Leihrad.id == leihrad_id).first()
    if not db_leihrad:
        raise HTTPException(status_code=404, detail="Leihrad nicht gefunden")
    
    # Update nur gesetzte Felder
    update_data = leihrad_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_leihrad, field, value)
    
    db.commit()
    db.refresh(db_leihrad)
    return db_leihrad

@router.delete("/{leihrad_id}")
def delete_leihrad(leihrad_id: int, db: Session = Depends(get_db)):
    """Leihrad löschen"""
    db_leihrad = db.query(Leihrad).filter(Leihrad.id == leihrad_id).first()
    if not db_leihrad:
        raise HTTPException(status_code=404, detail="Leihrad nicht gefunden")
    
    # Check aktive Vermietungen
    aktive_vermietungen = db.query(Vermietung).filter(
        Vermietung.leihrad_id == leihrad_id,
        Vermietung.status == 'aktiv',
    ).count()
    if aktive_vermietungen > 0:
        raise HTTPException(status_code=400, detail="Leihrad hat aktive Vermietungen")
    
    db.delete(db_leihrad)
    db.commit()
    return {"message": "Leihrad gelöscht"}

@router.patch("/{leihrad_id}/status")
def update_status(leihrad_id: int, status: str, db: Session = Depends(get_db)):
    """Status ändern"""
    db_leihrad = db.query(Leihrad).filter(Leihrad.id == leihrad_id).first()
    if not db_leihrad:
        raise HTTPException(status_code=404, detail="Leihrad nicht gefunden")
    
    db_leihrad.status = status
    db.commit()
    return {"message": "Status geändert"}

@router.post("/sync-status")
def sync_all_leihrad_status(db: Session = Depends(get_db)):
    """
    Synchronisiert den Status aller Leihräder mit aktiven Vermietungen.
    Setzt Räder ohne aktive Vermietung auf 'verfuegbar'.
    """
    # Alle Leihräder holen
    all_leihraeder = db.query(Leihrad).all()
    
    synced = 0
    errors = []
    
    for leihrad in all_leihraeder:
        # Check ob aktive Vermietung existiert
        aktive_vermietung = db.query(Vermietung).filter(
            Vermietung.leihrad_id == leihrad.id,
            Vermietung.status == 'aktiv'
        ).first()
        
        # Wenn Rad als "verliehen" markiert ist, aber keine aktive Vermietung → Fix!
        if leihrad.status == LeihradStatus.verliehen and not aktive_vermietung:
            leihrad.status = LeihradStatus.verfuegbar
            synced += 1
    
    try:
        db.commit()
        return {
            "message": f"Status-Sync abgeschlossen",
            "synced": synced,
            "total": len(all_leihraeder)
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Fehler beim Sync: {str(e)}")

# ========== VERMIETUNGEN ENDPOINTS ==========

@router_vermietung.get("/", response_model=VermietungListResponse)
def get_vermietungen(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    leihrad_id: Optional[int] = None,
    aktiv: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Liste aller Vermietungen"""
    query = db.query(Vermietung).options(
        joinedload(Vermietung.leihrad),
        joinedload(Vermietung.kunde)  # ✅ Kunde-Relation laden für Kalender
    )
    
    # Filter
    if status:
        query = query.filter(Vermietung.status == status)
    if leihrad_id:
        query = query.filter(Vermietung.leihrad_id == leihrad_id)
    if aktiv is not None:
        if aktiv:
            query = query.filter(Vermietung.status == 'aktiv')
        else:
            query = query.filter(Vermietung.status != 'aktiv')
    
    total = query.count()
    items = query.order_by(Vermietung.von_datum.desc()).offset(skip).limit(limit).all()
    
    return {"items": items, "total": total, "skip": skip, "limit": limit}

@router_vermietung.post("/", response_model=VermietungResponse)
def create_vermietung(vermietung: VermietungCreate, db: Session = Depends(get_db)):
    """Neue Vermietung erstellen (Check-out)"""
    
    # ✅ KALENDER V2: Check nur wenn leihrad_id gesetzt
    if vermietung.leihrad_id:
        # Check Leihrad existiert & verfügbar
        leihrad = db.query(Leihrad).filter(Leihrad.id == vermietung.leihrad_id).first()
        if not leihrad:
            raise HTTPException(status_code=404, detail="Leihrad nicht gefunden")
        if leihrad.status != LeihradStatus.verfuegbar:
            raise HTTPException(status_code=400, detail=f"Leihrad ist nicht verfügbar (Status: {leihrad.status})")
        
        # Check keine überlappenden Vermietungen
        overlap = db.query(Vermietung).filter(
            Vermietung.leihrad_id == vermietung.leihrad_id,
            Vermietung.status == 'aktiv',
            Vermietung.von_datum <= vermietung.bis_datum,
            Vermietung.bis_datum >= vermietung.von_datum
        ).first()
        if overlap:
            raise HTTPException(status_code=400, detail="Leihrad ist in diesem Zeitraum bereits vermietet")
    
    try:
        # Vermietung erstellen
        db_vermietung = Vermietung(**vermietung.model_dump())
        db.add(db_vermietung)
        
        # ✅ KALENDER V2: Leihrad Status nur ändern wenn leihrad_id gesetzt
        if vermietung.leihrad_id:
            leihrad.status = LeihradStatus.verliehen
        
        db.commit()
        db.refresh(db_vermietung)
        return db_vermietung
    except Exception as e:
        # Bei Fehler: Rollback (setzt auch Leihrad-Status zurück)
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Fehler beim Erstellen der Vermietung: {str(e)}")

@router_vermietung.get("/{vermietung_id}", response_model=VermietungResponse)
def get_vermietung(vermietung_id: int, db: Session = Depends(get_db)):
    """Einzelne Vermietung mit Details"""
    vermietung = db.query(Vermietung).options(
        joinedload(Vermietung.leihrad)
    ).filter(Vermietung.id == vermietung_id).first()
    
    if not vermietung:
        raise HTTPException(status_code=404, detail="Vermietung nicht gefunden")
    return vermietung

@router_vermietung.put("/{vermietung_id}", response_model=VermietungResponse)
def update_vermietung(
    vermietung_id: int,
    vermietung_update: VermietungUpdate,
    db: Session = Depends(get_db)
):
    """Vermietung aktualisieren"""
    db_vermietung = db.query(Vermietung).filter(Vermietung.id == vermietung_id).first()
    if not db_vermietung:
        raise HTTPException(status_code=404, detail="Vermietung nicht gefunden")
    
    # Update
    update_data = vermietung_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_vermietung, field, value)
    
    db.commit()
    db.refresh(db_vermietung)
    return db_vermietung

@router_vermietung.post("/{vermietung_id}/checkin")
def checkin_vermietung(
    vermietung_id: int,
    rueckgabe_datum: Optional[date] = None,
    zustand: Optional[str] = None,
    schaeden: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Leihrad zurücknehmen (Check-in)"""
    vermietung = db.query(Vermietung).filter(Vermietung.id == vermietung_id).first()
    if not vermietung:
        raise HTTPException(status_code=404, detail="Vermietung nicht gefunden")
    
    if vermietung.status != 'aktiv':
        raise HTTPException(status_code=400, detail="Vermietung ist nicht aktiv")
    
    # Update Vermietung
    vermietung.rueckgabe_datum = rueckgabe_datum or date.today()
    vermietung.status = 'abgeschlossen'
    if zustand:
        vermietung.zustand_bei_rueckgabe = zustand
    if schaeden:
        vermietung.schaeden = schaeden
    
    # Leihrad Status ändern
    leihrad = db.query(Leihrad).filter(Leihrad.id == vermietung.leihrad_id).first()
    if schaeden:
        leihrad.status = LeihradStatus.wartung
        leihrad.zustand = f"Schäden bei Rückgabe: {schaeden}"
    else:
        leihrad.status = LeihradStatus.verfuegbar
    
    db.commit()
    return {"message": "Check-in erfolgreich", "status": leihrad.status}

@router_vermietung.delete("/{vermietung_id}")
def delete_vermietung(vermietung_id: int, db: Session = Depends(get_db)):
    """Vermietung stornieren/löschen"""
    vermietung = db.query(Vermietung).filter(Vermietung.id == vermietung_id).first()
    if not vermietung:
        raise HTTPException(status_code=404, detail="Vermietung nicht gefunden")
    
    # Wenn aktiv: Leihrad wieder verfügbar machen
    if vermietung.status == 'aktiv':
        leihrad = db.query(Leihrad).filter(Leihrad.id == vermietung.leihrad_id).first()
        if leihrad:
            leihrad.status = LeihradStatus.verfuegbar
    
    vermietung.status = 'storniert'
    db.commit()
    return {"message": "Vermietung storniert"}


# ========== KALENDER V2 ENDPOINTS ==========

@router_vermietung.get("/verfuegbarkeit/")
def check_verfuegbarkeit(
    von_datum: date,
    bis_datum: date,
    von_zeit: Optional[str] = None,  # Format: "10:00"
    bis_zeit: Optional[str] = None,  # Format: "18:00"
    exclude_id: Optional[int] = None,  # Vermietung-ID die ignoriert werden soll (beim Editieren)
    db: Session = Depends(get_db)
):
    """
    Prüft Verfügbarkeit von Leihrädern für einen Zeitraum.
    
    Kalender V2 Feature für Doppelbuchungs-Check.
    
    Returns:
        - verfuegbar: Anzahl verfügbarer Räder
        - gesamt: Gesamt-Anzahl Räder
        - belegt: Anzahl belegter Räder
        - buchungen: Liste der überlappenden Buchungen
        - kann_buchen: Boolean ob Buchung möglich
    """
    
    # 1. Gesamt-Anzahl Räder ermitteln
    gesamt_raeder = db.query(Leihrad).count()
    
    # 2. Überlappende Buchungen finden
    query = db.query(Vermietung).options(
        joinedload(Vermietung.kunde)  # ✅ WICHTIG: Kunde-Relation laden!
    ).filter(
        Vermietung.status.in_(['aktiv', 'reserviert']),
        Vermietung.von_datum <= bis_datum,
        Vermietung.bis_datum >= von_datum
    )
    
    # Bei Bearbeitung: Aktuelle Vermietung ignorieren
    if exclude_id:
        query = query.filter(Vermietung.id != exclude_id)
    
    overlapping = query.all()
    
    # 3. Belegte Räder summieren
    belegt = sum(v.anzahl_raeder for v in overlapping)
    
    # 4. Verfügbare Räder berechnen
    verfuegbar = max(0, gesamt_raeder - belegt)
    
    # 5. Buchungs-Details für Frontend
    buchungen = []
    for v in overlapping:
        # ✅ FIX: Kunde hat 'vorname' und 'nachname', nicht 'name'
        buchungen.append({
            "id": v.id,
            "kunde_name": f"{v.kunde.vorname} {v.kunde.nachname}" if v.kunde else v.kunde_name,
            "anzahl_raeder": v.anzahl_raeder,
            "von": v.von_datum.isoformat(),
            "bis": v.bis_datum.isoformat(),
            "von_zeit": v.von_zeit.isoformat() if v.von_zeit else None,
            "bis_zeit": v.bis_zeit.isoformat() if v.bis_zeit else None,
            "status": v.status
        })
    
    return {
        "verfuegbar": verfuegbar,
        "gesamt": gesamt_raeder,
        "belegt": belegt,
        "buchungen": buchungen,
        "kann_buchen": verfuegbar > 0,
        "warnung": f"Nur noch {verfuegbar} Räder verfügbar" if verfuegbar < 5 else None
    }


# ========== ✨ NEU: VERFÜGBARKEIT PRO TYP ==========

@router_vermietung.get("/verfuegbarkeit-pro-typ/")
def check_verfuegbarkeit_pro_typ(
    von_datum: Optional[date] = None,
    bis_datum: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """
    ✨ PHASE 2: Verfügbarkeit pro Rad-Typ
    
    Gibt für jeden Rad-Typ zurück:
    - Anzahl verfügbar
    - Anzahl gesamt
    - Anzahl belegt (im Zeitraum, falls angegeben)
    - Preisstaffel
    - Ob vermietbar
    
    Args:
        von_datum: Optional - Start des Zeitraums für Verfügbarkeits-Check
        bis_datum: Optional - Ende des Zeitraums für Verfügbarkeits-Check
    
    Returns:
        Dict mit Rad-Typen als Keys und Verfügbarkeits-Infos als Values
    """
    
    # 1. Alle vermietbaren Rad-Typen mit Preisen ermitteln
    # Gruppiere nach Typ und hole einen repräsentativen Preis
    typen_query = db.query(
        Leihrad.typ,
        func.count(Leihrad.id).label('gesamt'),
        func.min(Leihrad.preis_1tag).label('preis_1tag'),
        func.min(Leihrad.preis_3tage).label('preis_3tage'),
        func.min(Leihrad.preis_5tage).label('preis_5tage')
    ).filter(
        Leihrad.typ.isnot(None)  # Nur Räder mit Typ
    ).group_by(Leihrad.typ).all()
    
    result = {}
    
    for typ_row in typen_query:
        typ = typ_row.typ
        gesamt = typ_row.gesamt
        
        # 2. Verfügbare Räder dieses Typs (Status = verfuegbar)
        verfuegbar_query = db.query(Leihrad).filter(
            Leihrad.typ == typ,
            Leihrad.status == LeihradStatus.verfuegbar
        )
        verfuegbar_count = verfuegbar_query.count()
        
        # 3. Belegte Räder im Zeitraum (falls Datum angegeben)
        belegt = 0
        if von_datum and bis_datum:
            # Finde alle Vermietungen dieses Typs im Zeitraum
            # (Wir müssen hier über leihrad_id gehen, da Vermietung keinen direkten typ hat)
            leihrad_ids = [lr.id for lr in verfuegbar_query.all()]
            
            overlapping = db.query(Vermietung).filter(
                Vermietung.leihrad_id.in_(leihrad_ids),
                Vermietung.status.in_(['aktiv', 'reserviert']),
                Vermietung.von_datum <= bis_datum,
                Vermietung.bis_datum >= von_datum
            ).all()
            
            belegt = len(overlapping)
        
        # 4. Prüfe ob Typ vermietbar ist (Werkstatt = nicht vermietbar)
        vermietbar = typ.lower() not in ['werkstatt', 'defekt']
        
        # 5. Erstelle Response
        typ_info = {
            "verfuegbar": verfuegbar_count,
            "gesamt": gesamt,
            "belegt": belegt,
            "preis_1tag": float(typ_row.preis_1tag or 0),
            "preis_3tage": float(typ_row.preis_3tage or 0),
            "preis_5tage": float(typ_row.preis_5tage or 0),
            "vermietbar": vermietbar
        }
        
        # 6. Spezielle Behandlung für Georg (Lastenrad)
        if typ.lower() == 'lastenrad':
            typ_info["special"] = "GRATIS - Georg! 🎉"
        
        result[typ] = typ_info
    
    return result