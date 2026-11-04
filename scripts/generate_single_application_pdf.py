import sys
import json
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm

def generate_pdf(data, output_path):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm
    )
    
    styles = getSampleStyleSheet()
    
    date_style = ParagraphStyle(
        'DateStyle',
        fontName='Times-Roman',
        fontSize=11,
        leading=15,
        alignment=2 # Right
    )
    
    recipient_style = ParagraphStyle(
        'RecipientStyle',
        fontName='Times-Roman',
        fontSize=11,
        leading=15,
        alignment=0
    )
    
    channel_style = ParagraphStyle(
        'ChannelStyle',
        fontName='Times-Italic',
        fontSize=10,
        leading=14,
        alignment=0
    )
    
    subject_style = ParagraphStyle(
        'SubjectStyle',
        fontName='Times-Bold',
        fontSize=11,
        leading=15,
        alignment=0,
        spaceBefore=6,
        spaceAfter=6
    )
    
    salutation_style = ParagraphStyle(
        'SalutationStyle',
        fontName='Times-Roman',
        fontSize=11,
        leading=15,
        alignment=0,
        spaceAfter=6
    )
    
    body_style = ParagraphStyle(
        'BodyStyle',
        fontName='Times-Roman',
        fontSize=11,
        leading=16,
        alignment=4, # Justified
        firstLineIndent=24,
        spaceAfter=8
    )
    
    closing_style = ParagraphStyle(
        'ClosingStyle',
        fontName='Times-Roman',
        fontSize=11,
        leading=15,
        spaceBefore=8,
        spaceAfter=14
    )
    
    enclosure_style = ParagraphStyle(
        'EnclosureStyle',
        fontName='Times-Roman',
        fontSize=9.5,
        leading=13,
        alignment=0
    )
    
    sig_style = ParagraphStyle(
        'SigStyle',
        fontName='Times-Roman',
        fontSize=10.5,
        leading=14,
        alignment=2 # Right
    )
    
    story = []
    
    # 1. Date
    date_val = data.get('date', '04 November 2026')
    story.append(Paragraph(f"Date: {date_val}", date_style))
    story.append(Spacer(1, 3 * mm))
    
    # 2. Recipient
    rec_title = data.get('recipientTitle', 'The Vice-Chancellor')
    rec_inst = data.get('recipientInstitution', 'Dibrugarh University, Dibrugarh, Assam - 786004')
    story.append(Paragraph(f"To,<br/><b>{rec_title}</b>,<br/>{rec_inst}.", recipient_style))
    story.append(Spacer(1, 2 * mm))
    
    # 3. Through Channel
    channel = data.get('throughChannel', '')
    if channel:
        story.append(Paragraph(f"<i>{channel}</i>", channel_style))
        story.append(Spacer(1, 3 * mm))
    
    # 4. Subject
    subject = data.get('subject', 'Application regarding campus infrastructure issue')
    story.append(Paragraph(f"<b>Subject: {subject}</b>", subject_style))
    story.append(Spacer(1, 2 * mm))
    
    # 5. Salutation
    story.append(Paragraph("Respected Sir,", salutation_style))
    story.append(Spacer(1, 2 * mm))
    
    # 6. Paragraphs
    p1 = data.get('p1', '')
    p2 = data.get('p2', '')
    p3 = data.get('p3', '')
    
    if p1:
        story.append(Paragraph(p1, body_style))
    if p2:
        story.append(Paragraph(p2, body_style))
    if p3:
        story.append(Paragraph(p3, body_style))
        
    story.append(Spacer(1, 2 * mm))
    story.append(Paragraph("Thanking you.", closing_style))
    story.append(Spacer(1, 4 * mm))
    
    # 7. Signatory & Enclosures side by side
    enclosures = data.get('enclosures', [])
    enclosure_text = "<b>Enclosures:</b><br/>"
    for idx, enc in enumerate(enclosures, 1):
        enclosure_text += f"{idx}. {enc}<br/>"
        
    sender_name = data.get('senderName', 'Dr. H. K. Borah')
    sender_desig = data.get('senderDesignation', 'Warden / Head of Department')
    sender_dept = data.get('senderDepartment', 'Dibrugarh University')
    
    sig_text = (
        "Yours faithfully,<br/><br/><br/>"
        "____________________________________<br/>"
        f"<b>{sender_name}</b><br/>"
        f"{sender_desig}<br/>"
        f"{sender_dept}<br/>"
        "Dibrugarh University"
    )
    
    bottom_table = Table(
        [
            [Paragraph(enclosure_text, enclosure_style), Paragraph(sig_text, sig_style)]
        ],
        colWidths=[80 * mm, 90 * mm]
    )
    bottom_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'BOTTOM'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))
    
    story.append(KeepTogether(bottom_table))
    doc.build(story)

if __name__ == '__main__':
    raw_data = sys.stdin.read()
    payload = json.loads(raw_data)
    out_file = sys.argv[1] if len(sys.argv) > 1 else 'output.pdf'
    generate_pdf(payload, out_file)
    print("SUCCESS")

