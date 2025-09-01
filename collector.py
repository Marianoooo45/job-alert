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
from storage.classifier import classify_job, enrich_location, normalize_contract_type

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
from fetchers.citi import fetch as fetch_citi
from fetchers.bofa_main import fetch as fetch_bofa_main
from fetchers.bofa_students import fetch as fetch_bofa_students
from fetchers.unicredit import fetch as fetch_unicredit
from fetchers.rabobank import fetch as fetch_rabobank
from fetchers.wellsfargo import fetch as fetch_wellsfargo
from fetchers.blackrock import fetch as fetch_blackrock
from fetchers.pictet import fetch as fetch_pictet
from fetchers.goldmansachs import fetch as fetch_goldmansachs
from fetchers.glencore import fetch as fetch_glencore
from fetchers.jefferies import fetch as fetch_jefferies
from fetchers.adm import fetch as fetch_adm
from fetchers.ag2r import fetch as fetch_ag2r
from fetchers.alantra import fetch as fetch_alantra
from fetchers.amundi import fetch as fetch_amundi
from fetchers.axaim import fetch as fetch_axaim
from fetchers.berenberg import fetch as fetch_berenberg
from fetchers.bgcpartners import fetch as fetch_bgcpartners
from fetchers.bloomberg import fetch as fetch_bloomberg
from fetchers.bptrading import fetch as fetch_bptrading
from fetchers.bryangarnier import fetch as fetch_bryangarnier

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
    "citi": fetch_citi,
    "bofa_main": fetch_bofa_main,
    "bofa_students": fetch_bofa_students,
    "unicredit": fetch_unicredit,
    "rabobank": fetch_rabobank,
    "wellsfargo": fetch_wellsfargo,
    "blackrock": fetch_blackrock,
    "pictet": fetch_pictet,
    "goldmansachs": fetch_goldmansachs,
    "glencore": fetch_glencore,
    "jefferies": fetch_jefferies,
    "adm": fetch_adm,
    "ag2r": fetch_ag2r,
    "alantra": fetch_alantra,
    "amundi": fetch_amundi,
    "axaim": fetch_axaim,
    "berenberg": fetch_berenberg,
    "bgcpartners": fetch_bgcpartners,
    "bloomberg": fetch_bloomberg,
    "bptrading": fetch_bptrading,
    "bryangarnier": fetch_bryangarnier,
}

# --- Filtre langue (inchangé)
ALLOWED_CHARS = set(
    "abcdefghijklmnopqrstuvwxyz"
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "0123456789"
    "àâäéèêëîïôöùûüç"
    "ÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ"
    " -–—/|()&.,:+'’[]«»*#%_;✨"
)
def is_allowed_language(text: str) -> bool:
    if not text:
        return True
    return all(char in ALLOWED_CHARS for char in text)

# ------------ Helpers config & tasks (inchangés) ------------
def load_config(cfg_path: str | pathlib.Path = "config.yaml") -> dict[str, Any]:
    path = pathlib.Path(cfg_path)
    return yaml.safe_load(path.read_text(encoding="utf-8"))

def run_fetch_task(task: tuple[str, dict, str, int, int]) -> tuple[str, str, int, list, str | None]:
    fetcher_type, bank_args, kw, hours, limit = task
    fn = FETCHERS[fetcher_type]
    try:
        jobs = fn(keyword=kw, hours=hours, limit=limit, **bank_args)
        return (fetcher_type, kw, len(jobs), jobs, None)
    except Exception as e:
        return (fetcher_type, kw, 0, [], f"{e}")

def export_public_assets(project_root: pathlib.Path, db_path: pathlib.Path) -> None:
    public_dir = project_root / "ui" / "public"
    public_dir.mkdir(parents=True, exist_ok=True)
    dest1 = public_dir / "jobs.db"
    dest2 = public_dir / "storage" / "jobs.db"
    dest2.parent.mkdir(parents=True, exist_ok=True)
    try:
        shutil.copy2(db_path, dest1); shutil.copy2(db_path, dest2)
        print(f"[EXPORT] DB copiée → {dest1}"); print(f"[EXPORT] DB copiée → {dest2}")
    except Exception as e:
        print(f"[EXPORT] ⚠️ copie DB échouée: {e}")
    try:
        (public_dir / "last-update.txt").write_text(datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"), encoding="utf-8")
        print(f"[EXPORT] last-update.txt mis à jour.")
    except Exception as e:
        print(f"[EXPORT] ⚠️ last-update.txt non écrit: {e}")

def run_once(cfg: dict[str, Any], *, max_procs: int, webhook_url: str | None):
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
    results = []
    with ProcessPoolExecutor(max_workers=max_procs) as ex:
        futures = [ex.submit(run_fetch_task, t) for t in tasks]
        for fut in as_completed(futures):
            results.append(fut.result())

    total_new = 0
    for fetcher_type, kw, nb, jobs, err in results:
        if err:
            print(f"[ERREUR] {fetcher_type} '{kw or 'TOUT'}': {err}")
            continue
        print(f"  ⚙️ {nb} offre(s) brutes récupérées pour {fetcher_type} '{kw or 'TOUT'}'")
        for job in jobs:
            if is_new(job.id) and is_new_by_link(job.link) and is_allowed_language(job.title):
                print(f"  ✅ Nouvelle offre: {job.title} ({job.company})")
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
                pass
        time.sleep(0.3)

    elapsed = time.time() - started
    print(f"\n⏱️ Temps total: {elapsed:.1f}s")
    print(f"Terminé. {total_new} nouvelle(s) offre(s)." if total_new else "Terminé. Aucune nouvelle offre.")

# ------------ Entrée principale (inchangée) ------------
if __name__ == "__main__":
    load_dotenv()
    MAX_PROCS = int(os.getenv("MAX_PROCS", "3"))
    webhook_url = os.getenv("DISCORD_WEBHOOK_URL")
    init_db()
    cfg = load_config("config.yaml")
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    print(f"\n{'='*20} NOUVEAU CYCLE DE SCRAPING - {now_str} {'='*20}")
    run_once(cfg, max_procs=MAX_PROCS, webhook_url=webhook_url)
    delete_old_jobs()
    project_root = pathlib.Path(__file__).resolve().parent
    db_path = pathlib.Path(os.getenv("JOBS_DB_FILE", project_root / "storage" / "jobs.db"))
    if not db_path.is_absolute():
        db_path = project_root / db_path
    export_public_assets(project_root, db_path)
    print("\n✅ Cycle terminé.")
