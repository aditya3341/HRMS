import sqlite3, json

conn = sqlite3.connect('hr_os.db')
c = conn.cursor()

# Fix attendance mode to allow manual check-in
new_config = json.dumps({
    'mode': 'MANUAL',
    'allow_manual': True,
    'auto_calculate_hours': True,
    'first_in_last_out': True
})
c.execute("UPDATE system_configs SET config_value=? WHERE config_key='ATTENDANCE_MODE_CONFIG'", (new_config,))
print('Attendance mode rows updated:', c.rowcount)

# Check entities
c.execute('SELECT id, name, code FROM entities')
entities = c.fetchall()
print('Entities:', entities)

# Check performance cycles
c.execute('SELECT COUNT(*) FROM performance_cycles')
print('Performance cycles:', c.fetchone()[0])

# Check it_assets in sqlite
c.execute('SELECT COUNT(*) FROM it_assets')
print('IT assets (sqlite):', c.fetchone()[0])

# Check departments
c.execute('SELECT id, name, entity_id FROM departments LIMIT 5')
print('Departments:', c.fetchall())

conn.commit()
conn.close()
print('Done')
