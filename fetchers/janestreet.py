# Fichier: fetchers/janestreet.py

from datetime import datetime, timezone
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError

from models import JobPosting

BASE_URL = "https://www.janestreet.com"
JOBS_URL = "https://www.janestreet.com/join-jane-street/open-roles/?type=students-and-new-grads&location=london"


def fetch(limit: int, source_name: str, **kwargs) -> list[JobPosting]:
    """
    Récupère les offres d'emploi pour Jane Street.
    """
    job_postings: list[JobPosting] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print(f"[{source_name}] Navigation vers la page carrière...")
            page.goto(JOBS_URL, wait_until="networkidle")

            # 1. Gérer la bannière de cookies
            try:
                # Le bouton est un <div>, pas un <button>
                cookie_button = page.get_by_text('Reject All')
                if cookie_button.is_visible(timeout=5000):
                    print(f"[{source_name}] Refus des cookies...")
                    cookie_button.click()
            except (TimeoutError, Exception):
                print(f"[{source_name}] Pas de bannière de cookies.")
            
            # 2. Parser les offres
            html_content = page.content()
            soup = BeautifulSoup(html_content, "html.parser")
            
            # Chaque offre est un lien <a> dans le conteneur principal
            job_cards = soup.select("div.jobs-container > a")
            print(f"[{source_name}] {len(job_cards)} cartes d'offres trouvées.")

            for card in job_cards:
                if len(job_postings) >= limit:
                    break

                relative_link = card.get("href")
                if not relative_link:
                    continue
                
                absolute_link = urljoin(BASE_URL, relative_link)
                job_id = relative_link.rstrip('/').split('/')[-1]

                # Les détails sont dans des divs avec des classes spécifiques
                title = card.select_one("div.position p").get_text(strip=True)
                location = card.select_one("div.city p").get_text(strip=True)
                contract_type = card.select_one("div.type p").get_text(strip=True)
                
                job = JobPosting(
                    id=f"{source_name}_{job_id}",
                    title=title,
                    link=absolute_link,
                    posted=datetime.now(timezone.utc), # Date non disponible
                    source=source_name,
                    company=source_name,
                    location=location,
                    contract_type=contract_type,
                )
                job_postings.append(job)

        except TimeoutError:
            print(f"[{source_name}] La page a mis trop de temps à charger (Timeout).")
        except Exception as e:
            print(f"[{source_name}] Une erreur est survenue: {e}")
        finally:
            browser.close()
    
    print(f"[{source_name}] Fetch terminé. {len(job_postings)} offres récupérées.")
    return job_postings[:limit]