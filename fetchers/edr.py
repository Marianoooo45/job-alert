# Fichier : fetchers/edr.py (Version finale, avec pagination par scroll)

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
from bs4 import BeautifulSoup
from typing import List
from datetime import datetime, timezone

from models import JobPosting
from storage.classifier import classify_job, normalize_contract_type

SEARCH_PAGE_URL = "https://evht.fa.ocs.oraclecloud.eu/hcmUI/CandidateExperience/fr/sites/CX_7001/jobs"
BASE_URL = "https://evht.fa.ocs.oraclecloud.eu"
USER_AGENT_STRING = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'

def fetch(keyword: str, hours: int, limit: int, **bank_args) -> List[JobPosting]:
    print("Fetching jobs from Edmond de Rothschild (with scroll-based pagination)...")
    jobs: List[JobPosting] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(user_agent=USER_AGENT_STRING)
        page = context.new_page()
        page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

        try:
            print(f"  Navigating to {SEARCH_PAGE_URL}...")
            page.goto(SEARCH_PAGE_URL, wait_until='domcontentloaded', timeout=40000)

            print("  Waiting for initial job cards to be loaded...")
            page.wait_for_selector('div.job-list-item', timeout=30000)
            print("  ✅ Initial job cards are visible.")

            # --- NOUVEAU : BOUCLE DE PAGINATION PAR SCROLL ET CLIC ---
            last_job_count = 0
            while True:
                current_job_count = len(page.query_selector_all('div.job-list-item'))

                # Si le nombre d'offres n'a pas changé depuis le dernier tour, on a fini.
                if current_job_count == last_job_count:
                    print("  - No new jobs loaded. Finalizing list.")
                    break
                
                print(f"  {current_job_count} jobs currently visible. Attempting to load more...")
                last_job_count = current_job_count

                # Action 1: On scrolle tout en bas pour déclencher le chargement.
                print("    -> Scrolling to the bottom of the page...")
                page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                # On attend que le JS ait le temps de réagir au scroll.
                page.wait_for_timeout(2500)

                # Action 2: On cherche le bouton "Afficher plus" et on clique s'il est là.
                try:
                    load_more_button = page.get_by_role("button", name="Afficher plus")
                    if load_more_button.is_visible() and load_more_button.is_enabled():
                        print("    -> Clicking 'Afficher plus' button...")
                        load_more_button.click()
                        # On attend à nouveau après le clic, car c'est une autre action de chargement.
                        page.wait_for_timeout(2500)
                except Exception:
                    # Ce n'est pas une erreur si le bouton n'est pas là, c'est normal pour l'infinite scroll.
                    print("    -> 'Afficher plus' button not found or needed.")
            # --- FIN DE LA BOUCLE DE PAGINATION ---

            print("\n  Pagination complete. Starting extraction...")
            html_content = page.content()
            soup = BeautifulSoup(html_content, 'lxml')
            
            job_cards = soup.find_all('div', class_='job-list-item', limit=limit)
            print(f"  Analyse de {len(job_cards)} cartes d'offres.")

            for card in job_cards:
                title_tag = card.select_one('span.job-tile__title')
                link_tag = card.select_one('a.job-list-item__link')
                if not title_tag or not link_tag or not link_tag.get('href'): continue

                title = title_tag.get_text(strip=True)
                job_url = link_tag['href']
                
                location_tag = card.select_one('div.job-list-item__job-info-value span')
                location_str = location_tag.get_text(strip=True) if location_tag else None
                
                contract_type = normalize_contract_type(title, None)

                try:
                    job_id = f"edr-{job_url.split('/job/')[1].split('?')[0]}"
                except IndexError:
                    job_id = f"edr-{job_url.split('/')[-1]}"

                category = classify_job(title)
                
                job = JobPosting(
                    id=job_id, title=title, link=job_url, posted=datetime.now(timezone.utc),
                    source="EDR", company="Edmond de Rothschild", location=location_str,
                    keyword=keyword, category=category, contract_type=contract_type
                )
                jobs.append(job)

        except Exception as e:
            print(f"  ❌ A critical error occurred: {e}")
            import traceback
            traceback.print_exc()
        finally:
            browser.close()
    
    print(f"✅ EDR: Successfully processed {len(jobs)} jobs.")
    return jobs
