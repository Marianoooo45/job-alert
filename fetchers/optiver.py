# Fichier: fetchers/optiver.py (Version 2 - ID Fiabilisé)

from datetime import datetime, timezone
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError

from models import JobPosting

BASE_URL = "https://optiver.com"
JOBS_URL = "https://optiver.com/working-at-optiver/career-opportunities/"


def fetch(limit: int, source_name: str, **kwargs) -> list[JobPosting]:
    job_postings: list[JobPosting] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print(f"[{source_name}] Navigation vers la page carrière...")
            page.goto(JOBS_URL, wait_until="networkidle")

            try:
                cookie_button = page.get_by_role('button', name='Reject')
                if cookie_button.is_visible(timeout=5000):
                    print(f"[{source_name}] Refus des cookies...")
                    cookie_button.click()
            except (TimeoutError, Exception):
                print(f"[{source_name}] Pas de bannière de cookies.")

            page_num = 1
            while len(job_postings) < limit:
                print(f"[{source_name}] Analyse de la page {page_num}...")
                
                try:
                    page.wait_for_selector("li.php-result-item", timeout=15000)
                except TimeoutError:
                    print(f"[{source_name}] Aucune offre trouvée. Arrêt.")
                    break
                
                html_content = page.content()
                soup = BeautifulSoup(html_content, "html.parser")
                
                job_cards = soup.select("li.php-result-item")
                if not job_cards: break

                for card in job_cards:
                    if len(job_postings) >= limit: break

                    link_tag = card.select_one("h5.h5 a")
                    if not link_tag or not link_tag.get("href"): continue
                    
                    absolute_link = link_tag["href"]
                    # ==================== ID STABLE ====================
                    # On s'assure de prendre le dernier segment numérique de l'URL
                    job_id = absolute_link.rstrip('/').split('/')[-1]
                    # =================================================

                    title = link_tag.get_text(strip=True)
                    
                    meta_tag = card.select_one("p.text-s")
                    location = ""
                    if meta_tag:
                        parts = [part.strip() for part in meta_tag.get_text().split('•')]
                        if len(parts) > 1: location = parts[1]

                    contract_type = card.select_one("p.text-term").get_text(strip=True) if card.select_one("p.text-term") else None
                    
                    job = JobPosting(
                        id=f"{source_name}_{job_id}", title=title, link=absolute_link,
                        posted=datetime.now(timezone.utc), source=source_name,
                        company=source_name, location=location, contract_type=contract_type,
                    )
                    job_postings.append(job)

                if len(job_postings) >= limit: break
                
                try:
                    next_button = page.get_by_role('link').filter(has_text='Next »')
                    if not next_button.is_visible():
                        print(f"[{source_name}] Bouton 'Next' non visible. Fin.")
                        break

                    print(f"[{source_name}] Clic sur la page suivante...")
                    next_button.click()
                    page.wait_for_load_state("networkidle", timeout=20000)
                    page_num += 1
                except (TimeoutError, Exception):
                    print(f"[{source_name}] Impossible de trouver la page suivante. Fin.")
                    break

        except Exception as e:
            print(f"[{source_name}] Une erreur est survenue: {e}")
        finally:
            browser.close()
    
    print(f"[{source_name}] Fetch terminé. {len(job_postings)} offres récupérées.")
    return job_postings[:limit]