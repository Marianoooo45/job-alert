# Fichier: fetchers/sg_proxy.py
from __future__ import annotations

import base64
import json
import re
import time
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

import httpx
from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

from models import JobPosting
from storage.classifier import classify_job, normalize_contract_type, enrich_location
from .scraper import scrape_page_for_structured_data

# --- Constantes ---
HOME = "https://careers.societegenerale.com"
URL_PROXY = f"{HOME}/search-proxy.php"
URL_GET_TOKEN_A = f"{HOME}/get-token.php"
URL_GET_TOKEN_B = f"{HOME}/get-token"
X_URL = "https://api.socgen.com/business-support/it-for-it-support/cognitive-service-knowledge/api/v1/search-profile"

HEADERS_BASE = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Content-Type": "application/json",
    "Origin": HOME,
    "Referer": f"{HOME}/rechercher",
    "Accept-Language": "fr-FR,fr;q=0.9",
    "x-proxy-url": X_URL,
}

PAYLOAD_BASE = {
    "profile": "ces_profile_sgcareers",
    "lang": "fr",
    "responseType": "SearchResult",
    "query": {
        "advanced": [
            {"type": "simple", "name": "sourcestr6", "op": "eq", "value": "job"}
        ],
        "skipFrom": 0,
        "skipCount": 20,
        "sort": "sourcedatetime1.desc",
        "text": ""
    }
}

# --- Utils JWT ---
def _b64url_decode(s: str) -> bytes:
    s += "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s.encode("utf-8"))

def _jwt_exp(token: str) -> Optional[int]:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        payload = json.loads(_b64url_decode(parts[1]).decode("utf-8"))
        return int(payload.get("exp")) if "exp" in payload else None
    except Exception:
        return None

# --- Parsing dates (identique) ---
def _to_datetime(raw) -> datetime | None:
    now = datetime.now(timezone.utc)
    if raw is None:
        return None
    try:
        n = int(raw)
        return datetime.fromtimestamp(n / 1000, tz=timezone.utc) if n > 4_000_000_000 else datetime.fromtimestamp(n, tz=timezone.utc)
    except (ValueError, TypeError):
        pass
    if not isinstance(raw, str):
        return None
    if "T" in raw:
        try:
            return datetime.fromisoformat(raw.replace("Z", "")).replace(tzinfo=timezone.utc)
        except ValueError:
            pass
    try:
        if " " in raw:
            return datetime.strptime(raw, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
        return datetime.strptime(raw, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError:
        pass
    r = raw.lower()
    if "aujourd'hui" in r or "today" in r:
        return now
    if "hier" in r or "yesterday" in r:
        return now - timedelta(days=1)
    if m := re.search(r"(\d+)\s+jour", r):
        return now - timedelta(days=int(m.group(1)))
    return None

# --- Récupération du token : HTTP pur, sinon fallback navigateur ---
def _fetch_token_via_httpx() -> Optional[str]:
    """
    Tente de récupérer le JWT comme la SPA, mais sans JS :
      1) GET HOME puis /rechercher (remplit le cookie jar, éventuels redirs)
      2) GET /get-token.php puis /get-token
    Si 200 et JSON {"token": "..."} → on renvoie le token.
    """
    try:
        with httpx.Client(http2=True, headers=HEADERS_BASE, follow_redirects=True, timeout=20) as cli:
            # warm-up: certains CDN posent des cookies après un premier GET
            cli.get(HOME)
            cli.get(f"{HOME}/rechercher")
            for url in (URL_GET_TOKEN_A, URL_GET_TOKEN_B):
                r = cli.get(url, headers={**HEADERS_BASE, "Cache-Control": "no-cache"})
                if r.status_code != 200:
                    continue
                try:
                    data = r.json()
                except Exception:
                    continue
                tok = data.get("token")
                if isinstance(tok, str) and len(tok.split(".")) == 3:
                    print("[SG] Token récupéré via get-token (HTTP).")
                    return tok
    except Exception as e:
        print(f"[SG] get-token HTTP a échoué: {e}")
    return None

def _fetch_token_via_browser() -> Optional[str]:
    """
    Fallback fiable : on ouvre /rechercher avec Playwright et on écoute :
      - la réponse de /get-token(.php) pour lire data.token
      - les requêtes vers X_URL pour extraire l'Authorization Bearer
    """
    token: Optional[str] = None
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, channel="chrome")
            context = browser.new_context(
                locale="fr-FR",
                user_agent=HEADERS_BASE["User-Agent"],
                viewport={"width": 1400, "height": 900},
            )
            page = context.new_page()

            def on_response(resp):
                nonlocal token
                url = resp.url
                if ("/get-token" in url) and (token is None):
                    try:
                        data = resp.json()
                        tok = data.get("token")
                        if isinstance(tok, str) and len(tok.split(".")) == 3:
                            token = tok
                            # print("[SG] Token via /get-token (browser).")
                    except Exception:
                        pass
                # plan B : capter le Bearer envoyé vers X_URL
                if (X_URL in url) and (token is None):
                    try:
                        req = resp.request
                        h = req.headers
                        auth = h.get("authorization") or h.get("authorization-api")
                        if auth and "bearer" in auth.lower():
                            token = auth.split()[-1]
                            # print("[SG] Token via Authorization header (browser).")
                    except Exception:
                        pass

            page.on("response", on_response)

            try:
                page.goto(f"{HOME}/rechercher", wait_until="domcontentloaded", timeout=60_000)
            except PWTimeout:
                print("[SG] Timeout DOMContentLoaded sur /rechercher — on essaie quand même.")

            # Laisse la SPA respirer un peu
            for _ in range(24):  # ~12s (24 * 500ms)
                if token:
                    break
                try:
                    page.wait_for_event("response", timeout=500)
                except Exception:
                    pass

            browser.close()
    except Exception as e:
        print(f"[SG] get-token via navigateur a échoué: {e}")

    if token:
        print("[SG] Token récupéré via navigateur.")
    return token

_TOKEN_CACHE: dict[str, Any] = {"token": None, "exp": 0}

def _get_token() -> Optional[str]:
    now = int(time.time())
    tok = _TOKEN_CACHE.get("token")
    exp = _TOKEN_CACHE.get("exp", 0)
    if tok and now < exp - 30:
        return tok

    # 1) Essai HTTP pur
    tok = _fetch_token_via_httpx()
    # 2) Fallback navigateur si besoin
    if not tok:
        tok = _fetch_token_via_browser()

    if not tok:
        return None

    exp = _jwt_exp(tok) or (now + 540)  # ~9 min par défaut
    _TOKEN_CACHE["token"] = tok
    _TOKEN_CACHE["exp"] = exp
    return tok

# --- Extraction robuste des docs ---
def _extract_docs(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    if not isinstance(data, dict):
        return []
    result = data.get("Result") or {}
    docs = result.get("Docs")
    if isinstance(docs, list):
        return docs
    docs2 = data.get("Docs")
    if isinstance(docs2, list):
        return docs2
    docs3 = data.get("documents")
    if isinstance(docs3, list):
        return docs3
    return []

# --- Fonction principale ---
def fetch(*, keyword: str = "", hours: int = 48, limit: int = 40, **kwargs) -> list[JobPosting]:
    print("[SG] Lancement du fetcher (API)…")

    token = _get_token()
    if not token:
        print("[SG] Erreur: access-token introuvable. Arrêt.")
        return []

    headers = {
        **HEADERS_BASE,
        "authorization-api": f"Bearer {token}",
        "Authorization": f"Bearer {token}",
    }

    all_items: List[Dict[str, Any]] = []
    offset = 0
    page_size = 20

    try:
        with httpx.Client(http2=True, headers=headers, follow_redirects=True, timeout=30) as cli:
            while True:
                print(f"  [SG] Page offset={offset}…")
                payload = json.loads(json.dumps(PAYLOAD_BASE))
                payload["query"]["text"] = keyword or ""
                payload["query"]["skipFrom"] = offset
                payload["query"]["skipCount"] = page_size

                r = cli.post(URL_PROXY, json=payload)
                if r.status_code in (401, 403):
                    # Token expiré ou mal reconnu → refresh 1 fois via navigateur
                    print(f"  [SG] HTTP {r.status_code} sur search-proxy, refresh token…")
                    _TOKEN_CACHE["token"] = None
                    _TOKEN_CACHE["exp"] = 0
                    token2 = _get_token()  # tentera browser si besoin
                    if not token2:
                        print("  [SG] Impossible de rafraîchir le token.")
                        break
                    cli.headers["authorization-api"] = f"Bearer {token2}"
                    cli.headers["Authorization"] = f"Bearer {token2}"
                    r = cli.post(URL_PROXY, json=payload)

                r.raise_for_status()
                data = r.json()

                new_items = _extract_docs(data)
                if not new_items:
                    print("  [SG] Fin de pagination (0 doc).")
                    break

                all_items.extend(new_items)
                print(f"  [SG] +{len(new_items)} offres (total {len(all_items)})")
                offset += len(new_items)

                if len(all_items) >= limit:
                    print(f"  [SG] Limite {limit} atteinte.")
                    break

    except httpx.HTTPStatusError as e:
        print(f"[SG] HTTP {e.response.status_code} sur search-proxy.php: {e}")
        return []
    except Exception as e:
        print(f"[SG] Erreur critique lors de la requête API: {e}")
        import traceback; traceback.print_exc()
        return []

    items = all_items[:limit]
    jobs: List[JobPosting] = []
    now = datetime.now(timezone.utc)
    print(f"[SG] {len(items)} offres brutes à traiter après pagination…")

    # Scraping des pages d’offres pour enrichir
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        for it in items:
            is_vie_offer = isinstance(it.get("success"), dict)

            if is_vie_offer:
                print("  [SG] Format V.I.E détecté.")
                job_data = it["success"]
                link = job_data.get("taleo_link")
                title = "V.I.E. (Titre à récupérer sur la page)"
                raw_date = None
                job_id = link
            else:
                link = it.get("uri") or it.get("resulturl") or it.get("url1")
                title = it.get("title") or it.get("resulttitle") or it.get("name")
                raw_date = it.get("sourcedatetime1") or it.get("sourcedatetime2") or it.get("date")
                job_id = str(it.get("id") or it.get("docid") or link)

            if not link:
                print("  [SG] Avertissement: offre ignorée (pas de lien).")
                continue

            posted = _to_datetime(raw_date) or datetime.now(timezone.utc)
            if (now - posted).total_seconds() > hours * 3600:
                continue

            if keyword and title and keyword.lower() not in title.lower():
                continue

            try:
                page.goto(link, wait_until="domcontentloaded")
                details = scrape_page_for_structured_data(page, page_url=link)

                if is_vie_offer or (title and "Titre à récupérer" in title):
                    page_title = page.title()
                    if page_title and "Job Detail" not in page_title:
                        title = page_title.split("|")[0].strip()
            except Exception as e:
                print(f"  [SG] Erreur Playwright sur {link}: {e}. Détails ignorés.")
                details = {}

            job = JobPosting(
                id=f"sg-{job_id}",
                title=title,
                link=link,
                posted=posted,
                source="SG",
                company="Société Générale",
                location=details.get("location"),
                keyword=keyword,
                contract_type=details.get("contract_type") or ("vie" if is_vie_offer else None),
            )

            job.location = enrich_location(job.location)
            job.contract_type = normalize_contract_type(job.title, job.contract_type)
            job.category = classify_job(job.title)
            jobs.append(job)

        browser.close()

    print(f"[SG] Fetcher terminé. {len(jobs)} offres traitées et ajoutées.")
    return jobs
