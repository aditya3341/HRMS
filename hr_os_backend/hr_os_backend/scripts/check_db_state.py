import sqlite3
import sys
sys.stdout.reconfigure(encoding='utf-8')

conn = sqlite3.connect('hr_os.db')
c = conn.cursor()

c.execute('SELECT COUNT(*) FROM permissions')
print('Permissions:', c.fetchone()[0])

c.execute('SELECT COUNT(*) FROM role_permissions')
print('Role-permissions:', c.fetchone()[0])

c.execute('SELECT DISTINCT role FROM role_permissions')
print('Roles with perms:', [r[0] for r in c.fetchall()])

c.execute('SELECT email FROM employees WHERE user_id IS NULL LIMIT 5')
print('Employees without user:', c.fetchall())

c.execute("SELECT email, role FROM users WHERE employee_id IS NULL LIMIT 5")
print('Users without employee:', c.fetchall())

conn.close()
