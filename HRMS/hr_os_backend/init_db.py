import sys
import os
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from urllib.parse import urlparse, unquote
from sqlalchemy import create_engine, text

# ============================================================
# ENSURE PROJECT ROOT IS IN PYTHONPATH
# ============================================================
sys.path.append(os.getcwd())

from app.core.database import Base, DATABASE_DISABLED, DATABASE_URL

# ============================================================
# EXPLICIT MODEL IMPORTS (Crucial for MetaData registration)
# ============================================================
try:
    from app.models.entity import Entity
    from app.models.user import User
    from app.models.notification import Notification
    from app.models.leave import Leave
    from app.models.audit_log import AuditLog
    from app.models.job import Job
    from app.models.application import Application
    from app.models.interview_log import InterviewLog
    from app.models.offer import Offer
    from app.models.employee import Employee
    from app.models.attendance import Attendance
    from app.models.biometric_device import BiometricDevice
    from app.models.salary_structure import SalaryStructure
    from app.models.payroll import Payroll
    from app.models.it_asset import ITAsset
    from app.models.it_ticket import ITTicket
    from app.models.permission import Permission
    from app.models.role_permission import RolePermission
except ImportError as e:
    print(f"❌ Error importing models: {e}")
    sys.exit(1)

def initialize_database():
    if DATABASE_DISABLED:
        print("Database initialization skipped: database access is disabled for this project.")
        return

    print("🚀 Starting Production-Grade Database Initialization...")
    
    # 1. Parse connection details
    try:
        url = urlparse(DATABASE_URL)
        db_name = url.path.lstrip('/')
        db_user = url.username
        # Handle percent-encoded passwords (common with special characters)
        db_password = unquote(url.password) if url.password else None
        db_host = url.hostname
        db_port = url.port or 5432
        
        print(f"📡 Target Host: {db_host}:{db_port}")
        print(f"📦 Target Database: {db_name}")
    except Exception as e:
        print(f"❌ Failed to parse DATABASE_URL: {e}")
        sys.exit(1)

    # 2. CREATE DATABASE if not exists using psycopg2
    try:
        # Connect to default 'postgres' database to perform administrative tasks
        conn = psycopg2.connect(
            dbname='postgres',
            user=db_user,
            password=db_password,
            host=db_host,
            port=db_port
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        
        # Check if database exists
        cur.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = %s", (db_name,))
        exists = cur.fetchone()
        
        if not exists:
            print(f"🛠️ Creating database '{db_name}'...")
            cur.execute(f"CREATE DATABASE {db_name}")
            print("✅ Database created successfully.")
        else:
            print(f"ℹ️ Database '{db_name}' already exists.")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"⚠️ Note on DB creation: {e}")
        print("   (The database might already exist or you might not have 'CREATE DATABASE' privileges)")

    # 3. INITIALIZE SQLALCHEMY ENGINE & TABLES
    try:
        print("🔗 Connecting to engine...")
        engine = create_engine(DATABASE_URL, pool_pre_ping=True)
        
        print("🏗️ Creating tables from SQLAlchemy Base.metadata...")
        Base.metadata.create_all(bind=engine)
        print("✅ Tables created or already exist.")
        
        # 4. VERIFY TABLES using information_schema
        print("\n🔍 Verifying schema creation...")
        with engine.connect() as conn:
            query = text(
                "SELECT table_name "
                "FROM information_schema.tables "
                "WHERE table_schema = 'public' "
                "ORDER BY table_name;"
            )
            result = conn.execute(query)
            tables = [row[0] for row in result]
            
            if tables:
                print(f"✨ Found {len(tables)} tables in 'public' schema:")
                for table in tables:
                    print(f"   - {table}")
            else:
                print("❌ No tables found in 'public' schema!")
                
        print("\n🎉 SETUP COMPLETE: Your HR OS database is ready for production.")
        
    except Exception as e:
        print(f"❌ Critical error during initialization: {e}")
        sys.exit(1)

if __name__ == "__main__":
    initialize_database()
