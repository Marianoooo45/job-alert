# create_jobs_table.py
import sqlite3, pathlib

# 1) Emplacement de la base : storage/jobs.db
DB = pathlib.Path("storage/jobs.db")
DB.parent.mkdir(exist_ok=True)          # crée le dossier storage/ si besoin

# 2) Ouvrir la connexion
conn = sqlite3.connect(DB)

# 3) Créer la table si elle n'existe pas
conn.execute(
    """
    CREATE TABLE IF NOT EXISTS jobs (
        id     TEXT PRIMARY KEY,
        title  TEXT,
        link   TEXT,
        posted TEXT,
        source TEXT
    )
    """
)
conn.commit()

print("✅ Table 'jobs' créée (ou déjà présente).")

# 4) (facultatif) Insérer une ligne de test — décommenter si besoin
# conn.execute(
#     "INSERT OR IGNORE INTO jobs VALUES (?,?,?,?,?)",
#     ("TEST-1", "Job de test", "https://exemple.com",
#      "2025-06-26T12:00:00", "TEST")
# )
# conn.commit()

# 5) Fermer la connexion proprement
conn.close()
