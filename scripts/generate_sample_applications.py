import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm

OUTPUT_DIR = r"d:\Projects\HKTN\Anazori-26\Anazori\public\applications"

def get_letter_styles():
    styles = getSampleStyleSheet()
    
    styles.add(ParagraphStyle(
        name='LetterDate',
        fontName='Times-Roman',
        fontSize=11,
        leading=15,
        textColor=colors.black,
        alignment=2 # Right
    ))
    styles.add(ParagraphStyle(
        name='LetterRecipient',
        fontName='Times-Roman',
        fontSize=11,
        leading=16,
        textColor=colors.black,
        alignment=0 # Left
    ))
    styles.add(ParagraphStyle(
        name='ThroughChannel',
        fontName='Times-Italic',
        fontSize=10.5,
        leading=15,
        textColor=colors.black,
        alignment=0
    ))
    styles.add(ParagraphStyle(
        name='LetterSubject',
        fontName='Times-Bold',
        fontSize=11,
        leading=16,
        textColor=colors.black,
        alignment=0,
        spaceBefore=8,
        spaceAfter=8
    ))
    styles.add(ParagraphStyle(
        name='Salutation',
        fontName='Times-Roman',
        fontSize=11,
        leading=15,
        textColor=colors.black,
        spaceBefore=4,
        spaceAfter=6
    ))
    styles.add(ParagraphStyle(
        name='LetterBody',
        fontName='Times-Roman',
        fontSize=11,
        leading=17,
        textColor=colors.black,
        alignment=4, # Justify
        firstLineIndent=24,
        spaceAfter=10
    ))
    styles.add(ParagraphStyle(
        name='LetterBodyNoIndent',
        fontName='Times-Roman',
        fontSize=11,
        leading=17,
        textColor=colors.black,
        alignment=4, # Justify
        spaceAfter=10
    ))
    styles.add(ParagraphStyle(
        name='BulletItem',
        fontName='Times-Roman',
        fontSize=10.5,
        leading=15,
        textColor=colors.black,
        leftIndent=15,
        spaceAfter=4
    ))
    styles.add(ParagraphStyle(
        name='Closing',
        fontName='Times-Roman',
        fontSize=11,
        leading=16,
        textColor=colors.black,
        spaceBefore=10
    ))
    styles.add(ParagraphStyle(
        name='Signatory',
        fontName='Times-Roman',
        fontSize=11,
        leading=15,
        textColor=colors.black,
        alignment=2 # Right
    ))
    return styles

# ==============================================================================
# APPLICATION 1: URGENT PROPERTY REPAIR / ELECTRICAL HAZARD
# ==============================================================================
def generate_application_1(styles):
    pdf_path = os.path.join(OUTPUT_DIR, "template-1-estate-repair-requisition.pdf")
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        leftMargin=22 * mm,
        rightMargin=22 * mm,
        topMargin=22 * mm,
        bottomMargin=22 * mm
    )
    story = []
    
    # Date on top right
    story.append(Paragraph("Date: 04 November 2026", styles['LetterDate']))
    story.append(Spacer(1, 4 * mm))
    
    # Recipient
    to_text = (
        "To,<br/>"
        "<b>The Vice-Chancellor</b>,<br/>"
        "Dibrugarh University,<br/>"
        "Dibrugarh, Assam - 786004."
    )
    story.append(Paragraph(to_text, styles['LetterRecipient']))
    story.append(Spacer(1, 2 * mm))
    
    # Through channel
    story.append(Paragraph("[Through Proper Channel: Office of the Hostel Warden / Estate Officer]", styles['ThroughChannel']))
    story.append(Spacer(1, 4 * mm))
    
    # Subject
    sub_text = "<b>Subject: Application regarding urgent repair of broken water supply pipeline and electrical hazard at Boys' Hostel Block B.</b>"
    story.append(Paragraph(sub_text, styles['LetterSubject']))
    story.append(Spacer(1, 2 * mm))
    
    # Salutation
    story.append(Paragraph("Respected Sir,", styles['Salutation']))
    story.append(Spacer(1, 2 * mm))
    
    # Body Paragraphs
    p1 = (
        "I would like to bring to your kind notice an urgent infrastructure problem at "
        "<b>Padma Nath Gohain Baruah Chatra Nivas (Boys' Hostel Block B)</b>. The main 25mm GI water pipeline "
        "on the first floor washroom has severely ruptured, resulting in continuous water accumulation in the corridor "
        "and adjacent student rooms."
    )
    story.append(Paragraph(p1, styles['LetterBody']))
    
    p2 = (
        "More critically, the water leakage is seeping into the main MCB electrical sub-distribution board outside Room 104, "
        "causing recurrent sparking and circuit tripping. This poses an immediate electrical and fire hazard to the resident students. "
        "The issue was logged on the campus grievance redressal portal (Ticket #DU-2026-0842) and has been endorsed by 48 resident "
        "students requesting urgent action."
    )
    story.append(Paragraph(p2, styles['LetterBody']))
    
    p3 = (
        "In view of the serious inconvenience and safety risk to students, I earnestly request your kind approval to direct "
        "the <b>University Engineer (Planning & Construction Branch)</b> to conduct an immediate on-site inspection and carry out "
        "the necessary repair and electrical weatherproofing work on priority."
    )
    story.append(Paragraph(p3, styles['LetterBody']))
    story.append(Spacer(1, 4 * mm))
    
    story.append(Paragraph("Thanking you.", styles['Closing']))
    story.append(Spacer(1, 8 * mm))
    
    # Signatures
    sig_data = [
        [
            Paragraph("", styles['Signatory']),
            Paragraph("Yours faithfully,<br/><br/><br/>____________________________________<br/>"
                      "<b>Dr. H. K. Borah</b><br/>"
                      "Warden, P.N.G.B.C.N. Hostel<br/>"
                      "Dibrugarh University", styles['Signatory'])
        ]
    ]
    t_sig = Table(sig_data, colWidths=[80 * mm, 85 * mm])
    t_sig.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ALIGN', (1,0), (1,-1), 'RIGHT'),
    ]))
    story.append(KeepTogether(t_sig))
    
    doc.build(story)
    print("Generated Clean Application 1:", pdf_path)

# ==============================================================================
# APPLICATION 2: NEW FACILITY INSTALLATION (WATER PURIFIER & LIGHTING)
# ==============================================================================
def generate_application_2(styles):
    pdf_path = os.path.join(OUTPUT_DIR, "template-2-new-installation-proposal.pdf")
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        leftMargin=22 * mm,
        rightMargin=22 * mm,
        topMargin=22 * mm,
        bottomMargin=22 * mm
    )
    story = []
    
    story.append(Paragraph("Date: 04 November 2026", styles['LetterDate']))
    story.append(Spacer(1, 4 * mm))
    
    to_text = (
        "To,<br/>"
        "<b>The Vice-Chancellor</b>,<br/>"
        "Dibrugarh University,<br/>"
        "Dibrugarh, Assam - 786004."
    )
    story.append(Paragraph(to_text, styles['LetterRecipient']))
    story.append(Spacer(1, 2 * mm))
    
    story.append(Paragraph("[Through Proper Channel: Office of the Dean, Student Welfare]", styles['ThroughChannel']))
    story.append(Spacer(1, 4 * mm))
    
    sub_text = "<b>Subject: Application for installation of Commercial RO Drinking Water Station and Pathway Solar Lights along Central Library Walkway.</b>"
    story.append(Paragraph(sub_text, styles['LetterSubject']))
    story.append(Spacer(1, 2 * mm))
    
    story.append(Paragraph("Respected Sir,", styles['Salutation']))
    story.append(Spacer(1, 2 * mm))
    
    p1 = (
        "With due respect, I wish to submit a proposal for the installation of essential student amenities along the central "
        "academic corridor connecting the <b>Lakshminath Bezbaroa Central Library</b> and the <b>Centre for Computer Science and "
        "Applications (CCSA)</b>."
    )
    story.append(Paragraph(p1, styles['LetterBody']))
    
    p2 = (
        "Presently, over 2,000 students and research scholars use this academic walkway daily. Due to the lack of purified drinking "
        "water facilities in this zone, students face acute difficulty during long study hours. Furthermore, the lack of sufficient pathway "
        "lighting poses security concerns for female students and scholars walking to and from the library during late evening hours. "
        "Over 340 students have formally petitioned for these facilities on the campus redressal portal."
    )
    story.append(Paragraph(p2, styles['LetterBody']))
    
    p3 = (
        "In accordance with <b>NAAC Key Indicator 4.1 (Campus Facilities)</b> and UGC student welfare guidelines, I kindly request your "
        "favourable consideration to sanction the following installations:"
    )
    story.append(Paragraph(p3, styles['LetterBody']))
    
    b1 = "• <b>1x Commercial RO Water Kiosk (500 LPH with UV sterilization)</b> near the Central Library forecourt entrance."
    b2 = "• <b>4x Integrated Solar LED Street Luminaires</b> along the pedestrian pathway between Library and CCSA."
    story.append(Paragraph(b1, styles['BulletItem']))
    story.append(Paragraph(b2, styles['BulletItem']))
    story.append(Spacer(1, 3 * mm))
    
    p4 = (
        "Your kind approval for administrative and technical feasibility assessment by the Planning & Development Section "
        "will greatly benefit the entire university student community."
    )
    story.append(Paragraph(p4, styles['LetterBody']))
    story.append(Spacer(1, 4 * mm))
    
    story.append(Paragraph("Thanking you.", styles['Closing']))
    story.append(Spacer(1, 8 * mm))
    
    sig_data = [
        [
            Paragraph("", styles['Signatory']),
            Paragraph("Yours faithfully,<br/><br/><br/>____________________________________<br/>"
                      "<b>Prof. A. Baruah</b><br/>"
                      "Dean, Student Welfare<br/>"
                      "Dibrugarh University", styles['Signatory'])
        ]
    ]
    t_sig = Table(sig_data, colWidths=[80 * mm, 85 * mm])
    t_sig.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ALIGN', (1,0), (1,-1), 'RIGHT'),
    ]))
    story.append(KeepTogether(t_sig))
    
    doc.build(story)
    print("Generated Clean Application 2:", pdf_path)

# ==============================================================================
# APPLICATION 3: STUDENT GRIEVANCE / EXAMINATION DISCREPANCY
# ==============================================================================
def generate_application_3(styles):
    pdf_path = os.path.join(OUTPUT_DIR, "template-3-student-grievance-redressal.pdf")
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        leftMargin=22 * mm,
        rightMargin=22 * mm,
        topMargin=22 * mm,
        bottomMargin=22 * mm
    )
    story = []
    
    story.append(Paragraph("Date: 04 November 2026", styles['LetterDate']))
    story.append(Spacer(1, 4 * mm))
    
    to_text = (
        "To,<br/>"
        "<b>The Vice-Chancellor</b>,<br/>"
        "Dibrugarh University,<br/>"
        "Dibrugarh, Assam - 786004."
    )
    story.append(Paragraph(to_text, styles['LetterRecipient']))
    story.append(Spacer(1, 2 * mm))
    
    story.append(Paragraph("[Through Proper Channel: The Controller of Examinations / Convener, Grievance Cell]", styles['ThroughChannel']))
    story.append(Spacer(1, 4 * mm))
    
    sub_text = "<b>Subject: Application regarding resolution of clerical grade discrepancy in End-Semester Examination Marksheet.</b>"
    story.append(Paragraph(sub_text, styles['LetterSubject']))
    story.append(Spacer(1, 2 * mm))
    
    story.append(Paragraph("Respected Sir,", styles['Salutation']))
    story.append(Spacer(1, 2 * mm))
    
    p1 = (
        "I beg to place before your kind authority a genuine grievance submitted by <b>Sri Arnab Jyoti Saikia</b>, "
        "a bona fide student of <b>M.Sc. Applied Geology (Semester IV)</b>, Roll No. 220410140029, Registration No. DU-2022-REG-8472."
    )
    story.append(Paragraph(p1, styles['LetterBody']))
    
    p2 = (
        "In the recently declared End-Semester results, the candidate has been erroneously marked as 'Absent' in Paper AG402 (Geodynamics). "
        "Upon preliminary examination of the exam centre dispatch register and examination attendance sheet, it is verified that the "
        "student was present throughout the examination and duly signed the attendance voucher. The error appears to be a clerical omission "
        "during the tabulation phase."
    )
    story.append(Paragraph(p2, styles['LetterBody']))
    
    p3 = (
        "As the candidate requires the final marksheet for upcoming national fellowship admissions, I humbly request your kind authority "
        "to instruct the Examination Branch to verify the original answer script and issue a rectified marksheet at the earliest."
    )
    story.append(Paragraph(p3, styles['LetterBody']))
    story.append(Spacer(1, 4 * mm))
    
    story.append(Paragraph("Thanking you.", styles['Closing']))
    story.append(Spacer(1, 8 * mm))
    
    sig_data = [
        [
            Paragraph("Enclosures:<br/>1. Copy of Admit Card<br/>2. Certified Attendance Slip", styles['LetterRecipient']),
            Paragraph("Yours faithfully,<br/><br/><br/>____________________________________<br/>"
                      "<b>Dr. P. Chetia</b><br/>"
                      "Head, Department of Applied Geology<br/>"
                      "Dibrugarh University", styles['Signatory'])
        ]
    ]
    t_sig = Table(sig_data, colWidths=[80 * mm, 85 * mm])
    t_sig.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ALIGN', (1,0), (1,-1), 'RIGHT'),
    ]))
    story.append(KeepTogether(t_sig))
    
    doc.build(story)
    print("Generated Clean Application 3:", pdf_path)

if __name__ == "__main__":
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    styles = get_letter_styles()
    generate_application_1(styles)
    generate_application_2(styles)
    generate_application_3(styles)
    print("Regenerated all 3 simple letter applications (NO LOGOS, NO TABLES) successfully!")
