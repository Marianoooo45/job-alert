# Fichier: fetchers/sg_proxy.py (Version Complète, Gérant les Deux Formats JSON)

from __future__ import annotations
import httpx
import json
import re
from datetime import datetime, timezone, timedelta
from models import JobPosting
from playwright.sync_api import sync_playwright
from storage.classifier import classify_job, normalize_contract_type, enrich_location
from .scraper import scrape_page_for_structured_data

# --- Constantes (inchangées) ---
HOME = "https://careers.societegenerale.com"
URL = f"{HOME}/search-proxy.php"
X_URL = "https://api.socgen.com/business-support/it-for-it-support/cognitive-service-knowledge/api/v1/search-profile"
HEADERS_BASE = { "User-Agent": "Mozilla/5.0", "Accept": "application/json", "Content-Type": "application/json", "Origin": HOME, "Referer": f"{HOME}/rechercher", "x-proxy-url": X_URL }
PAYLOAD_BASE = {
    "profile": "ces_profile_sgcareers",
    "lang": "fr",
    "responseType": "SearchResult",
    "query": {
        "advanced": [
            {"type": "simple", "name": "sourcestr6", "op": "eq", "value": "job"}
            # La ligne du filtre de langue a été supprimée
        ],
        "skipFrom": 0,
        "skipCount": 20,
        "sort": "sourcedatetime1.desc",
        "text": ""
    }
}
# --- Fonctions Utilitaires (inchangées) ---
def _get_token() -> str | None:
    # ... code identique ...
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True); context = browser.new_context(); page = context.new_page(); page.set_default_navigation_timeout(60000); token = None
        try:
            page.goto(HOME, wait_until="networkidle", timeout=60000)
            for c in context.cookies():
                if c["name"] == "access_token": token = c["value"]; break
        finally: browser.close()
    return token

def _to_datetime(raw) -> datetime | None:
    # ... code identique ...
    now = datetime.now(timezone.utc)
    if raw is None: return None
    try: n = int(raw); return datetime.fromtimestamp(n / 1000, tz=timezone.utc) if n > 4_000_000_000 else datetime.fromtimestamp(n, tz=timezone.utc)
    except (ValueError, TypeError): pass
    if not isinstance(raw, str): return None
    if "T" in raw:
        try: return datetime.fromisoformat(raw.replace("Z", "")).replace(tzinfo=timezone.utc)
        except ValueError: pass
    try:
        if " " in raw: return datetime.strptime(raw, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
        return datetime.strptime(raw, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError: pass
    r = raw.lower()
    if "aujourd'hui" in r or "today" in r: return now
    if "hier" in r or "yesterday" in r: return now - timedelta(days=1)
    if m := re.search(r"(\d+)\s+jour", r): return now - timedelta(days=int(m.group(1)))
    return None

# --- Fonction Principale du Fetcher (MODIFIÉE) ---

def fetch(*, keyword: str = "", hours: int = 48, limit: int = 40, **kwargs) -> list[JobPosting]:
    # ... La logique de récupération des 'items' avec pagination reste la même ...
    # (le code qui récupère all_items est identique)
    print("[SG] Lancement du fetcher...")
    token = _get_token()
    if not token: print("[SG] Erreur: access-token introuvable. Arrêt."); return []
    headers = HEADERS_BASE | {"authorization-api": f"Bearer {token}"}
    all_items = []
    offset = 0
    page_size = 20
    try:
        with httpx.Client(headers=headers, timeout=30) as cli:
            while True:
                print(f"  [SG] Récupération de la page à partir de l'offset {offset}..."); payload = json.loads(json.dumps(PAYLOAD_BASE)); payload["query"]["text"] = keyword; payload["query"]["skipFrom"] = offset; payload["query"]["skipCount"] = page_size
                r = cli.post(URL, json=payload); r.raise_for_status(); data = r.json()
                new_items = data.get("Result", {}).get("Docs", [])
                if not new_items: print("  [SG] Plus d'offres trouvées, fin de la pagination."); break
                all_items.extend(new_items); print(f"  [SG] {len(new_items)} offres récupérées. Total actuel: {len(all_items)}.")
                offset += len(new_items)
                if len(all_items) >= limit: print(f"  [SG] Limite globale de {limit} offres atteinte."); break
    except Exception as e: print(f"[SG] Erreur critique lors de la requête API: {e}"); import traceback; traceback.print_exc(); return []
    items = all_items[:limit]
    jobs: list[JobPosting] = []
    now = datetime.now(timezone.utc)
    print(f"[SG] {len(items)} offres brutes à traiter après pagination...")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        for it in items:
            
            # --- LA CORRECTION : LOGIQUE "BILINGUE" ---
            # On détecte le format de l'offre et on extrait les données en conséquence.
            job_data = None
            is_vie_offer = isinstance(it.get("success"), dict)

            if is_vie_offer:
                print("  [SG] Format V.I.E détecté.")
                job_data = it["success"]
                link = job_data.get("taleo_link")
                title = "V.I.E. (Titre à récupérer sur la page)"
                raw_date = None # Le JSON V.I.E n'a pas de date de publication
                job_id = link # On utilise le lien comme ID unique
            else:
                # Format standard
                link = it.get("uri") or it.get("resulturl") or it.get("url1")
                title = it.get("title") or it.get("resulttitle") or it.get("name")
                raw_date = it.get("sourcedatetime1") or it.get("sourcedatetime2") or it.get("date")
                job_id = str(it.get("id") or it.get("docid") or link)
            
            # --- La logique commune commence ici ---
            if not link:
                print("  [SG] Avertissement: Offre ignorée car aucun lien n'a pu être trouvé.")
                continue

            posted = _to_datetime(raw_date)
            if not posted:
                posted = datetime.now(timezone.utc)

            if (now - posted).total_seconds() > hours * 3600:
                continue

            if keyword and keyword.lower() not in title.lower():
                continue
            
            try:
                page.goto(link, wait_until='domcontentloaded')
                details = scrape_page_for_structured_data(page, page_url=link)
                
                if is_vie_offer or "Titre à récupérer" in title:
                    page_title = page.title()
                    if page_title and "Job Detail" not in page_title:
                        title = page_title.split("|")[0].strip()

            except Exception as e:
                print(f"  [SG] Erreur Playwright sur {link}: {e}. Détails ignorés.")
                details = {}
            
            job = JobPosting(
                id=f"sg-{job_id}", title=title, link=link, posted=posted, source="SG",
                company="Société Générale", location=details.get("location"), keyword=keyword,
                contract_type=details.get("contract_type") or ("vie" if is_vie_offer else None)
            )
            
            job.location = enrich_location(job.location)
            job.contract_type = normalize_contract_type(job.title, job.contract_type)
            job.category = classify_job(job.title)
            jobs.append(job)
        browser.close()
        
    print(f"[SG] Fetcher terminé. {len(jobs)} offres traitées et ajoutées.")
    return jobs