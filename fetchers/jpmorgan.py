# Fichier: fetchers/jpmorgan.py (Version 3 - Condition de Boucle Corrigée)

import re
from datetime import datetime, timezone

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError

from models import JobPosting

JOBS_URL = "https://jpmc.fa.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1001/jobs?mode=location"


def fetch(limit: int, source_name: str, **kwargs) -> list[JobPosting]:
    """
    Récupère les offres d'emploi pour JP Morgan (portail Oracle Cloud)
    en gérant la pagination par défilement (infinite scroll) et en respectant la limite.
    """
    job_postings: list[JobPosting] = []
    processed_ids = set()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print(f"[{source_name}] Navigation vers la page carrière...")
            page.goto(JOBS_URL, wait_until="networkidle", timeout=60000)

            try:
                cookie_button = page.get_by_role('button', name='Decline')
                if cookie_button.is_visible(timeout=5000):
                    print(f"[{source_name}] Refus des cookies...")
                    cookie_button.click()
            except (TimeoutError, Exception):
                print(f"[{source_name}] Pas de bannière de cookies.")
            
            try:
                page.wait_for_selector("div.job-grid-item", timeout=20000)
                print(f"[{source_name}] Offres initiales chargées.")
            except TimeoutError:
                print(f"[{source_name}] Aucune offre n'a pu être chargée initialement.")
                return []

            # ==================== MODIFICATION CLÉ : Condition de Boucle Corrigée ====================
            # La boucle s'arrête dès que le nombre d'offres affichées sur la page atteint la limite.
            while page.locator("li[data-qa='searchResultItem']").count() < limit:
                jobs_before_scroll = page.locator("li[data-qa='searchResultItem']").count()
                
                print(f"[{source_name}] Défilement pour charger plus d'offres... ({jobs_before_scroll} offres visibles)")
                page.mouse.wheel(0, 20000) # Scroll un peu plus grand pour être sûr
                
                try:
                    js_condition = f"() => document.querySelectorAll(\"li[data-qa='searchResultItem']\").length > {jobs_before_scroll}"
                    page.wait_for_function(js_condition, timeout=10000)
                    print(f"[{source_name}] Nouvelles offres chargées.")
                except TimeoutError:
                    print(f"[{source_name}] Plus de nouvelles offres chargées par le défilement. Fin.")
                    break
            # =======================================================================================
            
            print(f"[{source_name}] Assez d'offres chargées, début du parsing.")
            
            html_content = page.content()
            soup = BeautifulSoup(html_content, "html.parser")
            job_cards = soup.select("div.job-grid-item")
            print(f"[{source_name}] {len(job_cards)} cartes d'offres trouvées pour l'analyse.")

            for card in job_cards:
                if len(job_postings) >= limit: break

                link_tag = card.select_one("a.job-grid-item__link")
                if not link_tag or not link_tag.get("href"): continue

                link = link_tag["href"]
                job_id_match = re.search(r'/job/(\d+)/', link)
                if not job_id_match: continue
                
                job_id = job_id_match.group(1)
                unique_id = f"{source_name}_{job_id}"
                if unique_id in processed_ids: continue
                processed_ids.add(unique_id)

                title_tag = card.select_one("span.job-tile__title")
                location_tag = card.select_one("span[data-bind*='primaryLocation']")
                
                title = title_tag.get_text(strip=True) if title_tag else "N/A"
                location = location_tag.get_text(strip=True) if location_tag else "N/A"
                
                job = JobPosting(
                    id=unique_id, title=title, link=link, posted=datetime.now(timezone.utc),
                    source=source_name, company=source_name, location=location
                )
                job_postings.append(job)

        except Exception as e:
            print(f"[{source_name}] Une erreur est survenue: {e}")
        finally:
            browser.close()

    print(f"[{source_name}] Fetch terminé. {len(job_postings)} offres récupérées.")
    return job_postings[:limit]