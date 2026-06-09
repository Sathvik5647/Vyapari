"""
migrate_add_role.py — Add 'role' column to users table if it doesn't exist yet
Run once: venv\Scripts\python migrate_add_role.py
"""
from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    # Check if column already exists
    result = conn.execute(text(
        "SELECT COUNT(*) FROM information_schema.COLUMNS "
        "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'"
    ))
    exists = result.scalar()
    
    if not exists:
        conn.execute(text(
            "ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'customer'"
        ))
        conn.commit()
        print("OK: Added 'role' column to users table.")
    else:
        print("OK: 'role' column already exists -- nothing to do.")
