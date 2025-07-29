# Fichier : fetchers/hsbc.py (Version finale avec pagination par clics)

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
from bs4 import BeautifulSoup
from typing import List
from datetime import datetime, timezone

from models import JobPosting
from storage.classifier import classify_job, normalize_contract_type

SEARCH_PAGE_URL = "https://mycareer.hsbc.com/fr_FR/external"
BASE_URL = "https://mycareer.hsbc.com"
USER_AGENT_STRING = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'

def fetch(keyword: str, hours: int, limit: int, **bank_args) -> List[JobPosting]:
    print("Fetching jobs from HSBC (with pagination by click)...")
    jobs: List[JobPosting] = []

    with sync_playwright() as p:
        # On utilise headless=True pour l'exécution normale
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(user_agent=USER_AGENT_STRING)
        page = context.new_page()
        page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

        try:
            print(f"  Navigating to {SEARCH_PAGE_URL}...")
            page.goto(SEARCH_PAGE_URL, wait_until='domcontentloaded', timeout=40000)

            try:
                cookie_frame = page.frame_locator('iframe[title="Gestion des consentements"]')
                cookie_frame.get_by_role('button', name='Accepter les cookies').click(timeout=10000)
                print("  ✅ Cookie banner accepted via iframe.")
            except Exception:
                print("  - Cookie banner not found or could not be clicked. Continuing anyway.")
            
            page_num = 1
            # --- BOUCLE DE PAGINATION PAR CLICS ---
            while True:
                print(f"--- Scraping page {page_num}... ---")
                page.wait_for_selector('article.article--result', timeout=30000)
                
                html_content = page.content()
                soup = BeautifulSoup(html_content, 'lxml')
                job_cards_on_page = soup.find_all('article', class_='article--result')
                
                if not job_cards_on_page: 
                    print("  - No job cards found on this page. Stopping.")
                    break
                print(f"  Found {len(job_cards_on_page)} job cards on this page.")

                for card in job_cards_on_page:
                    title_tag = card.select_one('h3 a')
                    if not title_tag or not title_tag.get('href'): continue

                    title = title_tag.get_text(strip=True)
                    job_url = title_tag['href']
                    
                    location_tag = card.select_one('span.location')
                    contract_tag = card.select_one('i.icon--clock + span.article--item')
                    
                    location_str = location_tag.get_text(strip=True) if location_tag else None
                    raw_contract = contract_tag.get_text(strip=True) if contract_tag else None
                    
                    contract_type = normalize_contract_type(title, raw_contract)
                    
                    try: job_id = f"hsbc-{job_url.split('/')[-1]}"
                    except IndexError: job_id = f"hsbc-{job_url}"

                    job = JobPosting(
                        id=job_id, title=title, link=job_url,
                        posted=datetime.now(timezone.utc), source="HSBC", company="HSBC",
                        location=location_str, keyword=keyword, category=classify_job(title),
                        contract_type=contract_type
                    )
                    jobs.append(job)

                print(f"  Total jobs collected so far: {len(jobs)}")
                if len(jobs) >= limit:
                    print(f"  Limit of {limit} reached. Stopping pagination.")
                    break

                # --- PARTIE MISE À JOUR AVEC TON SÉLECTEUR ---
                try:
                    # Le sélecteur parfait, fourni par ton enregistrement !
                    next_button = page.get_by_role("link", name="Allez à la page numéro Suiv")
                    
                    if not next_button.is_visible() or not next_button.is_enabled():
                        print("  - 'Next page' button is not visible or enabled. All pages scraped.")
                        break

                    print("  Clicking 'Next page' button...")
                    next_button.click()
                    # Attendre que la page se recharge après le clic
                    page.wait_for_load_state('domcontentloaded', timeout=15000)
                    page_num += 1
                except Exception:
                    print("  - Could not find or click 'Next page' button. Assuming all pages are scraped.")
                    break
            # --- FIN DE LA BOUCLE ---

        except Exception as e:
            print(f"  ❌ A critical error occurred: {e}")
            import traceback
            traceback.print_exc()
        finally:
            browser.close()
    
    print(f"\n✅ HSBC: Successfully processed {len(jobs)} jobs.")
    return jobs[:limit]