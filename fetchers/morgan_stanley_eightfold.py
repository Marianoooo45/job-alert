# Fichier: fetchers/morgan_stanley_eightfold.py (Dédié au portail Eightfold)

from __future__ import annotations
import re
from datetime import datetime, timezone, timedelta
from typing import List
from bs4 import BeautifulSoup, Tag
from models import JobPosting
from playwright.sync_api import sync_playwright
from storage.classifier import classify_job, normalize_contract_type

BANK_SOURCE = "MS"
BASE_URL = "https://morganstanley.eightfold.ai"
SEARCH_PAGE_URL = f"{BASE_URL}/careers"

def _parse_date(raw_text: str | None) -> datetime:
    now = datetime.now(timezone.utc)
    if not raw_text: return now
    raw_text = raw_text.lower()
    if any(s in raw_text for s in ["heures", "hour"]):
        if match := re.search(r'(\d+)', raw_text): return now - timedelta(hours=int(match.group(1)))
    if any(s in raw_text for s in ["jours", "day"]):
        if match := re.search(r'(\d+)', raw_text): return now - timedelta(days=int(match.group(1)))
    # ... (vous pouvez ajouter semaines/mois si nécessaire)
    return now

def _parse_card(card: Tag) -> JobPosting | None:
    link_tag = card.select_one('a.card-F1ebU')
    if not link_tag or not link_tag.get('href'): return None
    relative_url = link_tag['href']; title_tag = link_tag.select_one('.title-1aNJK')
    location_tag = link_tag.select_one('.fieldValue-3kEar'); date_tag = link_tag.select_one('.subData-13Lm1')
    if not all([title_tag, location_tag, date_tag]): return None
    title = title_tag.get_text(strip=True); location_str = location_tag.get_text(strip=True)
    date_text = date_tag.get_text(strip=True)
    try:
        job_id_part = relative_url.split('/job/')[-1]; job_id = f"ms-{job_id_part.split('?')[0]}"
    except IndexError: return None
    return JobPosting(id=job_id, title=title, link=f"{BASE_URL}{relative_url}", posted=_parse_date(date_text), source=BANK_SOURCE, company="Morgan Stanley", location=location_str, contract_type=normalize_contract_type(title, "Temps plein"), category=classify_job(title))

def fetch(*, keyword: str = "", hours: int = 48, limit: int = 50, **kwargs) -> list[JobPosting]:
    print(f"🚀 Démarrage du fetcher pour {BANK_SOURCE} (Portail Eightfold)...")
    if keyword: return []
    jobs: List[JobPosting] = []
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        context = browser.new_context()
        page = context.new_page()
        try:
            page.goto(SEARCH_PAGE_URL, timeout=90000)
            try:
                page.get_by_role('button', name='Accept all cookies').click(timeout=5000)
                print("  [MS] Cookies acceptés.")
            except Exception: pass
            page_num = 1
            while len(jobs) < limit:
                page.wait_for_selector('.cardContainer-GcY1a', timeout=20000); soup = BeautifulSoup(page.content(), 'lxml')
                container = soup.select_one('div.cardlist-8kM5_')
                if not container: break
                cards = container.select('.cardContainer-GcY1a')
                if not cards: break
                new_jobs_count = 0
                for card in cards:
                    if len(jobs) >= limit: break
                    job = _parse_card(card)
                    if job and job.id not in {j.id for j in jobs}:
                        jobs.append(job); new_jobs_count += 1
                print(f"  [MS] Page {page_num} analysée. {new_jobs_count} nouvelle(s) offre(s). Total : {len(jobs)}")
                if len(jobs) >= limit: break
                try:
                    next_button = page.get_by_role('navigation', name='Pagination des emplois').get_by_label('Next')
                    if next_button.is_disabled(): break
                    next_button.click(); page_num += 1; page.wait_for_timeout(2000)
                except Exception: print("  [MS] Fin de la pagination."); break
        except Exception as e:
            print(f"  ❌ Une erreur critique est survenue: {e}")
        finally:
            browser.close()
    print(f"✅ {BANK_SOURCE} (Eightfold): {len(jobs)} offres collectées.")
    return jobs[:limit]