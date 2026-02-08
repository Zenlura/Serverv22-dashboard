"""
PDF Generator für Auftragszettel
Erstellt 2 identische Zettel auf einer A4-Seite (Querformat)
"""
from io import BytesIO
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.colors import black, grey
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.reparatur import Reparatur


def generate_auftragszettel_pdf(reparatur_id: int, db: Session) -> BytesIO:
    """
    Generiert PDF mit 2 identischen Auftragszetteln auf einer A4-Seite (Querformat)
    
    Layout:
    - A4 Querformat (297mm x 210mm)
    - 2 Zettel nebeneinander (je ~140mm breit)
    - Gestrichelte Trennlinie in der Mitte
    - Rückseite: Notizen-Linien
    
    Args:
        reparatur_id: ID der Reparatur
        db: Database Session
        
    Returns:
        BytesIO mit PDF-Daten
        
    Raises:
        ValueError: Wenn Reparatur nicht gefunden
    """
    
    # 1. Reparatur-Daten laden
    rep = db.query(Reparatur).filter(Reparatur.id == reparatur_id).first()
    if not rep:
        raise ValueError(f"Reparatur mit ID {reparatur_id} nicht gefunden")
    
    # 2. Kunde-Daten holen (DB oder Legacy)
    kunde_name = get_kunde_display_name(rep)
    kunde_telefon = get_kunde_telefon(rep)
    
    # 3. PDF erstellen
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=landscape(A4))
    width, height = landscape(A4)  # 297mm x 210mm
    
    # 4. Beide Zettel zeichnen
    draw_auftragszettel(c, rep, kunde_name, kunde_telefon, x_offset=15*mm)  # Links
    draw_auftragszettel(c, rep, kunde_name, kunde_telefon, x_offset=width/2 + 5*mm)  # Rechts
    
    # 5. Trennlinie (gestrichelt)
    c.setStrokeColor(grey)
    c.setDash(3, 3)
    c.line(width/2, 10*mm, width/2, height - 10*mm)
    
    c.showPage()  # Seite 1 fertig (Vorderseite)
    
    # 6. Rückseite: Notizen
    draw_notizen_seite(c, width, height)
    
    # 7. PDF speichern
    c.save()
    buffer.seek(0)
    return buffer


def draw_auftragszettel(c, rep, kunde_name, kunde_telefon, x_offset):
    """
    Zeichnet EINEN Auftragszettel
    
    Args:
        c: ReportLab Canvas
        rep: Reparatur-Objekt
        kunde_name: String mit Kundenname
        kunde_telefon: String mit Telefon
        x_offset: X-Position (links oder rechts)
    """
    
    y = 185*mm  # Start oben
    x = x_offset
    line_height = 6*mm
    
    c.setStrokeColor(black)
    c.setFillColor(black)
    
    # ===== HEADER =====
    c.setFont("Helvetica-Bold", 16)
    c.drawString(x, y, "AUFTRAGSPLANER")
    y -= 12*mm
    
    # ===== FELDER =====
    c.setFont("Helvetica", 10)
    
    # Auftragsnummer
    c.drawString(x, y, "Auftragsnummer:")
    c.setFont("Helvetica-Bold", 11)
    c.drawString(x + 42*mm, y, str(rep.auftragsnummer))
    y -= line_height
    
    # Reparaturdatum
    c.setFont("Helvetica", 10)
    c.drawString(x, y, "Reparaturdatum:")
    c.setFont("Helvetica-Bold", 10)
    datum = rep.reparaturdatum.strftime("%d.%m.%Y %H:%M:%S") if rep.reparaturdatum else "-"
    c.drawString(x + 42*mm, y, datum)
    y -= line_height
    
    # Schlüsselnr
    c.setFont("Helvetica", 10)
    c.drawString(x, y, "Schlüsselnr:")
    c.setFont("Helvetica-Bold", 10)
    c.drawString(x + 42*mm, y, rep.schluesselnummer or "-")
    y -= line_height * 1.8
    
    # Checkboxen (Anwesend & Bezahlt)
    draw_checkbox(c, x, y, rep.fahrrad_anwesend, "Anwesend")
    draw_checkbox(c, x + 45*mm, y, rep.bezahlt, "Bezahlt")
    y -= line_height * 2.2
    
    # Mängelbeschreibung (mehrzeilig!)
    c.setFont("Helvetica", 10)
    c.drawString(x, y, "Mängelbeschreibung:")
    y -= 5*mm
    
    # Textblock für Mängel (max 4 Zeilen)
    maengel = rep.maengelbeschreibung or "Keine Angabe"
    lines_used = draw_text_block(c, maengel, x + 3*mm, y, width=120*mm, max_lines=4)
    y -= (lines_used * 5*mm) + 3*mm
    
    # Status
    c.setFont("Helvetica", 10)
    c.drawString(x, y, "Status:")
    c.setFont("Helvetica-Bold", 10)
    c.drawString(x + 42*mm, y, rep.status or "-")
    y -= line_height
    
    # Fahrradmarke
    c.setFont("Helvetica", 10)
    c.drawString(x, y, "Fahrradmarke:")
    c.setFont("Helvetica-Bold", 10)
    marke = rep.fahrradmarke or "-"
    if rep.fahrradmodell:
        marke += f" ({rep.fahrradmodell})"
    c.drawString(x + 42*mm, y, marke[:40])  # Max 40 Zeichen
    y -= line_height
    
    # Kunde
    c.setFont("Helvetica", 10)
    c.drawString(x, y, "Kunde:")
    c.setFont("Helvetica-Bold", 10)
    c.drawString(x + 42*mm, y, (kunde_name or "-")[:35])  # Max 35 Zeichen
    y -= line_height
    
    # Abholtermin
    c.setFont("Helvetica", 10)
    c.drawString(x, y, "Abholtermin:")
    c.setFont("Helvetica-Bold", 10)
    c.drawString(x + 42*mm, y, rep.abholtermin or "-")
    y -= line_height
    
    # Telefon
    c.setFont("Helvetica", 10)
    c.drawString(x, y, "Telefon:")
    c.setFont("Helvetica-Bold", 10)
    c.drawString(x + 42*mm, y, kunde_telefon or "-")


def draw_checkbox(c, x, y, checked, label):
    """
    Zeichnet eine Checkbox mit Label
    
    Args:
        c: Canvas
        x, y: Position
        checked: Boolean - ist aktiviert?
        label: Text neben der Checkbox
    """
    # Box zeichnen
    c.setLineWidth(0.5)
    c.rect(x, y - 3*mm, 4*mm, 4*mm)
    
    # Häkchen falls aktiviert
    if checked:
        c.setFont("Helvetica-Bold", 14)
        c.drawString(x + 0.3*mm, y - 2.5*mm, "✓")
    
    # Label
    c.setFont("Helvetica", 10)
    c.drawString(x + 6*mm, y, label)


def draw_text_block(c, text, x, y, width, max_lines=4):
    """
    Mehrzeiliger Text mit automatischem Umbruch
    
    Args:
        c: Canvas
        text: Text-String (kann \n enthalten)
        x, y: Start-Position
        width: Maximale Breite
        max_lines: Maximale Anzahl Zeilen
        
    Returns:
        Anzahl gezeichneter Zeilen
    """
    lines = text.split("\n")
    lines_drawn = 0
    
    for i, line in enumerate(lines[:max_lines]):
        c.setFont("Helvetica", 9)
        
        # Text kürzen falls zu lang (ca. 60 Zeichen)
        if len(line) > 60:
            line = line[:57] + "..."
        
        c.drawString(x, y - i * 5*mm, line)
        lines_drawn += 1
    
    # Falls mehr Zeilen da sind als angezeigt
    if len(lines) > max_lines:
        c.setFont("Helvetica", 8)
        c.drawString(x, y - max_lines * 5*mm, "... (siehe Details)")
        lines_drawn += 1
    
    return lines_drawn


def draw_notizen_seite(c, width, height):
    """
    Rückseite mit Notizen-Linien
    
    Args:
        c: Canvas
        width: Seitenbreite
        height: Seitenhöhe
    """
    c.setStrokeColor(black)
    c.setFillColor(black)
    
    # Header
    c.setFont("Helvetica-Bold", 14)
    c.drawString(20*mm, height - 20*mm, "NOTIZEN:")
    
    # Linien für handschriftliche Notizen
    y = height - 30*mm
    c.setStrokeColor(grey)
    c.setLineWidth(0.3)
    
    for i in range(18):  # 18 Linien
        c.line(20*mm, y, width - 20*mm, y)
        y -= 9*mm
    
    c.showPage()  # Rückseite fertig


def get_kunde_display_name(rep) -> str:
    """
    Helper: Kunde-Name holen (DB oder Legacy)
    
    Args:
        rep: Reparatur-Objekt
        
    Returns:
        String mit Kundenname
    """
    if rep.kunde:
        # Aus Kundendatenbank
        vorname = rep.kunde.vorname or ""
        nachname = rep.kunde.nachname or ""
        
        if vorname and nachname:
            return f"{nachname}, {vorname}"
        elif nachname:
            return nachname
        else:
            return vorname or "Unbekannt"
    
    # Fallback: Legacy-Daten
    return rep.kunde_name_legacy or "Unbekannt"


def get_kunde_telefon(rep) -> str:
    """
    Helper: Telefon holen (DB oder Legacy)
    
    Args:
        rep: Reparatur-Objekt
        
    Returns:
        String mit Telefonnummer
    """
    if rep.kunde and rep.kunde.telefon:
        return rep.kunde.telefon
    
    return rep.kunde_telefon_legacy or "-"
