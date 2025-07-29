# Fichier: fetchers/ing.py (VERSION FINALE AVEC CLIC FORCÉ)
# Description: Fetcher pour les offres d'emploi d'ING.

from typing import List
from bs4 import BeautifulSoup
from datetime import datetime, timezone
from urllib.parse import urljoin
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

# Imports depuis les modules du projet
from models import JobPosting
from storage.classifier import classify_job, normalize_contract_type

# --- CONSTANTES ---
BANK_SOURCE = "ING"
BASE_URL = "https://careers.ing.com"
JOBS_PAGE_URL = "https://careers.ing.com/fr/recherche-d%27offres"

def fetch(keyword: str, hours: int, limit: int, **bank_args) -> List[JobPosting]:
    """
    Récupère les offres d'emploi d'ING en forçant le clic sur le bouton de pagination
    pour passer outre les overlays bloquants.
    """
    print(f"[{BANK_SOURCE}] Démarrage du fetcher...")
    jobs_list: List[JobPosting] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print(f"  Navigating to {JOBS_PAGE_URL}")
            page.goto(JOBS_PAGE_URL, timeout=60000, wait_until='domcontentloaded')

            try:
                page.get_by_role('button', name='Accept all cookies').click(timeout=5000)
                print("  ✅ Cookie banner accepted.")
            except PlaywrightTimeoutError:
                print("  - Cookie banner not found or already accepted.")

            # --- BOUCLE DE PAGINATION (logique de gestion d'overlay supprimée) ---
            page_num = 1
            while True:
                print(f"--- Scraping page {page_num}... ---")
                
                page.wait_for_selector('li.search-results-item', timeout=20000)
                soup = BeautifulSoup(page.content(), "html.parser")
                job_cards_on_page = soup.select('li.search-results-item')
                
                if not job_cards_on_page: break

                for card in job_cards_on_page:
                    link_tag = card.select_one('a[data-job-id]'); title_tag = card.select_one('h2.vacancy-item__title')
                    if not (link_tag and title_tag): continue
                    title = title_tag.get_text(strip=True); relative_url = link_tag.get('href'); job_id_raw = link_tag.get('data-job-id')
                    if not all([title, relative_url, job_id_raw]): continue
                    job = JobPosting(id=f"ing-{job_id_raw}", title=title, link=urljoin(BASE_URL, relative_url), posted=datetime.now(timezone.utc), source=BANK_SOURCE, company=BANK_SOURCE, location=(card.select_one('span.job-location').get_text(strip=True) if card.select_one('span.job-location') else None), keyword=keyword, category=classify_job(title), contract_type=normalize_contract_type(" ".join([tag.get_text(strip=True) for tag in card.select('li.vacancy-item__meta')]), title))
                    jobs_list.append(job)

                print(f"  {len(job_cards_on_page)} jobs found on this page. Total collected: {len(jobs_list)}")

                if len(jobs_list) >= limit:
                    print(f"  Limit of {limit} reached. Stopping pagination.")
                    break

                next_button = page.locator('a.next')
                if "disabled" in (next_button.get_attribute("class") or ""):
                    print("  'Next' button is disabled. All pages scraped.")
                    break
                
                print("  Clicking 'Next' button...")
                # --- LA CORRECTION FINALE : LE CLIC FORCÉ ---
                next_button.click(force=True)
                
                page.wait_for_load_state('domcontentloaded', timeout=15000)
                page_num += 1

        except Exception as e:
            print(f"  ❌ A critical error occurred in {BANK_SOURCE} fetcher: {e}")
            import traceback
            traceback.print_exc()
        finally:
            browser.close()
            
    print(f"✅ {BANK_SOURCE}: Successfully processed {len(jobs_list)} jobs.")
    return jobs_list[:limit]