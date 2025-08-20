# fetchers/morgan_stanley_students.py
# Morgan Stanley — Students & Graduates (SG) fetcher
# - Par défaut: HTTP JSON (ultra stable)
# - Optionnel: Playwright si MS_FORCE_HTTP=0
# - Logs verbeux si MS_DEBUG=1
from __future__ import annotations

import os
import re
import json
import math
import time
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple
from datetime import datetime, timezone

import httpx

from models import JobPosting
from storage.classifier import classify_job, normalize_contract_type

# ────────────────────────────────────────────────────────────────────────────────
# Constantes & ENV
# ────────────────────────────────────────────────────────────────────────────────
BANK_SOURCE = "MS"
BASE = "https://www.morganstanley.com"
RESULTSET_URL = f"{BASE}/web/career_services/webapp/service/careerservice/resultset.json"

# HTTP par défaut (tu peux passer MS_FORCE_HTTP=0 pour tester Playwright)
FORCE_HTTP = os.getenv("MS_FORCE_HTTP", "1").lower() in ("1", "true", "yes")
DEBUG = os.getenv("MS_DEBUG", "0").lower() in ("1", "true", "yes")

# Dossier de debug
DBG_DIR = Path("debug") / "ms_sg"
DBG_DIR.mkdir(parents=True, exist_ok=True)

# UA basique (côté serveur AEM c’est suffisant)
DEFAULT_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/127.0.0.0 Safari/537.36"
)

# ────────────────────────────────────────────────────────────────────────────────
# Utils
# ────────────────────────────────────────────────────────────────────────────────
def _now_utc() -> datetime:
    return datetime.now(timezone.utc)

def _ts() -> str:
    return f"{_now_utc():%Y-%m-%d %H:%M:%S.%f} UTC"

def _log(msg: str) -> None:
    if DEBUG:
        print(f"[MS:SG] {_ts()} | {msg}")

def _dump_text(path: Path, content: str) -> None:
    try:
        path.write_text(content, encoding="utf-8")
    except Exception:
        pass

def _dump_json(path: Path, data: Any) -> None:
    try:
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:
        pass

def _as_dt(value: Any) -> datetime:
    """
    Tente de convertir diverses formes de dates en datetime UTC.
    - ISO 8601 (Z, offset)
    - Epoch en secondes ou millisecondes
    - Quelques formats texte simples
    Échec => now()
    """
    if value is None:
        return _now_utc()

    # déjà datetime ?
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc)

    # epoch (int/str)
    try:
        if isinstance(value, (int, float)) or (isinstance(value, str) and value.isdigit()):
            v = float(value)
            # Heuristique: si > 10^12 c’est certainement ms
            if v > 1e12:
                v = v / 1000.0
            # si v ~ 10^9-10^10 => secondes
            return datetime.fromtimestamp(v, tz=timezone.utc)
    except Exception:
        pass

    # ISO 8601
    if isinstance(value, str):
        s = value.strip()
        # nettoyer /Date(1724190000000)/ éventuel
        m = re.search(r"/Date\((\d+)\)/", s)
        if m:
            try:
                ms = float(m.group(1))
                return datetime.fromtimestamp(ms / 1000.0, tz=timezone.utc)
            except Exception:
                return _now_utc()

        # formats ISO courants
        for fmt in ("%Y-%m-%dT%H:%M:%S.%f%z",
                    "%Y-%m-%dT%H:%M:%S%z",
                    "%Y-%m-%dT%H:%M:%S.%fZ",
                    "%Y-%m-%dT%H:%M:%SZ",
                    "%Y-%m-%d"):
            try:
                dt = datetime.strptime(s, fmt)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt.astimezone(timezone.utc)
            except Exception:
                continue

        # Essai texte simple (ex: "Aug 20, 2025")
        try:
            dt = datetime.strptime(s, "%b %d, %Y")
            return dt.replace(tzinfo=timezone.utc)
        except Exception:
            pass

    # fallback
    return _now_utc()

def _within_hours(dt: datetime, hours: int) -> bool:
    return ( _now_utc() - dt ).total_seconds() <= hours * 3600

def _first_non_empty(d: Dict[str, Any], keys: Iterable[str]) -> Optional[Any]:
    for k in keys:
        if k in d and d[k]:
            return d[k]
    return None

def _slugify(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = s.strip("-")
    return s or "n-a"

def _safe_join_link(link: str) -> str:
    if not link:
        return ""
    if link.startswith("http://") or link.startswith("https://"):
        return link
    if link.startswith("//"):
        return "https:" + link
    if link.startswith("/"):
        return BASE + link
    # parfois le service renvoie déjà un lien absolu vers un ATS externe
    return link

# ────────────────────────────────────────────────────────────────────────────────
# Parsing JSON
# ────────────────────────────────────────────────────────────────────────────────
def _extract_job_from_dict(d: Dict[str, Any]) -> Optional[JobPosting]:
    """
    Tolérant: le service AEM peut changer des clés.
    On tente plusieurs synonymes pour title/location/link/id/date.
    """
    # parfois imbriqué
    inner = d.get("jobPosting") if isinstance(d.get("jobPosting"), dict) else None
    src = inner or d

    # Title
    title = _first_non_empty(src, ("title", "jobTitle", "name", "jobName", "positionTitle"))
    if not title or not isinstance(title, str):
        return None
    title = title.strip()

    # Location
    location = _first_non_empty(src, ("location", "jobLocation", "cityState", "city", "region"))
    if isinstance(location, dict):
        # ex: {"city": "...", "country": "..."}
        city = location.get("city") or ""
        country = location.get("country") or ""
        location = ", ".join([p for p in (city, country) if p])
    location = (location or "").strip()

    # Link
    link = _first_non_empty(src, ("url", "jobUrl", "applyUrl", "applyLink", "href", "jobLink"))
    link = _safe_join_link(link or "")

    # ID
    job_id = _first_non_empty(src, ("jobId", "id", "postingId", "reqId", "requisitionId"))
    if not job_id:
        # fallback deterministe
        key = f"{title}|{location}|{link}"
        job_id = f"ms-sg-{_slugify(key)}"

    # Date (éviter d'utiliser la deadline comme posted)
    posted = None
    # champs publication/modif préférés
    for dk in ("postingDate", "postedDate", "postedOn", "publishDate",
               "createdDate", "modifiedDate", "lastModified", "datePosted"):
        if dk in src and src[dk]:
            posted = _as_dt(src[dk]); break

    if not posted and inner:
        for dk in ("datePosted", "validFrom", "lastModified"):
            v = inner.get(dk)
            if v:
                posted = _as_dt(v); break

    posted = posted or _now_utc()

    # Contract type heuristique simple
    # (tu peux raffiner via normalize_contract_type qui utilise le titre)
    default_contract = "Internship" if re.search(r"\b(intern|internship|off[- ]?cycle)\b", title, re.I) else "Full Time"
    contract_type = normalize_contract_type(title, default_contract)

    # Catégorie ML (ton classif)
    category = classify_job(title)

    # Company
    company = _first_non_empty(src, ("company", "companyName", "employer"))
    company = (company or "Morgan Stanley").strip()

    # Link fallback: parfois pas de lien => on laisse la fiche SG (pas idéal, mais exploitable)
    if not link:
        link = f"{BASE}/careers/career-opportunities-search?opportunity=sg"

    return JobPosting(
        id=str(job_id),
        title=title,
        link=link,
        posted=posted,
        source=BANK_SOURCE,
        company=company,
        location=location,
        contract_type=contract_type,
        category=category,
    )

def _iter_candidate_lists(obj: Any) -> Iterable[List[Dict[str, Any]]]:
    """
    Explore récursivement le JSON et yield les listes de dicts plausibles (jobs).
    """
    if isinstance(obj, list) and obj and isinstance(obj[0], dict):
        yield obj
    elif isinstance(obj, dict):
        for v in obj.values():
            yield from _iter_candidate_lists(v)

def _parse_jobs_from_json(payload: Any) -> List[JobPosting]:
    jobs: List[JobPosting] = []
    seen_ids: set[str] = set()
    seen_links: set[str] = set()

    for lst in _iter_candidate_lists(payload):
        for item in lst:
            if not isinstance(item, dict):
                continue
            job = _extract_job_from_dict(item)
            if not job:
                continue
            # dedup
            if job.id in seen_ids or job.link in seen_links:
                continue
            seen_ids.add(job.id)
            seen_links.add(job.link)
            jobs.append(job)

    return jobs

# ────────────────────────────────────────────────────────────────────────────────
# HTTP fallback (par défaut)
# ────────────────────────────────────────────────────────────────────────────────
def _http_fetch(*, hours: int, limit: int) -> List[JobPosting]:
    _log("→ HTTP fallback (httpx, http2=False, verify=False)")
    headers = {
        "User-Agent": DEFAULT_UA,
        "Accept": "application/json, text/plain, */*",
        "Referer": f"{BASE}/careers/career-opportunities-search?opportunity=sg",
        "Connection": "close",
    }
    params = {"opportunity": "sg"}

    jobs: List[JobPosting] = []
    with httpx.Client(http2=False, verify=False, timeout=httpx.Timeout(15.0, read=15.0)) as client:
        # ping page HTML pour mimer un parcours (utile côté infra)
        try:
            r_html = client.get(f"{BASE}/careers/career-opportunities-search?opportunity=sg", headers={"User-Agent": DEFAULT_UA})
            _log(f"[HTTP] status={r_html.status_code} http_version={r_html.http_version} url={r_html.url}")
            if DEBUG:
                _dump_text(DBG_DIR / f"http_fallback_{int(time.time())}.html", r_html.text)
        except Exception as e:
            _log(f"[HTTP] page HTML warmup failed: {e}")

        # endpoint AEM
        try:
            r = client.get(RESULTSET_URL, params=params, headers=headers)
            ctype = r.headers.get("content-type", "")
            _log(f"PROBE ▶ {r.url} -> {r.status_code} {ctype}")
            payload = r.json()
            if DEBUG:
                _dump_json(DBG_DIR / f"probe_{int(time.time())}.json", payload)

            parsed = _parse_jobs_from_json(payload)
            _log(f"[parse] {len(parsed)} job(s) via HTTP fallback")
            jobs.extend(parsed)
        except Exception as e:
            _log(f"HTTP parse failed: {e}")

    # Filtre temporel + tri + limite
    if hours and hours > 0:
        jobs = [j for j in jobs if _within_hours(j.posted, hours)]
    jobs.sort(key=lambda j: j.posted, reverse=True)
    if limit > 0:
        jobs = jobs[:limit]

    _log(f"✅ FIN (HTTP fallback) — {len(jobs)} offres collectées")
    return jobs

# ────────────────────────────────────────────────────────────────────────────────
# Playwright (optionnel si MS_FORCE_HTTP=0)
# ────────────────────────────────────────────────────────────────────────────────
def _playwright_harvest(*, hours: int, limit: int) -> List[JobPosting]:
    try:
        from playwright.sync_api import sync_playwright
    except Exception as e:
        _log(f"Playwright indisponible: {e}")
        return []

    # Workarounds courants pour ce domaine
    os.environ.setdefault("PLAYWRIGHT_DISABLE_HTTP2", "1")

    headful = os.getenv("PLAYWRIGHT_HEADFUL", "0").lower() in ("1", "true", "yes")
    persist = os.getenv("MS_PERSIST", "0").lower() in ("1", "true", "yes")

    _log(f"PW headful={headful} persist={persist}")

    jobs: List[JobPosting] = []
    with sync_playwright() as p:
        launch_kwargs = dict(headless=not headful, channel="chrome")
        context = None
        browser = None
        try:
            if persist:
                user_data_dir = str(Path(".pw-ms").resolve())
                browser = p.chromium.launch_persistent_context(
                    user_data_dir=user_data_dir,
                    **launch_kwargs,
                )
                context = browser
            else:
                browser = p.chromium.launch(**launch_kwargs)
                context = browser.new_context(locale="en-US")

            page = context.new_page()
            url = f"{BASE}/careers/career-opportunities-search?opportunity=sg"
            # On passe par la page puis on requête l’endpoint AEM depuis le navigateur (bypass éventuels check JS)
            page.goto(url, wait_until="domcontentloaded", timeout=90_000)
            _log(f"PW @ {url}")

            # Invoquer l’endpoint depuis le contexte
            resp = page.request.get(RESULTSET_URL + "?opportunity=sg")
            ctype = resp.headers.get("content-type", "")
            _log(f"PW PROBE ▶ {RESULTSET_URL}?opportunity=sg -> {resp.status} {ctype}")
            payload = resp.json()
            if DEBUG:
                _dump_json(DBG_DIR / f"pw_probe_{int(time.time())}.json", payload)

            parsed = _parse_jobs_from_json(payload)
            _log(f"[parse] {len(parsed)} job(s) via PW")
            jobs.extend(parsed)

        except Exception as e:
            _log(f"PW error: {e}")
        finally:
            try:
                if persist:
                    context.close()
                else:
                    if context:
                        context.close()
                    if browser:
                        browser.close()
            except Exception:
                pass

    # Filtre/tri/limite
    if hours and hours > 0:
        jobs = [j for j in jobs if _within_hours(j.posted, hours)]
    jobs.sort(key=lambda j: j.posted, reverse=True)
    if limit > 0:
        jobs = jobs[:limit]

    _log(f"✅ FIN (PW) — {len(jobs)} offres collectées")
    return jobs

# ────────────────────────────────────────────────────────────────────────────────
# Entrée Fetcher
# ────────────────────────────────────────────────────────────────────────────────
def fetch(*, keyword: str = "", hours: int = 48, limit: int = 50, **kwargs) -> List[JobPosting]:
    """
    keyword ignoré ici (le service SG ne supporte pas une recherche fulltext stable).
    hours: filtre temporel côté fetcher
    limit: borne max renvoyée au collector
    """
    _log("=" * 56)
    _log("Démarrage fetcher SG (Students) — mode VERBEUX")
    _log(f"keyword='{keyword}' hours={hours} limit={limit}")

    if keyword:
        return []

    if FORCE_HTTP:
        jobs = _http_fetch(hours=hours, limit=limit)
    else:
        jobs = _playwright_harvest(hours=hours, limit=limit)

    _log(f"✅ FIN — {len(jobs)} offres collectées (limit={limit})")
    _log("=" * 56)
    return jobs
