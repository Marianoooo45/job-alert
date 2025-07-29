# inspect_db.py
import sqlite3, pathlib

DB = pathlib.Path("ui/public/jobs.db")
conn = sqlite3.connect(DB)

print("\n--- tables existantes ---")
for (t,) in conn.execute("SELECT name FROM sqlite_master WHERE type='table';"):
    print("•", t)

print("\n--- schéma complet ---")
for (line,) in conn.execute("SELECT sql FROM sqlite_master WHERE type='table';"):
    print(line)

conn.close()
