# Fichier temporaire: storage/migrate_add_category.py

import sqlite3
from pathlib import Path

db_path = Path(__file__).parent / "jobs.db"

with sqlite3.connect(db_path) as conn:
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE jobs ADD COLUMN category TEXT")
        print("✅ Colonne 'category' ajoutée à la base.")
    except sqlite3.OperationalError as e:
        print(f"⚠️ La colonne existe peut-être déjà : {e}")
    conn.commit()
