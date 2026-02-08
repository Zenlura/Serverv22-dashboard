"""
LEIHRÄDER BACKEND - COMPLETE FIX
Session: 08.02.2026 12:00

FIXES:
1. ✅ Gesamt-Räder dynamisch berechnen (nicht hardcoded 21)
2. ✅ Werkstatträder = vermietbar (Notfall-Räder, GRATIS)
3. ✅ verfuegbarkeit-pro-typ korrigiert
4. ✅ Positionen-basierte Buchung implementiert (Phase 5+6)
5. ✅ Status-Tracking verbessert
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal

from app.database import get_db
from app.models import Leihrad, LeihradStatus, Vermietung, VermietungStatus, VermietungPosition
from app.schemas.leihrad import (
    LeihradCreate, LeihradUpdate, LeihradResponse, LeihradListResponse,
    VermietungCreate, VermietungUpdate, VermietungResponse, VermietungListResponse,
    VermietungPositionCreate  # ✨ NEU für Phase 6
)

router = APIRouter(prefix="/api/leihraeder", tags=["Leihräder"])
router_vermietung = APIRouter(prefix="/api/vermietungen", tags=["Vermietungen"])


# ========== HELPER FUNCTIONS ==========

def get_staffelpreis(typ_preise: dict, anzahl_tage: int) -> Decimal:
    """
    Berechnet den korrekten Staffelpreis basierend auf Tage-Anzahl
    
    Args:
        typ_preise: Dict mit preis_1tag, preis_3tage, preis_5tage
        anzahl_tage: Anzahl der Tage
    
    Returns:
        Decimal: Tagespreis für die gegebene Anzahl Tage
    """
    if anzahl_tage >= 5:
        return Decimal(str(typ_preise.get('preis_5tage', typ_preise['preis_1tag'])))
    elif anzahl_tage >= 3:
        return Decimal(str(typ_preise.get('preis_3tage', typ_preise['preis_1tag'])))
    else:
        return Decimal(str(typ_preise['preis_1tag']))


def calculate_anzahl_tage(von_datum: date, bis_datum: date) -> int:
    """Berechnet Anzahl Tage (mindestens 1)"""
    diff = (bis_datum - von_datum).days + 1
    return max(1, diff)


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
    
    aktive_vermietungen = db.query(Vermietung).filter(
        Vermietung.leihrad_id == leihrad_id,
        Vermietung.status == 'aktiv',
    ).count()
    if aktive_vermietungen > 0:
        raise HTTPException(status_code=400, detail="Leihrad hat aktive Vermietungen")
    
    db.delete(db_leihrad)
    db.commit()
    return {"message": "Leihrad gelöscht"}


@router.post("/sync-status")
def sync_leihraeder_status(db: Session = Depends(get_db)):
    """
    Synchronisiert den Status aller Leihräder
    
    Logik:
    - Rad mit aktiver Vermietung → Status "verliehen"
    - Rad ohne aktive Vermietung → Status "verfuegbar" (falls nicht wartung/defekt)
    """
    synced_count = 0
    
    # Hole alle Leihräder
    alle_raeder = db.query(Leihrad).all()
    
    for rad in alle_raeder:
        # Prüfe ob aktive Vermietung existiert
        hat_aktive_vermietung = db.query(Vermietung).filter(
            Vermietung.leihrad_id == rad.id,
            Vermietung.status.in_(['aktiv', 'reserviert'])
        ).first() is not None
        
        # Status setzen
        neuer_status = None
        
        if hat_aktive_vermietung:
            # Hat aktive Vermietung → verliehen
            if rad.status != LeihradStatus.verliehen:
                neuer_status = LeihradStatus.verliehen
        else:
            # Keine aktive Vermietung → verfügbar (außer wartung/defekt)
            if rad.status == LeihradStatus.verliehen:
                neuer_status = LeihradStatus.verfuegbar
        
        if neuer_status:
            rad.status = neuer_status
            synced_count += 1
    
    db.commit()
    
    return {
        "message": "Status synchronisiert",
        "synced": synced_count,
        "total": len(alle_raeder)
    }


# ========== VERMIETUNGEN ENDPOINTS ==========

@router_vermietung.get("/", response_model=VermietungListResponse)
def get_vermietungen(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    kunde_id: Optional[int] = None,
    von_datum: Optional[date] = None,
    bis_datum: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """Liste aller Vermietungen mit erweiterten Details"""
    query = db.query(Vermietung).options(
        joinedload(Vermietung.leihrad),
        joinedload(Vermietung.kunde),
        joinedload(Vermietung.positionen)  # ✨ NEU: Positionen laden
    )
    
    if status:
        query = query.filter(Vermietung.status == status)
    if kunde_id:
        query = query.filter(Vermietung.kunde_id == kunde_id)
    if von_datum:
        query = query.filter(Vermietung.von_datum >= von_datum)
    if bis_datum:
        query = query.filter(Vermietung.bis_datum <= bis_datum)
    
    query = query.order_by(Vermietung.von_datum.desc(), Vermietung.von_zeit.desc())
    
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router_vermietung.post("/", response_model=VermietungResponse)
def create_vermietung(vermietung: VermietungCreate, db: Session = Depends(get_db)):
    """
    ✨ PHASE 6: Neue Vermietung mit Positionen erstellen
    
    Unterstützt:
    - Alt: Einzelnes Rad (leihrad_id)
    - Neu: Typ-basiert (positionen mit rad_typ + anzahl)
    """
    
    # Berechne Anzahl Tage
    anzahl_tage = calculate_anzahl_tage(vermietung.von_datum, vermietung.bis_datum)
    
    # ✨ NEU: Typ-basierte Buchung mit Positionen
    if hasattr(vermietung, 'positionen') and vermietung.positionen:
        
        gesamtpreis = Decimal('0.00')
        anzahl_raeder_gesamt = 0
        positionen_data = []
        
        # Für jede Position: Preis berechnen
        for pos in vermietung.positionen:
            # Hole Typ-Preise vom Backend
            typ_info = db.query(
                func.min(Leihrad.preis_1tag).label('preis_1tag'),
                func.min(Leihrad.preis_3tage).label('preis_3tage'),
                func.min(Leihrad.preis_5tage).label('preis_5tage')
            ).filter(
                Leihrad.typ == pos.rad_typ,
                Leihrad.status == LeihradStatus.verfuegbar
            ).first()
            
            if not typ_info or typ_info.preis_1tag is None:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Rad-Typ '{pos.rad_typ}' nicht verfügbar oder keine Preise hinterlegt"
                )
            
            # Staffelpreis berechnen
            typ_preise = {
                'preis_1tag': typ_info.preis_1tag,
                'preis_3tage': typ_info.preis_3tage or typ_info.preis_1tag,
                'preis_5tage': typ_info.preis_5tage or typ_info.preis_1tag
            }
            tagespreis = get_staffelpreis(typ_preise, anzahl_tage)
            
            # Gesamtpreis für diese Position
            pos_gesamtpreis = Decimal(str(pos.anzahl)) * tagespreis * Decimal(str(anzahl_tage))
            
            positionen_data.append({
                'rad_typ': pos.rad_typ,
                'anzahl': pos.anzahl,
                'tagespreis': float(tagespreis),
                'anzahl_tage': anzahl_tage,
                'gesamtpreis': float(pos_gesamtpreis)
            })
            
            gesamtpreis += pos_gesamtpreis
            anzahl_raeder_gesamt += pos.anzahl
        
        # Erstelle Vermietung (ohne leihrad_id)
        vermietung_data = vermietung.model_dump(exclude={'positionen', 'leihrad_id'})
        vermietung_data.update({
            'leihrad_id': None,  # Typ-basiert = kein einzelnes Rad
            'anzahl_raeder': anzahl_raeder_gesamt,
            'anzahl_tage': anzahl_tage,
            'tagespreis': float(gesamtpreis / Decimal(str(anzahl_tage * anzahl_raeder_gesamt))),  # Durchschnitt
            'gesamtpreis': float(gesamtpreis)
        })
        
        db_vermietung = Vermietung(**vermietung_data)
        db.add(db_vermietung)
        db.flush()  # Generiert ID
        
        # Erstelle Positionen
        for pos_data in positionen_data:
            pos = VermietungPosition(
                vermietung_id=db_vermietung.id,
                **pos_data
            )
            db.add(pos)
        
        db.commit()
        db.refresh(db_vermietung)
        return db_vermietung
    
    # ALT: Klassische Einzel-Rad Buchung
    else:
        if not vermietung.leihrad_id:
            raise HTTPException(
                status_code=400,
                detail="Entweder leihrad_id ODER positionen erforderlich"
            )
        
        leihrad = db.query(Leihrad).filter(Leihrad.id == vermietung.leihrad_id).first()
        if not leihrad:
            raise HTTPException(status_code=404, detail="Leihrad nicht gefunden")
        if leihrad.status != LeihradStatus.verfuegbar:
            raise HTTPException(status_code=400, detail="Leihrad nicht verfügbar")
        
        # Staffelpreis berechnen
        typ_preise = {
            'preis_1tag': leihrad.preis_1tag,
            'preis_3tage': leihrad.preis_3tage or leihrad.preis_1tag,
            'preis_5tage': leihrad.preis_5tage or leihrad.preis_1tag
        }
        tagespreis = get_staffelpreis(typ_preise, anzahl_tage)
        anzahl_raeder = getattr(vermietung, 'anzahl_raeder', 1)
        gesamtpreis = tagespreis * Decimal(str(anzahl_tage)) * Decimal(str(anzahl_raeder))
        
        vermietung_data = vermietung.model_dump(exclude={'positionen'})
        vermietung_data.update({
            'anzahl_tage': anzahl_tage,
            'tagespreis': float(tagespreis),
            'gesamtpreis': float(gesamtpreis)
        })
        
        db_vermietung = Vermietung(**vermietung_data)
        db.add(db_vermietung)
        
        # Rad-Status ändern
        leihrad.status = LeihradStatus.verliehen
        
        db.commit()
        db.refresh(db_vermietung)
        return db_vermietung


@router_vermietung.get("/{vermietung_id}", response_model=VermietungResponse)
def get_vermietung(vermietung_id: int, db: Session = Depends(get_db)):
    """Einzelne Vermietung mit Details und Positionen"""
    vermietung = db.query(Vermietung).options(
        joinedload(Vermietung.leihrad),
        joinedload(Vermietung.kunde),
        joinedload(Vermietung.positionen)
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
    """Vermietung aktualisieren (Status, Abholung, Rückgabe, etc.)"""
    db_vermietung = db.query(Vermietung).filter(Vermietung.id == vermietung_id).first()
    if not db_vermietung:
        raise HTTPException(status_code=404, detail="Vermietung nicht gefunden")
    
    update_data = vermietung_update.model_dump(exclude_unset=True)
    
    # Status-Änderung: Rad wieder freigeben
    if 'status' in update_data and update_data['status'] == 'abgeschlossen':
        if db_vermietung.leihrad_id:
            leihrad = db.query(Leihrad).filter(Leihrad.id == db_vermietung.leihrad_id).first()
            if leihrad:
                leihrad.status = LeihradStatus.verfuegbar
    
    for field, value in update_data.items():
        setattr(db_vermietung, field, value)
    
    db.commit()
    db.refresh(db_vermietung)
    return db_vermietung


@router_vermietung.delete("/{vermietung_id}")
def delete_vermietung(vermietung_id: int, db: Session = Depends(get_db)):
    """Vermietung löschen"""
    db_vermietung = db.query(Vermietung).filter(Vermietung.id == vermietung_id).first()
    if not db_vermietung:
        raise HTTPException(status_code=404, detail="Vermietung nicht gefunden")
    
    # Rad wieder freigeben
    if db_vermietung.leihrad_id:
        leihrad = db.query(Leihrad).filter(Leihrad.id == db_vermietung.leihrad_id).first()
        if leihrad and leihrad.status == LeihradStatus.verliehen:
            leihrad.status = LeihradStatus.verfuegbar
    
    db.delete(db_vermietung)
    db.commit()
    return {"message": "Vermietung gelöscht"}


# ========== ✅ FIX: VERFÜGBARKEIT PRO TYP (KOMPLETT ÜBERARBEITET) ==========

@router_vermietung.get("/verfuegbarkeit-pro-typ/")
def check_verfuegbarkeit_pro_typ(
    von_datum: Optional[date] = None,
    bis_datum: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """
    ✅ FIXED: Verfügbarkeit pro Rad-Typ
    
    FIXES:
    1. Gesamt = ALLE Räder (nicht nur verfügbare)
    2. Werkstatt = vermietbar (Notfall-Räder, GRATIS)
    3. Verfügbar = Gesamt - Belegt
    4. MIN-Preis statt AVG
    
    Returns:
        Dict mit Rad-Typen als Keys und Verfügbarkeits-Infos als Values
    """
    
    # 1. Alle Rad-Typen mit MIN-Preisen (func.min statt func.avg!)
    typen_query = db.query(
        Leihrad.typ,
        func.count(Leihrad.id).label('gesamt'),
        func.min(Leihrad.preis_1tag).label('preis_1tag'),
        func.min(Leihrad.preis_3tage).label('preis_3tage'),
        func.min(Leihrad.preis_5tage).label('preis_5tage')
    ).filter(
        Leihrad.typ.isnot(None)
    ).group_by(Leihrad.typ).all()
    
    result = {}
    
    for typ_row in typen_query:
        typ = typ_row.typ
        gesamt = typ_row.gesamt
        
        # 2. Belegte Räder im Zeitraum (falls Datum angegeben)
        belegt = 0
        if von_datum and bis_datum:
            # ✅ FIX: Finde ALLE Vermietungen (nicht nur mit leihrad_id!)
            # Alte Buchungen: haben leihrad_id
            # Neue Buchungen: haben nur positionen (leihrad_id = NULL)
            
            # ALTE: mit leihrad_id
            raeder_ids = [lr.id for lr in db.query(Leihrad).filter(Leihrad.typ == typ).all()]
            overlapping_alt = db.query(Vermietung).filter(
                Vermietung.leihrad_id.in_(raeder_ids),
                Vermietung.status.in_(['aktiv', 'reserviert']),
                Vermietung.von_datum <= bis_datum,
                Vermietung.bis_datum >= von_datum
            ).all()
            
            # NEUE: ohne leihrad_id (typ-basiert)
            overlapping_neu = db.query(Vermietung).options(
                joinedload(Vermietung.positionen)
            ).filter(
                Vermietung.leihrad_id.is_(None),
                Vermietung.status.in_(['aktiv', 'reserviert']),
                Vermietung.von_datum <= bis_datum,
                Vermietung.bis_datum >= von_datum
            ).all()
            
            # Zähle alte Buchungen
            for v in overlapping_alt:
                if v.positionen and len(v.positionen) > 0:
                    # Hat Positionen → Nutze die
                    belegt += sum(p.anzahl for p in v.positionen if p.rad_typ == typ)
                else:
                    # Keine Positionen → Fallback
                    belegt += v.anzahl_raeder or 1
            
            # Zähle neue Buchungen (typ-basiert)
            for v in overlapping_neu:
                if v.positionen and len(v.positionen) > 0:
                    # Nur Positionen dieses Typs zählen
                    belegt += sum(p.anzahl for p in v.positionen if p.rad_typ == typ)
        
        # 3. ✅ FIX: Verfügbar = Gesamt - Belegt (nicht nur status=verfuegbar!)
        verfuegbar = max(0, gesamt - belegt)
        
        # 4. ✅ FIX: Werkstatt = vermietbar (Notfall-Räder!)
        # Nur "defekt" ist NICHT vermietbar
        vermietbar = typ.lower() not in ['defekt']
        
        # 5. Erstelle Response
        typ_info = {
            "verfuegbar": verfuegbar,
            "gesamt": gesamt,
            "belegt": belegt,
            "preis_1tag": float(typ_row.preis_1tag or 0),
            "preis_3tage": float(typ_row.preis_3tage or 0),
            "preis_5tage": float(typ_row.preis_5tage or 0),
            "vermietbar": vermietbar
        }
        
        # 6. Spezielle Labels
        if typ.lower() == 'lastenrad':
            typ_info["special"] = "GRATIS - Georg! 🎉"
        elif typ.lower() == 'werkstatt':
            typ_info["special"] = "Notfall-Räder - GRATIS! 🔧"
            # ✅ Werkstatträder sind kostenlos!
            typ_info["preis_1tag"] = 0.0
            typ_info["preis_3tage"] = 0.0
            typ_info["preis_5tage"] = 0.0
        
        result[typ] = typ_info
    
    return result


# ========== VERFÜGBARKEIT ENDPOINT (GESAMT) ==========

@router_vermietung.get("/verfuegbarkeit/")
def check_verfuegbarkeit(
    von_datum: date = Query(...),
    bis_datum: date = Query(...),
    db: Session = Depends(get_db)
):
    """
    ✅ FIXED: Gesamt-Verfügbarkeit (dynamisch!)
    
    NICHT MEHR hardcoded 21!
    Berechnet dynamisch aus ALLEN vermietbaren Rädern
    """
    
    # ✅ FIX: ALLE Räder zählen (inkl. Werkstatt)
    # "defekt" ist ein STATUS, kein TYP!
    gesamt_raeder = db.query(Leihrad).filter(
        Leihrad.typ.isnot(None)  # Nur Räder mit Typ
    ).count()
    
    # Aktive Vermietungen im Zeitraum
    overlapping = db.query(Vermietung).filter(
        Vermietung.status.in_(['aktiv', 'reserviert']),
        Vermietung.von_datum <= bis_datum,
        Vermietung.bis_datum >= von_datum
    ).all()
    
    # ✅ FIX: Positionen berücksichtigen (Timeline V6)
    belegt = 0
    for v in overlapping:
        if v.positionen and len(v.positionen) > 0:
            # Summe aller Positionen
            belegt += sum(p.anzahl for p in v.positionen)
        else:
            # Fallback: anzahl_raeder verwenden
            belegt += v.anzahl_raeder or 1
    
    verfuegbar = max(0, gesamt_raeder - belegt)
    
    return {
        "verfuegbar": verfuegbar,
        "gesamt": gesamt_raeder,
        "belegt": belegt,
        "von_datum": von_datum,
        "bis_datum": bis_datum
    }