from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from datetime import date


def generate_offer_letter(
    file_path: str,
    candidate_name: str,
    designation: str,
    salary: str,
    joining_date: str,
    company_name: str,
):
    c = canvas.Canvas(file_path, pagesize=A4)
    width, height = A4

    c.setFont("Helvetica", 11)

    y = height - 50

    c.drawString(50, y, f"Date: {date.today()}")
    y -= 40

    c.drawString(50, y, f"Dear {candidate_name},")
    y -= 30

    text = c.beginText(50, y)
    text.textLine(
        f"We are pleased to offer you the position of {designation} at {company_name}."
    )
    text.textLine("")
    text.textLine(f"Your offered compensation will be {salary}.")
    text.textLine(f"Your date of joining will be {joining_date}.")
    text.textLine("")
    text.textLine(
        "You are requested to confirm acceptance of this offer."
    )
    text.textLine("")
    text.textLine("We look forward to working with you.")
    text.textLine("")
    text.textLine("Best Regards,")
    text.textLine(company_name)

    c.drawText(text)
    c.showPage()
    c.save()