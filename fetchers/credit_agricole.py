# Fichier : fetchers/credit_agricole.py (VERSION FINALE ET FONCTIONNELLE)

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
from bs4 import BeautifulSoup
from typing import List
from datetime import datetime, timezone

from models import JobPosting
from storage.classifier import classify_job, normalize_contract_type

# --- Constantes ---
SEARCH_PAGE_URL = "https://groupecreditagricole.jobs/fr/nos-offres/"
BASE_URL = "https://groupecreditagricole.jobs"
USER_AGENT_STRING = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'

def fetch(keyword: str, hours: int, limit: int, **bank_args) -> List[JobPosting]:
    print("Fetching jobs from Crédit Agricole (with correct pagination)...")
    jobs: List[JobPosting] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True) 
        context = browser.new_context(user_agent=USER_AGENT_STRING)
        page = context.new_page()
        page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

        try:
            print(f"  Navigating to {SEARCH_PAGE_URL}...")
            page.goto(SEARCH_PAGE_URL, wait_until='domcontentloaded', timeout=30000)

            try:
                page.get_by_role('button', name='ACCEPTER').click(timeout=10000)
                print("  ✅ Cookie banner accepted.")
            except PlaywrightTimeoutError:
                print("  - Cookie banner not found or already accepted.")

            # --- BOUCLE DE PAGINATION AVEC LE BON SÉLECTEUR ---
            page_num = 1
            while True:
                print(f"--- Scraping page {page_num}... ---")
                page.wait_for_selector('article.offer', timeout=20000)
                
                html_content = page.content()
                soup = BeautifulSoup(html_content, 'lxml')
                job_cards_on_page = soup.find_all('article', class_='offer')
                
                if not job_cards_on_page: break
                print(f"  Found {len(job_cards_on_page)} job cards on this page.")

                for card in job_cards_on_page:
                    link_tag = card.select_one('h3.offer-title > a')
                    if not link_tag: continue
                    title = card.get('data-gtm-jobtitle', 'N/A'); location_str = card.get('data-gtm-jobcity');
                    raw_contract = card.get('data-gtm-jobcontract'); company = card.get('data-gtm-jobentity', 'Crédit Agricole');
                    job_url = link_tag['href'];
                    try: job_id = f"creditagricole-{job_url.split('/')[-2]}"
                    except IndexError: job_id = f"creditagricole-{job_url}"
                    job = JobPosting(id=job_id, title=title, link=job_url, posted=datetime.now(timezone.utc), source="CA", company=company, location=location_str, keyword=keyword, category=classify_job(title), contract_type=normalize_contract_type(title, raw_contract))
                    jobs.append(job)

                print(f"  Total jobs collected so far: {len(jobs)}")

                if len(jobs) >= limit:
                    print(f"  Limit of {limit} reached. Stopping pagination.")
                    break

                # --- LE SÉLECTEUR PARFAIT, GRÂCE À VOUS ---
                try:
                    next_button = page.get_by_role("button", name=" Prochaine page")
                    if not next_button.is_visible():
                        print("  'Next page' button is not visible. All pages scraped.")
                        break

                    print("  Clicking 'Next page' button...")
                    next_button.click()
                    page.wait_for_load_state('domcontentloaded', timeout=15000)
                    page_num += 1
                except Exception:
                    print("  - Could not find or click 'Next page' button. Assuming all pages are scraped.")
                    break
            # --- FIN DE LA BOUCLE ---

        except Exception as e:
            print(f"  ❌ A critical error occurred: {e}"); import traceback; traceback.print_exc()
        finally:
            browser.close()
    
    print(f"✅ Crédit Agricole: Successfully processed {len(jobs)} jobs in total.")
    return jobs[:limit]