import sqlite3
conn = sqlite3.connect('hr_os.db')
c = conn.cursor()

# Show tables
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [t[0] for t in c.fetchall()]
print('Tables:', tables)

# Check system_config
if 'system_configs' in tables:
    c.execute("SELECT config_key, config_value FROM system_configs WHERE config_key='ATTENDANCE_MODE_CONFIG'")
    row = c.fetchone()
    print('Attendance Config:', row)
elif 'system_config' in tables:
    c.execute("SELECT config_key, config_value FROM system_config WHERE config_key='ATTENDANCE_MODE_CONFIG'")
    row = c.fetchone()
    print('Attendance Config:', row)

c.execute('SELECT COUNT(*) FROM leaves')
print('Leaves:', c.fetchone()[0])

c.execute('SELECT COUNT(*) FROM leave_types')
print('Leave types:', c.fetchone()[0])

c.execute('SELECT name, code, max_per_year, is_paid FROM leave_types LIMIT 5')
print('Leave types sample:', c.fetchall())

c.execute('SELECT COUNT(*) FROM holidays')
print('Holidays:', c.fetchone()[0])

c.execute('SELECT COUNT(*) FROM leave_balances')
print('Leave balances:', c.fetchone()[0])

conn.close()
