# Fichier: collector.py 

import os
import time
from datetime import datetime
import pathlib
import yaml
from dotenv import load_dotenv
import shutil

# --- Imports ---
from fetchers.workday import fetch as fetch_workday
from fetchers.sg_proxy import fetch as fetch_sg
from fetchers.bnp_paribas import fetch as fetch_bnp
from fetchers.credit_agricole import fetch as fetch_ca
from fetchers.bpce import fetch as fetch_bpce
from fetchers.edr import fetch as fetch_edr
from fetchers.hsbc import fetch as fetch_hsbc
from fetchers.ubs import fetch as fetch_ubs
from fetchers.rbc import fetch as fetch_rbc
from fetchers.cic import fetch as fetch_cic
from fetchers.kepler_cheuvreux import fetch as fetch_kc
from fetchers.oddo_bhf import fetch as fetch_oddo
from fetchers.ing import fetch as fetch_ing
from fetchers.barclays import fetch as fetch_barclays

from storage.sqlite_repo import is_new, save_job, init_db, delete_old_jobs, is_new_by_link
from notifiers.discord_embed import send as notify_discord

# --- Initialisation ---
load_dotenv()
init_db()

# --- Configuration ---
cfg_path = pathlib.Path("config.yaml")
cfg = yaml.safe_load(cfg_path.read_text(encoding="utf-8"))

webhook_url = os.environ.get("DISCORD_WEBHOOK_URL")
if not webhook_url:
    raise RuntimeError("Le secret DISCORD_WEBHOOK_URL n'est pas défini.")

FETCHERS = {
    "workday": fetch_workday, "sg_proxy": fetch_sg, "bnp_paribas": fetch_bnp,
    "credit_agricole": fetch_ca, "bpce" : fetch_bpce, "edr": fetch_edr,
    "hsbc": fetch_hsbc, "ubs": fetch_ubs, "rbc": fetch_rbc, "cic": fetch_cic,
    "kc": fetch_kc, "oddo": fetch_oddo, "ing": fetch_ing,"barclays": fetch_barclays,
}

# --- FILTRE DE LANGUE ---
ALLOWED_CHARS = set(
    "abcdefghijklmnopqrstuvwxyz"
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "0123456789"
    "àâäéèêëîïôöùûüç"
    "ÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ"
    " -–—/()&.,:+'’[]«»#%✨" 
)

def is_allowed_language(text: str) -> bool:
    """
    Vérifie si le titre ne contient que des caractères autorisés (FR/EN).
    """
    if not text:
        return True
    return all(char in ALLOWED_CHARS for char in text)


# --- Exécution du cycle de collecte ---
def run_once():
    total_new = 0
    for bank_config in cfg["banks"]:
        fetcher_type = bank_config["type"]
        fetch_fn = FETCHERS.get(fetcher_type)
        if not fetch_fn:
            print(f"[AVERTISSEMENT] Aucun fetcher pour le type '{fetcher_type}'.")
            continue

        bank_args = {k: v for k, v in bank_config.items() if k != "type"}

        for kw in cfg["keywords"]:
            print(f"--- Recherche via '{fetcher_type}' avec le mot-clé '{kw or 'TOUT'}' ---")
            try:
                limit_to_fetch = cfg.get("fetch_limit", 50) 
                jobs = fetch_fn(keyword=kw, hours=cfg["hours"], limit=limit_to_fetch, **bank_args)
                print(f"  ⚙️ {len(jobs)} offre(s) brutes récupérées pour {fetcher_type} avec le mot-clé '{kw or 'TOUT'}'")
            except Exception as e:
                print(f"[ERREUR] Le fetcher '{fetcher_type}' a échoué: {e}")
                import traceback
                traceback.print_exc()
                continue

            for job in jobs:
                if is_new(job.id) and is_new_by_link(job.link) and is_allowed_language(job.title):
                    print(f"  ✅ Nouvelle offre: {job.title} ({job.company})")
                    save_job(job)
                    notify_discord(job, keyword=kw, webhook_url=webhook_url)
                    total_new += 1
                elif not is_allowed_language(job.title):
                    offending_chars = {char for char in job.title if char not in ALLOWED_CHARS}
                    print(f"  🚫 Rejeté (caractères non autorisés: {offending_chars}): {job.title} ({job.company})")
                else:
                    print(f"  ❌ Déjà en base: {job.title} ({job.company})")
            time.sleep(2)

    if total_new > 0:
        print(f"\nTerminé. {total_new} nouvelle(s) offre(s) trouvée(s).")
    else:
        print("\nTerminé. Aucune nouvelle offre trouvée.")

# --- Bloc d'exécution principal (pour GitHub Actions) ---
if __name__ == "__main__":
    print(f"\n{'='*20} NOUVEAU CYCLE DE SCRAPING - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} {'='*20}")
    
    # Le script s'exécute une fois...
    run_once()
    delete_old_jobs()

    # ...puis il se termine. Le commit sera fait par le workflow .yml
    print(f"\n✅ Cycle de scraping unique terminé.")