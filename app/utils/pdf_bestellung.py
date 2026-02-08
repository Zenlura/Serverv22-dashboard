"""
PDF Generator für Bestellungen
Erstellt druckbare Bestelllisten für Lieferanten
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from datetime import datetime
from decimal import Decimal
from io import BytesIO
from typing import List


def generate_bestellung_pdf(bestellung, output_path: str = None) -> bytes:
    """
    Generiert PDF für Bestellung
    
    Args:
        bestellung: Bestellung Model mit .lieferant und .positionen
        output_path: Optional - Dateiname zum Speichern
        
    Returns:
        bytes: PDF als Bytes (für Download oder Speichern)
    """
    # Buffer für PDF
    buffer = BytesIO()
    
    # PDF erstellen
    doc = SimpleDocTemplate(
        buffer if not output_path else output_path,
        pagesize=A4,
        topMargin=15*mm,
        bottomMargin=15*mm,
        leftMargin=15*mm,
        rightMargin=15*mm,
    )
    
    # Styles
    styles = getSampleStyleSheet()
    
    # Custom Styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#1a1a1a'),
        spaceAfter=12,
        alignment=TA_CENTER,
    )
    
    header_style = ParagraphStyle(
        'CustomHeader',
        parent=styles['Heading2'],
        fontSize=12,
        textColor=colors.HexColor('#333333'),
        spaceAfter=6,
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#1a1a1a'),
    )
    
    small_style = ParagraphStyle(
        'CustomSmall',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#666666'),
    )
    
    # Story (Content)
    story = []
    
    # ========================================================================
    # TITEL
    # ========================================================================
    story.append(Paragraph("BESTELLUNG", title_style))
    story.append(Spacer(1, 6*mm))
    
    # ========================================================================
    # KOPFZEILE: Bestellnummer, Datum, Lieferant
    # ========================================================================
    
    # Bestellinfo (Links)
    bestellinfo_data = [
        ["Bestellnummer:", bestellung.bestellnummer],
        ["Datum:", datetime.now().strftime("%d.%m.%Y")],
        ["Status:", bestellung.status.upper()],
    ]
    
    if bestellung.bestellt_am:
        bestellinfo_data.append(["Bestellt am:", bestellung.bestellt_am.strftime("%d.%m.%Y")])
    
    bestellinfo_table = Table(bestellinfo_data, colWidths=[40*mm, 60*mm])
    bestellinfo_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#1a1a1a')),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    
    # Lieferant-Info (Rechts)
    lieferant = bestellung.lieferant
    lieferant_data = [
        [Paragraph("<b>Lieferant:</b>", normal_style)],
        [Paragraph(lieferant.name, normal_style)],
    ]
    
    if lieferant.kontakt_person:
        lieferant_data.append([Paragraph(f"Ansprechpartner: {lieferant.kontakt_person}", small_style)])
    if lieferant.telefon:
        lieferant_data.append([Paragraph(f"Tel: {lieferant.telefon}", small_style)])
    if lieferant.email:
        lieferant_data.append([Paragraph(f"Email: {lieferant.email}", small_style)])
    
    lieferant_table = Table(lieferant_data, colWidths=[80*mm])
    lieferant_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    
    # Beide Tabellen nebeneinander
    header_table = Table(
        [[bestellinfo_table, lieferant_table]],
        colWidths=[100*mm, 80*mm]
    )
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    
    story.append(header_table)
    story.append(Spacer(1, 8*mm))
    
    # ========================================================================
    # POSITIONEN-TABELLE
    # ========================================================================
    
    story.append(Paragraph("Bestellpositionen", header_style))
    story.append(Spacer(1, 3*mm))
    
    # Tabellen-Header
    positions_data = [
        ["Pos.", "Art.-Nr.", "Bezeichnung", "ETRTO", "Menge", "EK", "Summe EK"]
    ]
    
    # Positionen
    for idx, position in enumerate(bestellung.positionen, start=1):
        # ETRTO + Zoll Info
        etrto_display = ""
        if position.etrto:
            etrto_display = position.etrto
            if position.zoll_info:
                etrto_display += f"\n({position.zoll_info})"
        
        # Beschreibung (gekürzt wenn zu lang)
        beschreibung = position.beschreibung
        if len(beschreibung) > 60:
            beschreibung = beschreibung[:57] + "..."
        
        positions_data.append([
            str(idx),
            position.artikelnummer,
            beschreibung,
            etrto_display,
            str(position.menge_bestellt),
            f"{position.einkaufspreis:.2f} €",
            f"{position.summe_ek:.2f} €" if position.summe_ek else "-",
        ])
    
    # Summenzeile
    positions_data.append([
        "", "", "", "", "", 
        Paragraph("<b>Gesamt:</b>", normal_style),
        Paragraph(f"<b>{bestellung.gesamtsumme_ek:.2f} €</b>", normal_style) if bestellung.gesamtsumme_ek else "-"
    ])
    
    # Tabelle erstellen
    positions_table = Table(
        positions_data,
        colWidths=[10*mm, 25*mm, 65*mm, 25*mm, 15*mm, 20*mm, 25*mm]
    )
    
    positions_table.setStyle(TableStyle([
        # Header
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2563eb')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, 0), 'MIDDLE'),
        
        # Positionen
        ('FONTNAME', (0, 1), (-1, -2), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -2), 9),
        ('ALIGN', (0, 1), (0, -2), 'CENTER'),  # Pos.
        ('ALIGN', (4, 1), (4, -2), 'CENTER'),  # Menge
        ('ALIGN', (5, 1), (-1, -2), 'RIGHT'),  # Preise
        ('VALIGN', (0, 1), (-1, -2), 'TOP'),
        
        # Zebra-Streifen
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor('#f8f9fa')]),
        
        # Summenzeile
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#e5e7eb')),
        ('FONTNAME', (5, -1), (-1, -1), 'Helvetica-Bold'),
        ('LINEABOVE', (0, -1), (-1, -1), 2, colors.HexColor('#1a1a1a')),
        
        # Grid
        ('GRID', (0, 0), (-1, -2), 0.5, colors.HexColor('#d1d5db')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#1a1a1a')),
    ]))
    
    story.append(positions_table)
    story.append(Spacer(1, 8*mm))
    
    # ========================================================================
    # NOTIZEN
    # ========================================================================
    
    if bestellung.notizen:
        story.append(Paragraph("Notizen", header_style))
        story.append(Spacer(1, 2*mm))
        story.append(Paragraph(bestellung.notizen, normal_style))
        story.append(Spacer(1, 6*mm))
    
    # ========================================================================
    # FOOTER-INFO
    # ========================================================================
    
    footer_text = f"""
    <font size=8 color="#666666">
    Erstellt am: {datetime.now().strftime("%d.%m.%Y %H:%M")} Uhr<br/>
    Anzahl Positionen: {len(bestellung.positionen)}<br/>
    System: Fahrradwerkstatt Dashboard v2.0
    </font>
    """
    
    story.append(Spacer(1, 10*mm))
    story.append(Paragraph(footer_text, small_style))
    
    # ========================================================================
    # PDF BAUEN
    # ========================================================================
    
    doc.build(story)
    
    # Bytes zurückgeben
    if not output_path:
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes
    
    return None


def generate_bestellung_pdf_response(bestellung):
    """
    Generiert PDF als FastAPI Response
    
    Usage in Router:
        from fastapi.responses import StreamingResponse
        
        @router.get("/{bestellung_id}/pdf")
        def download_pdf(bestellung_id: int, db: Session = Depends(get_db)):
            bestellung = db.query(Bestellung).get(bestellung_id)
            return generate_bestellung_pdf_response(bestellung)
    """
    from fastapi.responses import StreamingResponse
    
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
