import smtplib
from email.message import EmailMessage


def send_offer_email(
    to_email: str,
    subject: str,
    body: str,
    attachment_path: str,
):
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = "yourcompany@gmail.com"
    msg["To"] = to_email
    msg.set_content(body)

    with open(attachment_path, "rb") as f:
        file_data = f.read()
        file_name = attachment_path.split("/")[-1]

    msg.add_attachment(
        file_data,
        maintype="application",
        subtype="pdf",
        filename=file_name,
    )

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
        smtp.login("ashish@zipaworld.com", "ixlw lpbs jzku hvhb")
        smtp.send_message(msg)