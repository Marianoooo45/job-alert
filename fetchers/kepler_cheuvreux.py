# Fichier: fetchers/kepler_cheuvreux.py
# Description: Fetcher pour Kepler Cheuvreux (Version finale avec le bon sélecteur de titre)

from typing import List
from bs4 import BeautifulSoup
from datetime import datetime, timezone
import re
from playwright.sync_api import sync_playwright

from models import JobPosting
from storage.classifier import classify_job, normalize_contract_type

# --- CONSTANTES ---
BANK_SOURCE = "KC"
JOBS_PAGE_URL = "https://keplercheuvreux.teamtailor.com/jobs"

def fetch(keyword: str, hours: int, limit: int, **bank_args) -> List[JobPosting]:
    print(f"[{BANK_SOURCE}] Démarrage du fetcher (avec le bon sélecteur)...")
    jobs_list: List[JobPosting] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print(f"  Navigating to {JOBS_PAGE_URL}")
            page.goto(JOBS_PAGE_URL, timeout=60000)

            print("  Scrolling page to load all jobs...")
            for _ in range(5):
                page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                page.wait_for_timeout(2000)

            page.wait_for_selector('ul#jobs_list_container li', timeout=20000)
            
            soup = BeautifulSoup(page.content(), "html.parser")
            job_cards = soup.select('ul#jobs_list_container > li', limit=limit)
            print(f"  Found {len(job_cards)} job cards. Processing...")

            for card in job_cards:
                link_tag = card.select_one('a')
                if not link_tag:
                    continue

                # --- ✨ LA CORRECTION FINALE ET DÉCISIVE ✨ ---
                # 1. On sélectionne le <span> qui contient le titre.
                title_span = card.select_one('span.company-link-style')
                
                # 2. On extrait l'attribut 'title' de ce <span>.
                title = title_span.get('title', '').strip() if title_span else ''
                # --- FIN DE LA CORRECTION ---

                job_url = link_tag.get('href', '').strip()

                if not title or not job_url:
                    continue
                
                match = re.search(r'/jobs/(\d+)', job_url)
                if not match:
                    continue
                job_id = f"kc-{match.group(1)}"

                info_spans = card.select('div.text-md span')
                location_str = info_spans[-1].get_text(strip=True) if info_spans else None

                contract_type = normalize_contract_type(title, None)
                category = classify_job(title)

                job = JobPosting(
                    id=job_id,
                    title=title,
                    link=job_url,
                    posted=datetime.now(timezone.utc),
                    source=BANK_SOURCE,
                    company="Kepler Cheuvreux",
                    location=location_str,
                    keyword=keyword,
                    category=category,
                    contract_type=contract_type
                )
                jobs_list.append(job)

        except Exception as e:
            print(f"  ❌ A critical error occurred in {BANK_SOURCE} fetcher: {e}")
            import traceback
            traceback.print_exc()
        finally:
            browser.close()
            
    print(f"\n✅ {BANK_SOURCE}: Successfully processed {len(jobs_list)} jobs.")
    return jobs_list