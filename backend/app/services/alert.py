import os
import smtplib
from email.mime.text import MIMEText

SMTP_EMAIL = os.getenv("SMTP_EMAIL", "")
SMTP_APP_PASSWORD = os.getenv("SMTP_APP_PASSWORD", "")
ALERT_TEST_EMAIL = os.getenv("ALERT_TEST_EMAIL", "")


def send_authority_alert(incident, authority_name: str, distance_km: float):
    if not (SMTP_EMAIL and SMTP_APP_PASSWORD and ALERT_TEST_EMAIL):
        print("⚠️ Alert not sent — SMTP credentials missing in .env")
        return False

    subject = f"🔥 FireGuard Alert: Wildfire detected near {authority_name}"
    body = (
        f"WILDFIRE DETECTION ALERT (SIMULATED AUTHORITY ROUTING)\n\n"
        f"Nearest responding office: {authority_name} (~{distance_km} km away)\n\n"
        f"Location: {incident.lat:.4f}, {incident.lng:.4f}\n"
        f"Detected: {incident.timestamp}\n"
        f"Source: {incident.source}\n"
        f"Detection confidence: {incident.confidence * 100:.1f}%\n\n"
        f"This is a demo alert from FireGuard Nexus. In production, this would route\n"
        f"to the real district forest office's contact on file."
    )

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = SMTP_EMAIL
    msg["To"] = ALERT_TEST_EMAIL

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(SMTP_EMAIL, SMTP_APP_PASSWORD)
            server.sendmail(SMTP_EMAIL, ALERT_TEST_EMAIL, msg.as_string())
        print(f"✅ Alert email sent to {ALERT_TEST_EMAIL}")
        return True
    except Exception as e:
        print(f"❌ Failed to send alert email: {e}")
        return False