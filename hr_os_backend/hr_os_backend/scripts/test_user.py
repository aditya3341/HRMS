import sqlite3
import os
from dotenv import load_dotenv

load_dotenv()
print("DEV_ADMIN_EMAIL from env:", os.getenv("DEV_ADMIN_EMAIL"))

conn = sqlite3.connect('hr_os.db')
c = conn.cursor()
c.execute("SELECT email, entity_id FROM users")
users = c.fetchall()

admin_zipa = [u for u in users if u[0] == 'admin@zipaworld.com']
print("admin@zipaworld.com:", admin_zipa)

admin_aaa2 = [u for u in users if u[0] == 'admin@aaa2.com']
print("admin@aaa2.com:", admin_aaa2)

from app.auth.deps import get_dev_admin_payload, DEV_ADMIN_EMAIL
print("DEV_ADMIN_EMAIL from deps:", DEV_ADMIN_EMAIL)
try:
    print("Payload:", get_dev_admin_payload())
except Exception as e:
    print("Payload error:", e)
