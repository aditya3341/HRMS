import sqlite3
import os

db_path = "D:\\Projects_Core\\HRMS\\hr_os_backend\\sql_app.db"

if not os.path.exists(db_path):
    print(f"ERROR: DB path {db_path} does not exist.")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print(f"Tables in {db_path}: {[t[0] for t in tables]}")
    conn.close()
