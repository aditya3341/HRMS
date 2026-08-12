from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
import os

def generate_payslip_pdf(
    employee_name: str,
    employee_code: str,
    month: str,
    basic: float,
    hra: float,
    allowances: float,
    bonus: float,
    pf: float,
    esi: float,
    pt: float,
    tds: float,
    leave_deduction: float,
    gross: float,
    net: float,
    file_path: str,
):
    doc = SimpleDocTemplate(file_path, pagesize=A4)
    elements = []
    styles = getSampleStyleSheet()
    
    # Custom Styles
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor("#6366f1"),
        alignment=1,
        spaceAfter=30
    )
    
    header_style = ParagraphStyle(
        'HeaderStyle',
        parent=styles['Normal'],
        fontSize=12,
        textColor=colors.grey,
        spaceAfter=5
    )

    # 1. Title
    elements.append(Paragraph("HR OS PAYSLIP", title_style))
    elements.append(Spacer(1, 20))
    
    # 2. Employee Info
    info_data = [
        [Paragraph(f"<b>Employee Name:</b> {employee_name}", header_style), Paragraph(f"<b>Month:</b> {month}", header_style)],
        [Paragraph(f"<b>Employee ID:</b> {employee_code}", header_style), Paragraph(f"<b>Status:</b> PAID", header_style)]
    ]
    info_table = Table(info_data, colWidths=[250, 250])
    elements.append(info_table)
    elements.append(Spacer(1, 30))
    
    # 3. Salary Breakdown Table
    data = [
        ["EARNINGS", "AMOUNT", "DEDUCTIONS", "AMOUNT"],
        ["Basic Salary", f"INR {basic:,.2f}", "Provident Fund (PF)", f"INR {pf:,.2f}"],
        ["HRA", f"INR {hra:,.2f}", "ESI", f"INR {esi:,.2f}"],
        ["Allowances", f"INR {allowances:,.2f}", "Professional Tax", f"INR {pt:,.2f}"],
        ["Bonus", f"INR {bonus:,.2f}", "Income Tax (TDS)", f"INR {tds:,.2f}"],
        ["", "", "Leave Deduction", f"INR {leave_deduction:,.2f}"],
        ["", "", "", ""],
        ["TOTAL GROSS", f"INR {gross:,.2f}", "TOTAL DEDUCTIONS", f"INR {(pf+esi+pt+tds+leave_deduction):,.2f}"]
    ]
    
    salary_table = Table(data, colWidths=[150, 100, 150, 100])
    salary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f8fafc")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#64748b")),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor("#f1f5f9")),
    ]))
    
    elements.append(salary_table)
    elements.append(Spacer(1, 40))
    
    # 4. Net Salary Highlight
    net_data = [[f"NET TAKE-HOME: INR {net:,.2f}"]]
    net_table = Table(net_data, colWidths=[500])
    net_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), colors.HexColor("#6366f1")),
        ('TEXTCOLOR', (0, 0), (0, 0), colors.white),
        ('ALIGN', (0, 0), (0, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (0, 0), 16),
        ('TOPPADDING', (0, 0), (0, 0), 20),
        ('BOTTOMPADDING', (0, 0), (0, 0), 20),
    ]))
    
    elements.append(net_table)
    
    # Build PDF
    doc.build(elements)