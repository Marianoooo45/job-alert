# Fichier: fetchers/bofa_main.py (Portail Principal)

from __future__ import annotations
from datetime import datetime, timezone
from typing import List
from bs4 import BeautifulSoup, Tag
from models import JobPosting
from playwright.sync_api import sync_playwright, Page
from storage.classifier import classify_job, normalize_contract_type

# --- CONSTANTES ---
BANK_SOURCE = "BOFA"
BASE_URL = "https://careers.bankofamerica.com"
SEARCH_PAGE_URL = f"{BASE_URL}/en-us/job-search?ref=search&start=0&rows=10&search=getAllJobs"

# --- Fonctions de Parsing (communes aux deux fetchers) ---
def _parse_date(raw_text: str | None) -> datetime:
    if not raw_text: return datetime.now(timezone.utc)
    # Ex: "Posted Aug 20, 2025" -> "Aug 20, 2025"
    date_part = raw_text.replace("Posted ", "").strip()
    try:
        return datetime.strptime(date_part, "%b %d, %Y").replace(tzinfo=timezone.utc)
    except ValueError:
        return datetime.now(timezone.utc)

def _parse_card(card: Tag) -> JobPosting | None:
    link_tag = card.select_one("a.job-search-tile__url")
    if not link_tag or not link_tag.get('href'): return None

    title = link_tag.get_text(strip=True)
    relative_url = link_tag['href']
    full_url = f"{BASE_URL}{relative_url}"
    
    # Extraction robuste de la date et du lieu
    date_str, location_str = None, None
    details_p = card.select("div.job-search-tile__detail p")
    for p_tag in details_p:
        if p_tag.select_one("i[aria-label='date']"):
            date_str = p_tag.get_text(strip=True)
        elif p_tag.select_one("i[aria-label='location']"):
            location_str = p_tag.get_text(strip=True)

    try:
        # L'ID est dans l'URL, ex: /en-us/job-detail/25030343/...
        job_id = f"bofa-{relative_url.split('/job-detail/')[1].split('/')[0]}"
    except IndexError:
        return None

    return JobPosting(
        id=job_id,
        title=title,
        link=full_url,
        posted=_parse_date(date_str),
        source=BANK_SOURCE,
        company="Bank of America",
        location=location_str,
        contract_type=normalize_contract_type(title, "Temps plein"),
        category=classify_job(title)
    )

def _scrape_page(page: Page, limit: int, jobs: List[JobPosting]):
    """Fonction générique pour scraper une page et la suivante."""
    page_num = 1
    while len(jobs) < limit:
        print(f"  [BOFA] Analyse de la page {page_num}...")
        page.wait_for_selector('.job-search-results-listing__item', timeout=20000)
        soup = BeautifulSoup(page.content(), 'lxml')
        
        cards = soup.select('.job-search-results-listing__item')
        if not cards:
            print("  Pas de nouvelles offres trouvées sur cette page.")
            break
        
        for card in cards:
            job = _parse_card(card)
            if job and job.id not in {j.id for j in jobs}:
                jobs.append(job)
        
        print(f"  {len(jobs)} offres collectées au total.")
        if len(jobs) >= limit: break

        try:
            next_button = page.get_by_role("link", name="Next")
            if not next_button.is_visible():
                print("  Fin de la pagination (bouton 'Next' non visible).")
                break
            
            print("  Passage à la page suivante...")
            next_button.click()
            page.wait_for_load_state('domcontentloaded', timeout=15000)
            page_num += 1
        except Exception:
            print("  Fin de la pagination (erreur ou bouton introuvable).")
            break

def fetch(*, keyword: str = "", hours: int = 48, limit: int = 50, **kwargs) -> list[JobPosting]:
    print(f"🚀 Démarrage du fetcher pour {BANK_SOURCE} (Portail Principal)...")
    if keyword: return []
    jobs: List[JobPosting] = []
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        context = browser.new_context()
        page = context.new_page()
        try:
            page.goto(SEARCH_PAGE_URL, timeout=90000)
            try:
                page.get_by_role('button', name='Accept', exact=False).click(timeout=10000)
                print("  Cookies acceptés.")
            except Exception: pass
            
            _scrape_page(page, limit, jobs)
            
        except Exception as e:
            print(f"  ❌ Une erreur critique est survenue: {e}")
        finally:
            browser.close()
    
    print(f"✅ {BANK_SOURCE} (Principal): {len(jobs)} offres collectées.")
    return jobs[:limit]