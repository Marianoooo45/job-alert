# Fichier: storage/sqlite_repo.py

import sqlite3
import pathlib
# --- IMPORT MODIFIÉ POUR AJOUTER timezone ---
from datetime import datetime, timedelta, timezone 
from models import JobPosting

DB_FILE = pathlib.Path(__file__).parent / "jobs.db"

def _get_connection():
    return sqlite3.connect(DB_FILE)

def init_db():
    with _get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS jobs (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                company TEXT,
                location TEXT,
                link TEXT NOT NULL UNIQUE,
                posted TEXT NOT NULL,
                source TEXT NOT NULL,
                keyword TEXT NOT NULL,
                category TEXT,
                contract_type TEXT
            );
        """)
        conn.commit()
        print("Base de données initialisée et table 'jobs' prête.")

        try:
            cursor.execute("ALTER TABLE jobs ADD COLUMN category TEXT;")
            print("Colonne 'category' ajoutée.")
        except sqlite3.OperationalError:
            pass
            
        try:
            cursor.execute("ALTER TABLE jobs ADD COLUMN contract_type TEXT;")
            print("Colonne 'contract_type' ajoutée.")
        except sqlite3.OperationalError:
            pass
        
        conn.commit()

def is_new(job_id: str) -> bool:
    with _get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM jobs WHERE id = ?", (job_id,))
        return cursor.fetchone() is None
    
def is_new_by_link(job_link: str) -> bool:
    """Vérifie si une offre est nouvelle en se basant uniquement sur son lien."""
    with _get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM jobs WHERE link = ?", (job_link,))
        return cursor.fetchone() is None

def delete_old_jobs(db_path="storage/jobs.db", days=30):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    limit_date = (datetime.utcnow() - timedelta(days=days)).isoformat()
    cursor.execute("DELETE FROM jobs WHERE posted < ?", (limit_date,))
    deleted = cursor.rowcount
    conn.commit()
    conn.close()
    print(f"🧹 {deleted} offre(s) supprimée(s) (plus de {days} jours).")

def save_job(job: JobPosting):
    with _get_connection() as conn:
        cursor = conn.cursor()
        
        # --- LA CORRECTION FINALE ---
        # On garantit que nous avons toujours un objet datetime valide pour satisfaire
        # la contrainte NOT NULL de la base de données.
        posted_date_iso = (job.posted or datetime.now(timezone.utc)).isoformat()
        # --- FIN DE LA CORRECTION ---

        cursor.execute(
            """
            INSERT INTO jobs (id, title, company, location, link, posted, source, keyword, category, contract_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                job.id,
                job.title,
                job.company,
                job.location,
                job.link,
                posted_date_iso, # On utilise notre variable garantie non-nulle
                job.source,
                job.keyword,
                job.category,
                job.contract_type,
            ),
        )
        conn.commit()