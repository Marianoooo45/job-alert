# Fichier : fetchers/bpce.py (VERSION FINALE AVEC PAUSE FIXE FIABLE)

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
from bs4 import BeautifulSoup
from typing import List
from datetime import datetime, timezone

from models import JobPosting
from storage.classifier import classify_job, normalize_contract_type

# --- Constantes ---
BASE_URL = "https://recrutement.bpce.fr"
SEARCH_PAGE_URL = f"{BASE_URL}/offres-emploi?external=false"
USER_AGENT_STRING = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'

def fetch(keyword: str, hours: int, limit: int, **bank_args) -> List[JobPosting]:
    print("Fetching jobs from BPCE (with robust fixed pause)...")
    jobs: List[JobPosting] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(user_agent=USER_AGENT_STRING)
        page = context.new_page()
        page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

        try:
            print(f"  Navigating to {SEARCH_PAGE_URL}...")
            page.goto(SEARCH_PAGE_URL, wait_until='domcontentloaded', timeout=45000)

            # --- SÉQUENCE DE NETTOYAGE VALIDÉE ---
            try:
                page.get_by_role('button', name='Tout accepter').click(timeout=10000)
                print("  ✅ First cookie banner accepted.")
                page.wait_for_timeout(1000)
                page.get_by_role('button', name='Tout accepter').click(timeout=5000)
                print("  ✅ Second cookie banner accepted.")
            except PlaywrightTimeoutError:
                print("  - Cookie sequence complete or not needed.")

            page.wait_for_selector('div.c-offer', timeout=20000)

            # --- BOUCLE DE PAGINATION AVEC PAUSE FIXE ---
            while True:
                current_job_count = page.locator('div.c-offer').count()
                print(f"  Currently {current_job_count} jobs visible in DOM.")
                
                if current_job_count >= limit:
                    print(f"  Limit of {limit} reached. Stopping pagination.")
                    break
                
                try:
                    load_more_button = page.get_by_role("button", name="Voir plus")
                    if not load_more_button.is_visible(): break
                        
                    print("  Clicking 'Voir plus' button...")
                    load_more_button.click()
                    
                    # --- LA CORRECTION FINALE : LA PAUSE FIABLE ---
                    print("    Waiting for 3 seconds for new jobs to load...")
                    page.wait_for_timeout(3000)
                    
                    new_job_count = page.locator('div.c-offer').count()
                    if new_job_count == current_job_count:
                        print("    Job count did not increase. Stopping.")
                        break

                except Exception as e:
                    print(f"  - Pagination stopped. Reason: {e}"); break
            
            # --- PARSING FINAL ---
            html_content = page.content()
            soup = BeautifulSoup(html_content, 'lxml')
            job_cards = soup.find_all('div', class_='c-offer', limit=limit)
            print(f"  Final count: {len(job_cards)} job cards to be processed.")

            for card in job_cards:
                title_tag = card.select_one('h3.c-offer-title'); link_tag = card.select_one('a.c-offerLink')
                if not title_tag or not link_tag: continue
                title = title_tag.get_text(strip=True); job_url = BASE_URL + link_tag['href']
                company_tag = card.select_one('div.c-offer-brand'); infos_list = card.select('ul.c-offer-infos li')
                company = company_tag.get_text(strip=True) if company_tag else 'Groupe BPCE'
                raw_contract, location_str = None, None
                for info in infos_list:
                    if 'icon-contract' in str(info): raw_contract = info.get_text(strip=True)
                    elif 'icon-location' in str(info): location_str = info.get_text(strip=True)
                try: job_id = f"bpce-{job_url.split('/job/')[-1]}"
                except IndexError: job_id = f"bpce-{job_url}"
                job = JobPosting(id=job_id, title=title, link=job_url, posted=datetime.now(timezone.utc), source="BPCE", company=company, location=location_str, keyword=keyword, category=classify_job(title), contract_type=normalize_contract_type(title, raw_contract))
                jobs.append(job)

        except Exception as e:
            print(f"  ❌ A critical error occurred: {e}"); import traceback; traceback.print_exc()
        finally:
            browser.close()
    
    print(f"✅ BPCE: Successfully processed {len(jobs)} jobs.")
    return jobs