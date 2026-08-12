from app.core.database import SessionLocal, Base, engine
from app.models.entity import Entity
from app.models.user import User
from app.models.employee import Employee
from app.models.application import Application
from app.models.job import Job
from app.models.ticket import Ticket, TicketComment, TicketActivity
from app.models.enums import TicketStatus, SLAStatus
from datetime import datetime, timedelta
import uuid

def test_create_ticket_raw():
    db = SessionLocal()
    try:
        # 1. Get IDs
        me = db.query(Employee).filter(Employee.email == 'rahul@company.com').first()
        if not me:
            print("Rahul employee not found")
            return
            
        # 2. Create Ticket
        t = Ticket(
            id=uuid.uuid4(),
            entity_id=me.entity_id,
            title='IT Help',
            description='Test description',
            category='IT',
            priority='HIGH',
            status='OPEN',
            created_by=me.id,
            sla_deadline=datetime.utcnow() + timedelta(hours=24),
            sla_status='ON_TRACK'
        )
        db.add(t)
        db.commit()
        print(f"Ticket created successfully: {t.id}")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_create_ticket_raw()
