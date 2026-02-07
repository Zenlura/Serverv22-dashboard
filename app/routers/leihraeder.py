from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
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
        Vermietung.status == VermietungStatus.aktiv
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
    query = db.query(Vermietung).options(joinedload(Vermietung.leihrad))
    
    # Filter
    if status:
        query = query.filter(Vermietung.status == status)
    if leihrad_id:
        query = query.filter(Vermietung.leihrad_id == leihrad_id)
    if aktiv is not None:
        if aktiv:
            query = query.filter(Vermietung.status == VermietungStatus.aktiv)
        else:
            query = query.filter(Vermietung.status != VermietungStatus.aktiv)
    
    total = query.count()
    items = query.order_by(Vermietung.von_datum.desc()).offset(skip).limit(limit).all()
    
    return {"items": items, "total": total, "skip": skip, "limit": limit}

@router_vermietung.post("/", response_model=VermietungResponse)
def create_vermietung(vermietung: VermietungCreate, db: Session = Depends(get_db)):
    """Neue Vermietung erstellen (Check-out)"""
    # Check Leihrad existiert & verfügbar
    leihrad = db.query(Leihrad).filter(Leihrad.id == vermietung.leihrad_id).first()
    if not leihrad:
        raise HTTPException(status_code=404, detail="Leihrad nicht gefunden")
    if leihrad.status != LeihradStatus.verfuegbar:
        raise HTTPException(status_code=400, detail=f"Leihrad ist nicht verfügbar (Status: {leihrad.status})")
    
    # Check keine überlappenden Vermietungen
    overlap = db.query(Vermietung).filter(
        Vermietung.leihrad_id == vermietung.leihrad_id,
        Vermietung.status == VermietungStatus.aktiv,
        Vermietung.von_datum <= vermietung.bis_datum,
        Vermietung.bis_datum >= vermietung.von_datum
    ).first()
    if overlap:
        raise HTTPException(status_code=400, detail="Leihrad ist in diesem Zeitraum bereits vermietet")
    
    # Vermietung erstellen
    db_vermietung = Vermietung(**vermietung.model_dump())
    db.add(db_vermietung)
    
    # Leihrad Status ändern
    leihrad.status = LeihradStatus.verliehen
    
    db.commit()
    db.refresh(db_vermietung)
    return db_vermietung

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
    
    if vermietung.status != VermietungStatus.aktiv:
        raise HTTPException(status_code=400, detail="Vermietung ist nicht aktiv")
    
    # Update Vermietung
    vermietung.rueckgabe_datum = rueckgabe_datum or date.today()
    vermietung.status = VermietungStatus.abgeschlossen
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
    if vermietung.status == VermietungStatus.aktiv:
        leihrad = db.query(Leihrad).filter(Leihrad.id == vermietung.leihrad_id).first()
        if leihrad:
            leihrad.status = LeihradStatus.verfuegbar
    
    vermietung.status = VermietungStatus.storniert
    db.commit()
    return {"message": "Vermietung storniert"}
