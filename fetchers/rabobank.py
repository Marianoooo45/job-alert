# -*- coding: utf-8 -*-
# Fichier: fetchers/rabobank.py
from __future__ import annotations

import json
import re
import random
import unicodedata
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime, timezone, timedelta
from urllib.parse import urlparse

# httpx laissé dispo si ton projet l’importe ailleurs
import httpx  # noqa: F401
from bs4 import BeautifulSoup

from models import JobPosting
from storage.classifier import classify_job, normalize_contract_type, enrich_location

# ---------------------------------------------------------------------------
# Constantes / Headers
# ---------------------------------------------------------------------------

BASE_URL = "https://rabobank.jobs"
SEARCH_URL = f"{BASE_URL}/en/jobs/"

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)
CH_HEADERS = {
    "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not:A-Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "accept-language": "en-US,en;q=0.9",
    "upgrade-insecure-requests": "1",
}

PLAYWRIGHT_NAV_TIMEOUT_MS = 50_000

# ---------------------------------------------------------------------------
# Regex & Patterns
# ---------------------------------------------------------------------------

RE_COMMENTED_JSON = re.compile(r"<!--\s*({.*?})\s*-->", re.DOTALL)
RE_NEXT_DATA = re.compile(r'id="__NEXT_DATA__"[^>]*>\s*({.*?})\s*<', re.DOTALL)
RE_NUXT = re.compile(r"window\.__NUXT__\s*=\s*({.*?});", re.DOTALL)
RE_INITIAL_STATE = re.compile(r"window\.__INITIAL_STATE__\s*=\s*({.*?});", re.DOTALL)
RE_JOB_ID_FROM_URL = re.compile(r"/en/(?:jobs|vacancies?)/(?:job|vacancy)/[^/]+/(\d+)")

VALID_PATH_PATTERNS: Tuple[str, ...] = (
    "/en/jobs/job/",
    "/en/vacancies/job/",
    "/en/jobs/vacancy/",
    "/en/vacancies/vacancy/",
)

# ---------------------------------------------------------------------------
# Mini helpers
# ---------------------------------------------------------------------------

def _now_utc() -> datetime:
    return datetime.now(timezone.utc)

def _iso_or_epoch_to_dt(val: Any) -> Optional[datetime]:
    if val is None:
        return None
    try:
        if isinstance(val, (int, float)):
            return datetime.fromtimestamp((val / 1000) if val > 10_000_000_000 else val, tz=timezone.utc)
        if isinstance(val, str):
            return datetime.fromisoformat(val.strip().rstrip("Z")).replace(tzinfo=timezone.utc)
    except Exception:
        return None
    return None

def _within_hours(dt: Optional[datetime], hours: int) -> bool:
    if dt is None:
        return True
    return (_now_utc() - dt) <= timedelta(hours=hours)

# ---------------------------------------------------------------------------
# Nettoyage / Validation
# ---------------------------------------------------------------------------

def _sanitize_text(s: Optional[str]) -> Optional[str]:
    if not s:
        return s
    s = s.replace("\xa0", " ").replace("\u200b", "")
    s = unicodedata.normalize("NFKC", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def _is_valid_job_url(url: Optional[str]) -> bool:
    if not url:
        return False
    if url.startswith("/"):
        url = f"{BASE_URL}{url}"
    if not url.startswith(BASE_URL):
        return False
    try:
        path = urlparse(url).path or ""
    except Exception:
        path = url or ""
    return any(path.startswith(p) for p in VALID_PATH_PATTERNS)

# ---------------------------------------------------------------------------
# Extraction bas-niveau (JSON embarqué / HTML)
# ---------------------------------------------------------------------------

def _try_extract_jobs_from_known_structures(data: Any) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []

    def accept_generic_item(it: Dict[str, Any]) -> bool:
        url = it.get("url") or it.get("link")
        return _is_valid_job_url(url)

    def walk(node: Any):
        if isinstance(node, dict):
            if "hits" in node and isinstance(node["hits"], dict) and isinstance(node["hits"].get("hits"), list):
                for h in node["hits"]["hits"]:
                    if isinstance(h, dict) and isinstance(h.get("_source"), dict):
                        out.append(h["_source"])
            for v in node.values():
                walk(v)
        elif isinstance(node, list):
            for it in node:
                if isinstance(it, dict):
                    keys = set(it.keys())
                    if {"job_id", "job_title"} <= keys or {"vacancyId", "title"} <= keys:
                        out.append(it)
                    elif ({"title", "url"} <= keys or {"title", "link"} <= keys) and accept_generic_item(it):
                        out.append(it)
                walk(it)

    walk(data)
    return out

def _extract_json_variants(html: str) -> List[Dict[str, Any]]:
    soup = BeautifulSoup(html, "lxml")
    jobs: List[Dict[str, Any]] = []

    for m in RE_COMMENTED_JSON.finditer(html):
        try:
            jobs.extend(_try_extract_jobs_from_known_structures(json.loads(m.group(1))))
        except Exception:
            pass

    m_next = RE_NEXT_DATA.search(html)
    if m_next:
        try:
            jobs.extend(_try_extract_jobs_from_known_structures(json.loads(m_next.group(1))))
        except Exception:
            pass

    m_nuxt = RE_NUXT.search(html)
    if m_nuxt:
        try:
            jobs.extend(_try_extract_jobs_from_known_structures(json.loads(m_nuxt.group(1))))
        except Exception:
            pass

    m_state = RE_INITIAL_STATE.search(html)
    if m_state:
        try:
            jobs.extend(_try_extract_jobs_from_known_structures(json.loads(m_state.group(1))))
        except Exception:
            pass

    for script in soup.find_all("script", {"type": "application/json"}):
        try:
            jobs.extend(_try_extract_jobs_from_known_structures(json.loads(script.text or "{}")))
        except Exception:
            pass

    return jobs

def _extract_from_html_cards(html: str) -> List[Dict[str, Any]]:
    soup = BeautifulSoup(html, "lxml")
    jobs: List[Dict[str, Any]] = []
    for a in soup.select('a[href*="/en/jobs/job/"], a[href*="/en/vacancies/job/"]'):
        href = a.get("href") or ""
        if not _is_valid_job_url(href):
            continue
        title = _sanitize_text(a.get_text(" ", strip=True) or "")
        if not title:
            continue
        if href.startswith("/"):
            href = f"{BASE_URL}{href}"
        jobs.append({"title": title, "url": href})
    # dedupe
    seen, uniq = set(), []
    for j in jobs:
        k = (j.get("title", ""), j.get("url", ""))
        if k in seen:
            continue
        seen.add(k)
        uniq.append(j)
    return uniq

def _extract_raw_jobs_from_html(html: str) -> List[Dict[str, Any]]:
    raw = _extract_json_variants(html)
    if not raw:
        raw = _extract_from_html_cards(html)
    return raw

# ---------------------------------------------------------------------------
# Playwright: **pagination via ?page=N** + arrêt dès `limit`
# ---------------------------------------------------------------------------

def _playwright_collect_raw_jobs(url: str, limit: int, max_pages: int = 40) -> List[Dict[str, Any]]:
    """
    Playwright only. Navigation SERVEUR déterministe:
      - on visite ?page=1, ?page=2, ?page=3, ...
      - on arrête dès que len(raw_uniques) >= limit ou si une page n'apporte rien de nouveau.
    Pas de clic "Next" (on évite le SPA capricieux).
    """
    print("  ↪️ Playwright pagination (?page=N, stop at limit)…")
    try:
        from playwright.sync_api import sync_playwright
    except Exception as e:
        print(f"  ❌ Playwright non dispo: {e}")
        return []

    raw_jobs: List[Dict[str, Any]] = []
    seen_keys: set[str] = set()

    def key_for_raw(d: Dict[str, Any]) -> str:
        jid = str(d.get("job_id") or d.get("id") or d.get("vacancyId") or "").strip()
        urlx = (d.get("url") or d.get("link") or "").strip()
        title = (d.get("job_title") or d.get("title") or "").strip()
        if jid:
            return f"id:{jid}"
        if urlx:
            return f"url:{urlx}"
        return f"title:{title}"

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
                    "--disable-features=IsolateOrigins,site-per-process",
                    "--disable-features=NetworkServiceInProcess",
                    "--disable-http2", "--disable-quic",
                ],
            )
            context = browser.new_context(
                user_agent=UA, locale="en-US", timezone_id="Europe/Amsterdam",
                viewport={"width": random.randint(1280, 1440), "height": random.randint(800, 900)},
                ignore_https_errors=True,
            )
            context.set_extra_http_headers(CH_HEADERS)
            context.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                window.chrome = { runtime: {} };
                Object.defineProperty(navigator, 'languages', { get: () => ['en-US','en'] });
                Object.defineProperty(navigator, 'plugins', { get: () => [1,2,3,4,5] });
            """)

            page = context.new_page()
            page.set_default_timeout(PLAYWRIGHT_NAV_TIMEOUT_MS)

            # Bloquer les assets lourds
            def _block(route):
                u = route.request.url
                if any(x in u for x in (".png",".jpg",".jpeg",".gif",".webp",
                                        ".woff",".woff2",".ttf","googletagmanager",
                                        "analytics","hotjar")):
                    return route.abort()
                return route.continue_()
            page.route("**/*", _block)

            base = url.split("?")[0].rstrip("/")

            for page_num in range(1, max_pages + 1):
                cur_url = f"{base}/?page={page_num}"
                page.goto(cur_url, wait_until="domcontentloaded")
                # Cookies (si ça repop)
                try:
                    page.get_by_role("button", name=re.compile("Accept|Akkoord|Accepteer|Accepter|OK", re.I)).click(timeout=1500)
                except Exception:
                    pass

                # Un petit scroll pour déclencher tout lazy content (par sécurité)
                _auto_scroll(page, max_steps=8)
                html = page.content()

                page_raw = _extract_raw_jobs_from_html(html)
                if not page_raw:
                    # page vide → fin des pages
                    break

                added_here = 0
                before_total = len(seen_keys)
                for r in page_raw:
                    u = r.get("url") or r.get("link")
                    if u and not _is_valid_job_url(u):
                        continue
                    k = key_for_raw(r)
                    if k in seen_keys:
                        continue
                    seen_keys.add(k)
                    raw_jobs.append(r)
                    added_here += 1
                    if len(seen_keys) >= limit:
                        break

                cur_total = len(seen_keys)
                print(f"    • Page {page_num}: +{added_here} (total={cur_total}/{limit})")

                if cur_total >= limit:
                    break

                # Si aucune progression, inutile d'aller plus loin
                if cur_total == before_total:
                    break

            context.close()
            browser.close()

    except Exception as e:
        print(f"  ❌ Playwright KO: {e}")
        return []

    return raw_jobs

def _auto_scroll(page, max_steps=8, step_px=1200):
    last_h = 0
    for _ in range(max_steps):
        page.evaluate(f"window.scrollBy(0, {step_px});")
        page.wait_for_timeout(200 + random.randint(0, 200))
        h = page.evaluate("document.body.scrollHeight")
        if h == last_h:
            break
        last_h = h

# ---------------------------------------------------------------------------
# Conversion vers JobPosting
# ---------------------------------------------------------------------------

def _slugify(title: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9\s-]", "", title).strip().lower()
    return re.sub(r"\s+", "-", s) or "job"

def _build_link(title: str, job_id: str) -> str:
    return f"{BASE_URL}/en/jobs/job/{_slugify(title)}/{job_id}"

def _to_jobposting(src: Dict[str, Any], *, source_name="RABOBANK") -> Optional[JobPosting]:
    job_id = str(src.get("job_id") or src.get("id") or src.get("vacancyId") or "") or None
    title = _sanitize_text(src.get("job_title") or src.get("title") or "")
    url = src.get("url") or src.get("link") or ""

    if not title:
        return None

    if not url and job_id:
        url = _build_link(title, job_id)
    if url and url.startswith("/"):
        url = f"{BASE_URL}{url}"

    if not _is_valid_job_url(url):
        return None

    if not job_id:
        m = RE_JOB_ID_FROM_URL.search(url or "")
        job_id = m.group(1) if m else str(abs(hash(url or title)))

    posted = (
        _iso_or_epoch_to_dt(src.get("date_start") or src.get("datePosted") or src.get("created"))
        or _now_utc()
    )

    country = None
    if isinstance(src.get("country"), list) and src["country"]:
        c0 = src["country"][0]
        country = c0.get("label_en") or c0.get("label")
    city = _sanitize_text(src.get("city") or "")
    state = _sanitize_text(src.get("state") or "")
    location = ", ".join([p for p in (city, state, country) if p])

    contract_raw = None
    if isinstance(src.get("contract_type"), list) and src["contract_type"]:
        c0 = src["contract_type"][0]
        contract_raw = c0.get("label_en") or c0.get("label")

    job = JobPosting(
        id=f"rabobank-{job_id}",
        title=title,
        link=url or "",
        posted=posted,
        source=source_name,
        company="Rabobank",
        location=location or None,
        contract_type=normalize_contract_type(title, contract_raw),
        category=classify_job(title),
    )
    try:
        job.location = enrich_location(job.location)
    except Exception:
        pass

    return job

# ---------------------------------------------------------------------------
# MAIN FETCH — Playwright only, arrêt à `limit`
# ---------------------------------------------------------------------------

def fetch(*, keyword: str = "", hours: int = 48, limit: int = 50, **kwargs) -> List[JobPosting]:
    """
    Playwright only. On iterate ?page=1..N jusqu'à atteindre `limit` (raw uniques),
    puis conversion -> JobPosting + filtres (keyword, hours).
    """
    print("🚀 Démarrage du fetcher pour RABOBANK (Playwright only, stop at limit)…")

    raw_jobs = _playwright_collect_raw_jobs(SEARCH_URL, limit=limit)
    if not raw_jobs:
        print("  ❌ Impossible de récupérer les offres.")
        return []

    jobs: List[JobPosting] = []
    seen_ids: set[str] = set()

    for raw in raw_jobs:
        jp = _to_jobposting(raw, source_name="RABOBANK")
        if not jp:
            continue
        if keyword and keyword.lower() not in jp.title.lower():
            continue
        if not _within_hours(jp.posted, hours):
            continue
        if jp.id in seen_ids:
            continue
        seen_ids.add(jp.id)
        jobs.append(jp)
        if len(jobs) >= limit:
            break

    print(f"✅ RABOBANK: {len(jobs)} offre(s) collectée(s).")
    return jobs
