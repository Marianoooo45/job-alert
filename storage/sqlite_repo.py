# storage/sqlite_repo.py
import os
import sqlite3
import pathlib
from datetime import datetime, timedelta, timezone
from typing import Optional

from models import JobPosting
from storage.classifier import normalize_country_from_location, maybe_append_country

# Permet de remplacer le chemin par env: JOBS_DB_FILE
_db_env = os.getenv("JOBS_DB_FILE")
DB_FILE = pathlib.Path(_db_env) if _db_env else pathlib.Path(__file__).parent / "jobs.db"

def _get_connection():
    # row_factory pour debug/inspection si besoin
    conn = sqlite3.connect(DB_FILE)
    return conn

def init_db():
    with _get_connection() as conn:
        cursor = conn.cursor()
        # Table complète avec nouvelles colonnes
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
                contract_type TEXT,
                country_code TEXT,
                country_name TEXT
            );
        """)
        conn.commit()

        # Ajouts idempotents si table ancienne
        for col in [
            "category TEXT",
            "contract_type TEXT",
            "country_code TEXT",
            "country_name TEXT",
        ]:
            try:
                cursor.execute(f"ALTER TABLE jobs ADD COLUMN {col};")
                print(f"Colonne '{col.split()[0]}' ajoutée.")
            except sqlite3.OperationalError:
                pass

        # Index utiles
        try:
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_jobs_posted ON jobs(posted)")
        except sqlite3.OperationalError:
            pass
        try:
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_jobs_country_code ON jobs(country_code)")
        except sqlite3.OperationalError:
            pass

        conn.commit()
        print(f"Base de données initialisée: {DB_FILE}")

def is_new(job_id: str) -> bool:
    with _get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM jobs WHERE id = ?", (job_id,))
        return cursor.fetchone() is None

def is_new_by_link(job_link: str) -> bool:
    with _get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM jobs WHERE link = ?", (job_link,))
        return cursor.fetchone() is None

def delete_old_jobs(db_path=None, days=30):
    path = db_path or str(DB_FILE)
    conn = sqlite3.connect(path)
    cursor = conn.cursor()
    limit_date = (datetime.utcnow() - timedelta(days=days)).isoformat()
    cursor.execute("DELETE FROM jobs WHERE posted < ?", (limit_date,))
    deleted = cursor.rowcount
    conn.commit()
    conn.close()
    print(f"🧹 {deleted} offre(s) supprimée(s) (plus de {days} jours).")

def _enrich_country_fields(location: Optional[str]):
    """
    Retourne (country_code, country_name) à partir de location via le classifier.
    """
    info = normalize_country_from_location(location or "")
    if not info:
        return None, None
    return info["code"], info["name"]

def save_job(job: JobPosting):
    with _get_connection() as conn:
        cursor = conn.cursor()
        posted_date_iso = (job.posted or datetime.now(timezone.utc)).isoformat()

        # Enrichissement pays à l'insertion
        cc, cn = _enrich_country_fields(job.location)

        cursor.execute(
            """
            INSERT INTO jobs (
                id, title, company, location, link, posted, source, keyword,
                category, contract_type, country_code, country_name
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                job.id, job.title, job.company, job.location, job.link,
                posted_date_iso, job.source, job.keyword,
                job.category, job.contract_type, cc, cn
            )
        )
        conn.commit()

# ------- Optionnel : backfill sur l'historique (sans fichier séparé) -------

def backfill_countries(*, append_country_to_location: bool = False) -> int:
    """
    Parcourt les jobs dont country_code est NULL/'' et remplit country_code/country_name
    à partir de 'location'. Si append_country_to_location=True, ajoute le nom canonique
    du pays entre parenthèses dans 'location' quand pertinent.

    Retourne le nombre de lignes mises à jour.
    """
    with _get_connection() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT id, location FROM jobs
            WHERE country_code IS NULL OR country_code = ''
        """)
        rows = cur.fetchall()

        updated = 0
        for job_id, location in rows:
            cc, cn = _enrich_country_fields(location)
            if not cc:
                continue

            cur.execute("""
                UPDATE jobs
                   SET country_code = ?, country_name = ?
                 WHERE id = ?
            """, (cc, cn, job_id))

            if append_country_to_location:
                new_loc = maybe_append_country(location or "")
                if new_loc and new_loc != (location or ""):
                    cur.execute("UPDATE jobs SET location = ? WHERE id = ?", (new_loc, job_id))

            updated += 1

        conn.commit()
        print(f"🔁 Backfill pays terminé — {updated} ligne(s) enrichie(s).")
        return updated
