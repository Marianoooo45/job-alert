# Fichier: fetchers/rbc.py
# Description: Fetcher pour les offres d'emploi de RBC, avec pagination.

from typing import List
from bs4 import BeautifulSoup
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

from models import JobPosting
from storage.classifier import classify_job, normalize_contract_type

# --- CONSTANTES ---
BANK_SOURCE = "RBC"
JOBS_PAGE_URL = "https://jobs.rbc.com/ca/fr/search-results"

def fetch(keyword: str, hours: int, limit: int, **bank_args) -> List[JobPosting]:
    """
    Récupère les offres d'emploi de RBC en naviguant à travers les pages.
    """
    print(f"[{BANK_SOURCE}] Démarrage du fetcher avec pagination...")
    jobs_list: List[JobPosting] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        try:
            print(f"  Navigating to {JOBS_PAGE_URL}")
            page.goto(JOBS_PAGE_URL, timeout=90000, wait_until="domcontentloaded")

            try:
                print("  Looking for the cookie button...")
                # On utilise le sélecteur plus robuste de ton enregistrement
                page.get_by_role("button", name="Accepter tous les témoins").click(timeout=10000)
                print("  ✅ Cookie banner accepted.")
            except PlaywrightTimeoutError:
                print("  - Cookie banner not found or already accepted.")

            page_num = 1
            # --- NOUVEAU : BOUCLE DE PAGINATION ---
            while True:
                print(f"--- Scraping page {page_num}... ---")
                page.wait_for_selector('ul[data-ph-at-id="jobs-list"]', timeout=30000)
                
                html_content = page.content()
                soup = BeautifulSoup(html_content, "html.parser")
                job_cards_on_page = soup.select('li.jobs-list-item')

                if not job_cards_on_page:
                    print("  - No job cards found on this page. Stopping.")
                    break
                
                print(f"  Found {len(job_cards_on_page)} job cards on this page.")

                for card in job_cards_on_page:
                    link_tag = card.select_one('a[data-ph-at-id="job-link"]')
                    if not link_tag: continue

                    title = link_tag.get('data-ph-at-job-title-text', '').strip()
                    job_url = link_tag.get('href', '').strip()
                    location_str = link_tag.get('data-ph-at-job-location-text', '').strip()
                    contract_raw = link_tag.get('data-ph-at-job-type-text', '').strip()
                    job_id_raw = link_tag.get('data-ph-at-job-id-text', '').strip()

                    if not all([title, job_url, job_id_raw]): continue

                    job = JobPosting(
                        id=f"rbc-{job_id_raw}", title=title, link=job_url,
                        posted=datetime.now(timezone.utc), source=BANK_SOURCE, company=BANK_SOURCE,
                        location=location_str, keyword=keyword,
                        category=classify_job(title),
                        contract_type=normalize_contract_type(contract_raw, title)
                    )
                    jobs_list.append(job)
                
                print(f"  Total jobs collected so far: {len(jobs_list)}")
                if len(jobs_list) >= limit:
                    print(f"  Limit of {limit} reached. Stopping pagination.")
                    break

                # --- PARTIE PAGINATION BASÉE SUR TON ENREGISTREMENT ---
                try:
                    next_button = page.get_by_role("button", name="View next page")
                    
                    if not next_button.is_visible() or not next_button.is_enabled():
                        print("  - 'Next page' button is not visible or enabled. All pages scraped.")
                        break

                    print("  Clicking 'Next page' button...")
                    next_button.click()
                    page.wait_for_load_state('networkidle', timeout=20000) # 'networkidle' est plus sûr pour les SPAs
                    page_num += 1
                except Exception:
                    print("  - Could not find or click 'Next page' button. Assuming all pages are scraped.")
                    break
            # --- FIN DE LA BOUCLE ---

        except Exception as e:
            print(f"  ❌ A critical error occurred in {BANK_SOURCE} fetcher: {e}")
            import traceback
            traceback.print_exc()
        finally:
            browser.close()
            
    print(f"\n✅ {BANK_SOURCE}: Successfully processed {len(jobs_list)} jobs.")
    return jobs_list[:limit]