# Fichier: fetchers/cic.py (Version finale, avec la logique de pagination robuste de BPCE)

from typing import List
from bs4 import BeautifulSoup
from datetime import datetime, timezone
from urllib.parse import urljoin
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

from models import JobPosting
from storage.classifier import classify_job, normalize_contract_type

# --- CONSTANTES ---
BANK_SOURCE = "CIC"
BASE_URL = "https://recrutement.cic.fr"
JOBS_PAGE_URL = urljoin(BASE_URL, "/fr/nos_offres.html")

def fetch(keyword: str, hours: int, limit: int, **bank_args) -> List[JobPosting]:
    """
    Récupère les offres de CIC en utilisant la logique de pagination robuste
    (vérification de l'augmentation du nombre d'offres).
    """
    print(f"[{BANK_SOURCE}] Démarrage du fetcher (logique de pagination de BPCE)...")
    jobs_list: List[JobPosting] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print(f"  Navigating to {JOBS_PAGE_URL}")
            page.goto(JOBS_PAGE_URL, timeout=60000, wait_until='domcontentloaded')

            try:
                page.get_by_role("button", name="Accepter les cookies").click(timeout=10000)
                print("  ✅ Cookie banner accepted.")
            except Exception:
                print("  - Cookie banner not found or already accepted.")

            page.wait_for_selector('li.item', timeout=20000)
            print("  ✅ Initial job list is visible.")
            
            # --- BOUCLE DE PAGINATION INSPIRÉE DE BPCE (TRÈS ROBUSTE) ---
            while True:
                # On stocke le nombre d'offres AVANT le clic
                current_job_count = page.locator('li.item').count()
                print(f"  Currently {current_job_count} jobs visible in DOM.")

                if current_job_count >= limit:
                    print(f"  Limit of {limit} reached. Stopping pagination.")
                    break

                try:
                    load_more_button = page.get_by_role("button", name="Afficher plus d'offres 󰌧")
                    if not load_more_button.is_visible():
                        print("  - 'Afficher plus' button is no longer visible.")
                        break

                    print("  Clicking 'Afficher plus d'offres'...")
                    load_more_button.click()
                    
                    # Pause pour laisser le temps au JS de charger le contenu.
                    page.wait_for_timeout(3000) 
                    
                    # On compare le nombre d'offres APRÈS le clic
                    new_job_count = page.locator('li.item').count()
                    if new_job_count == current_job_count:
                        print("  Job count did not increase. All offers loaded.")
                        break
                
                except Exception as e:
                    print(f"  - Pagination stopped. Reason: {e}")
                    break
            # --- FIN DE LA BOUCLE ---

            print("\n  Pagination complete. Starting extraction...")
            html_content = page.content()
            soup = BeautifulSoup(html_content, "html.parser")
            job_cards = soup.select('li.item', limit=limit)
            print(f"  Found {len(job_cards)} job cards to process.")

            for card in job_cards:
                title_tag = card.select_one('span.ei_card_title a')
                if not title_tag: continue

                title = title_tag.get_text(strip=True)
                relative_url = title_tag.get('href')
                if not all([title, relative_url]): continue
                
                job_url = urljoin(BASE_URL, relative_url)
                try:
                    job_id_raw = relative_url.split('annonce=')[-1]
                    job_id = f"cic-{job_id_raw}"
                except IndexError: continue

                infos = card.select('ul.ei_listdescription li')
                location_str = infos[0].get_text(strip=True) if len(infos) > 0 else None
                contract_raw = infos[1].get_text(strip=True) if len(infos) > 1 else None
                
                job = JobPosting(
                    id=job_id, title=title, link=job_url,
                    posted=datetime.now(timezone.utc), source=BANK_SOURCE, company=BANK_SOURCE,
                    location=location_str, keyword=keyword,
                    category=classify_job(title),
                    contract_type=normalize_contract_type(contract_raw, title)
                )
                jobs_list.append(job)

        except Exception as e:
            print(f"  ❌ A critical error occurred in {BANK_SOURCE} fetcher: {e}")
            import traceback
            traceback.print_exc()
        finally:
            browser.close()
            
    print(f"\n✅ {BANK_SOURCE}: Successfully processed {len(jobs_list)} jobs.")
    return jobs_list[:limit]