# collector.py — exécution “pleine” + export DB vers ui/public
from __future__ import annotations

import os
import time
import shutil
import pathlib
import yaml
from dotenv import load_dotenv
from concurrent.futures import ProcessPoolExecutor, as_completed
from typing import Any
from datetime import datetime, timezone

# --- Imports fetchers
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
from fetchers.morgan_stanley_eightfold import fetch as fetch_ms_eightfold
from fetchers.morgan_stanley_students import fetch as fetch_ms_students

# --- Storage / Notif
from storage.sqlite_repo import (
    is_new,
    is_new_by_link,
    save_job,
    init_db,
    delete_old_jobs,
)
from notifiers.discord_embed import send as notify_discord

# --- Registry des fetchers
FETCHERS = {
    "workday": fetch_workday,
    "sg_proxy": fetch_sg,
    "bnp_paribas": fetch_bnp,
    "credit_agricole": fetch_ca,
    "bpce": fetch_bpce,
    "edr": fetch_edr,
    "hsbc": fetch_hsbc,
    "ubs": fetch_ubs,
    "rbc": fetch_rbc,
    "cic": fetch_cic,
    "kc": fetch_kc,
    "oddo": fetch_oddo,
    "ing": fetch_ing,
    "barclays": fetch_barclays,
    "ms_eightfold": fetch_ms_eightfold,
    "ms_students": fetch_ms_students,
}

# --- Filtre langue (copié de ta version)
ALLOWED_CHARS = set(
    "abcdefghijklmnopqrstuvwxyz"
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "0123456789"
    "àâäéèêëîïôöùûüç"
    "ÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ"
    " -–—/()&.,:+'’[]«»#%_;✨"
)
def is_allowed_language(text: str) -> bool:
    if not text:
        return True
    return all(char in ALLOWED_CHARS for char in text)

# ------------ Helpers config & tasks ------------
def load_config(cfg_path: str | pathlib.Path = "config.yaml") -> dict[str, Any]:
    path = pathlib.Path(cfg_path)
    return yaml.safe_load(path.read_text(encoding="utf-8"))

def run_fetch_task(task: tuple[str, dict, str, int, int]) -> tuple[str, str, int, list, str | None]:
    """
    Lance un fetcher dans un PROCESS séparé.
    Retourne: (fetcher_type, keyword, nb, jobs[:], error_or_none)
    """
    fetcher_type, bank_args, kw, hours, limit = task
    fn = FETCHERS[fetcher_type]
    try:
        jobs = fn(keyword=kw, hours=hours, limit=limit, **bank_args)
        return (fetcher_type, kw, len(jobs), jobs, None)
    except Exception as e:
        return (fetcher_type, kw, 0, [], f"{e}")

def export_public_assets(project_root: pathlib.Path, db_path: pathlib.Path) -> None:
    """
    Copie la DB vers ui/public et ui/public/storage + écrit last-update.txt.
    Permet au site statique (GitHub Pages/Next static) d’y accéder.
    """
    public_dir = project_root / "ui" / "public"
    public_dir.mkdir(parents=True, exist_ok=True)

    # 1) ui/public/jobs.db (compat historique)
    dest1 = public_dir / "jobs.db"
    # 2) ui/public/storage/jobs.db (si tu préfères ce chemin)
    dest2 = public_dir / "storage" / "jobs.db"
    dest2.parent.mkdir(parents=True, exist_ok=True)

    try:
        shutil.copy2(db_path, dest1)
        shutil.copy2(db_path, dest2)
        print(f"[EXPORT] DB copiée → {dest1}")
        print(f"[EXPORT] DB copiée → {dest2}")
    except Exception as e:
        print(f"[EXPORT] ⚠️ copie DB échouée: {e}")

    # 3) last-update.txt
    try:
        (public_dir / "last-update.txt").write_text(
            datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
            encoding="utf-8",
        )
        print(f"[EXPORT] last-update.txt mis à jour.")
    except Exception as e:
        print(f"[EXPORT] ⚠️ last-update.txt non écrit: {e}")

def run_once(cfg: dict[str, Any], *, max_procs: int, webhook_url: str | None):
    # Fan-out: construire la liste des tâches
    tasks: list[tuple[str, dict, str, int, int]] = []
    for bank in cfg["banks"]:
        fetcher_type = bank["type"]
        if fetcher_type not in FETCHERS:
            print(f"[AVERTISSEMENT] Aucun fetcher pour '{fetcher_type}'.")
            continue
        bank_args = {k: v for k, v in bank.items() if k != "type"}
        for kw in cfg["keywords"]:
            tasks.append((fetcher_type, bank_args, kw, cfg["hours"], cfg.get("fetch_limit", 50)))

    print(f"[RUN] {len(tasks)} tâches | MAX_PROCS={max_procs}")
    started = time.time()

    # Fan-out (parallèle)
    results = []
    with ProcessPoolExecutor(max_workers=max_procs) as ex:
        futures = [ex.submit(run_fetch_task, t) for t in tasks]
        for fut in as_completed(futures):
            results.append(fut.result())

    # Fan-in: dédup + save + notif
    total_new = 0
    for fetcher_type, kw, nb, jobs, err in results:
        if err:
            print(f"[ERREUR] {fetcher_type} '{kw or 'TOUT'}': {err}")
            continue
        print(f"  ⚙️ {nb} offre(s) brutes récupérées pour {fetcher_type} '{kw or 'TOUT'}'")

        for job in jobs:
            if is_new(job.id) and is_new_by_link(job.link) and is_allowed_language(job.title):
                print(f"  ✅ Nouvelle offre: {job.title} ({job.company})")
                # En mode “plein” : on enregistre et on notifie
                save_job(job)
                if webhook_url:
                    try:
                        notify_discord(job, keyword=kw, webhook_url=webhook_url)
                    except Exception as e:
                        print(f"   ↳ [WARN] Discord ko: {e}")
                total_new += 1
            elif not is_allowed_language(job.title):
                offending = {c for c in job.title if c not in ALLOWED_CHARS}
                print(f"  🚫 Rejeté (caractères non autorisés: {offending}): {job.title} ({job.company})")
            else:
                # déjà en base
                pass
        time.sleep(0.3)  # mini-cooldown anti rate-limits

    elapsed = time.time() - started
    print(f"\n⏱️ Temps total: {elapsed:.1f}s")
    print(f"Terminé. {total_new} nouvelle(s) offre(s)." if total_new else "Terminé. Aucune nouvelle offre.")

# ------------ Entrée principale (protégée pour Windows/multiprocessing) ------------
if __name__ == "__main__":
    load_dotenv()

    MAX_PROCS = int(os.getenv("MAX_PROCS", "3"))
    webhook_url = os.getenv("DISCORD_WEBHOOK_URL")  # None en local -> pas de notif

    # Init & config
    init_db()  # respecte JOBS_DB_FILE si défini (dans sqlite_repo.py)
    cfg = load_config("config.yaml")

    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    print(f"\n{'='*20} NOUVEAU CYCLE DE SCRAPING - {now_str} {'='*20}")
    run_once(cfg, max_procs=MAX_PROCS, webhook_url=webhook_url)

    # Nettoyage + export statique pour le site
    delete_old_jobs()

    project_root = pathlib.Path(__file__).resolve().parent
    # Chemin DB réel (même logique que sqlite_repo : par défaut storage/jobs.db)
    db_path = pathlib.Path(os.getenv("JOBS_DB_FILE", project_root / "storage" / "jobs.db"))
    if not db_path.is_absolute():
        db_path = project_root / db_path

    export_public_assets(project_root, db_path)

    print("\n✅ Cycle terminé.")
