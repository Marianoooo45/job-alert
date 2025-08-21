# Fichier: fetchers/workday.py (VERSION FINALE AVEC FILTRES APPLIQUÉS)

import httpx
import re
from datetime import datetime, timezone, timedelta
from models import JobPosting
from playwright.sync_api import sync_playwright
from storage.classifier import classify_job, enrich_location, normalize_contract_type
from .scraper import scrape_page_for_structured_data

USER_AGENT_STRING = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'

# --- Fonctions utilitaires ---
def _parse_posted(raw: str) -> datetime | None:
    try:
        if not raw: return None
        return datetime.fromisoformat(raw.rstrip("Z")).replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        if m := re.search(r"(\d+)\s+Days", raw, re.IGNORECASE):
            return datetime.now(timezone.utc) - timedelta(days=int(m.group(1)))
        if "Today" in raw or "Aujourd'hui" in raw: return datetime.now(timezone.utc)
        if "Yesterday" in raw or "Hier" in raw: return datetime.now(timezone.utc) - timedelta(days=1)
        return None

def _extract_id(j: dict) -> str:
    return str(j.get("jobPostingId") or j.get("externalPath") or "UNKNOWN")

# --- Fonction principale ---
def fetch(
    *,
    base: str,
    tenant: str,
    template: str,
    source_name: str | None = None,
    keyword: str = "",
    hours: int = 48,
    limit: int = 100,
    facets: dict | None = None,
    **kwargs,
) -> list[JobPosting]:
    url_root = f"{base}/{template}"
    url_jobs = f"{base}/wday/cxs/{tenant}/{template}/jobs"
    headers = { "User-Agent": USER_AGENT_STRING, "Accept": "application/json", "Content-Type": "application/json", "Origin": base, "Referer": url_root, "X-Workday-Client": "job-candidate-portal"}

    all_postings = []
    offset = 0
    page_size = 20
    applied_facets = facets or {}

    print(f"[Workday] Démarrage du fetcher pour {source_name or tenant.upper()}...")
    if applied_facets:
        print(f"  [Workday] Utilisation de filtres personnalisés (facets).")

    try:
        with httpx.Client(headers=headers, timeout=20) as cli:
            while True:
                print(f"  [Workday] Récupération offset={offset}…")
                
                # --- LA CORRECTION DÉCISIVE : On utilise la variable qui contient les filtres ---
                payload = {
                    "appliedFacets": applied_facets,
                    "limit": page_size,
                    "offset": offset,
                    "searchText": keyword or "",
                }
                # --- FIN DE LA CORRECTION ---

                r = cli.post(url_jobs, json=payload)
                r.raise_for_status()

                response_data = r.json()
                new_postings = response_data.get("jobPostings", [])

                if not new_postings:
                    print("  [Workday] Plus d'offres trouvées, fin de la pagination.")
                    break

                all_postings.extend(new_postings)
                print(f"  [Workday] {len(new_postings)} offres récupérées. Total: {len(all_postings)}.")

                offset += len(new_postings)
                if len(all_postings) >= limit:
                    print(f"  [Workday] Limite globale de {limit} offres atteinte.")
                    break
    except Exception as e:
        print(f"[Workday] Erreur lors de la récupération de la liste: {e}")

    postings = all_postings[:limit]
    jobs: list[JobPosting] = []
    now = datetime.now(timezone.utc)

    if not postings:
        print("[Workday] Aucune offre brute à traiter.")
        return []

    print(f"[Workday] {len(postings)} offres brutes à traiter après pagination...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(user_agent=USER_AGENT_STRING)
        page = context.new_page()
        page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

        for j in postings:
            page.wait_for_timeout(500)
            posted = _parse_posted(j.get("postedOn", ""))
            if not posted or (now - posted).total_seconds() > hours * 3600: continue
            if keyword and keyword.lower() not in j["title"].lower(): continue
            link = f"{base}/{template}{j['externalPath']}"
            try:
                page.goto(link, wait_until='domcontentloaded', timeout=30000)
            except Exception as e:
                print(f"  [Workday] Erreur de navigation vers {link}: {e}. Offre ignorée.")
                continue

            details = scrape_page_for_structured_data(page, page_url=link)
            final_source_name = source_name or tenant.upper()
            job = JobPosting(id=f"{final_source_name.lower()}-{_extract_id(j)}", title=j["title"], link=link, posted=posted, source=final_source_name, company=final_source_name, location=details.get("location") or j.get("locationsText"), keyword=keyword, contract_type=details.get("contract_type"))
            job.location = enrich_location(job.location)
            job.contract_type = normalize_contract_type(job.title, job.contract_type)
            job.category = classify_job(job.title)
            jobs.append(job)
        browser.close()

    return jobs
