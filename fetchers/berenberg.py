# Fichier: fetchers/berenberg.py

import re
from datetime import datetime, timezone
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError

from models import JobPosting

BASE_URL = "https://careers.berenberg.com"
JOBS_PAGE_URL = "https://careers.berenberg.com/search-our-jobs?location="


def fetch(limit: int, source_name: str, **kwargs) -> list[JobPosting]:
    """
    Récupère les offres d'emploi pour Berenberg.
    Toutes les offres sont sur une seule page, sans pagination.
    """
    job_postings: list[JobPosting] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print(f"[{source_name}] Navigation vers la page carrière: {JOBS_PAGE_URL}")
            page.goto(JOBS_PAGE_URL, wait_until="domcontentloaded", timeout=60000)
            
            # Attendre que le conteneur des offres soit visible
            try:
                page.wait_for_selector("div.jobs_grid-item", timeout=15000)
                print(f"[{source_name}] Grille des offres chargée.")
            except TimeoutError:
                print(f"[{source_name}] Aucune offre trouvée sur la page. Arrêt.")
                return []

            html_content = page.content()
            soup = BeautifulSoup(html_content, "html.parser")
            
            job_cards = soup.select("div.jobs_grid-item")
            print(f"[{source_name}] {len(job_cards)} cartes d'offres trouvées.")

            for card in job_cards:
                if len(job_postings) >= limit:
                    break

                link_tag = card.select_one("a[href*='/search-our-jobs/']")
                title_tag = card.select_one("h2")
                location_tag = card.select_one("p")

                if not all([link_tag, title_tag, location_tag]):
                    continue
                
                relative_link = link_tag.get("href")
                if not relative_link:
                    continue
                
                absolute_link = urljoin(BASE_URL, relative_link)
                title = title_tag.get_text(strip=True)
                location = location_tag.get_text(strip=True)
                
                # Extraire l'ID unique de l'URL (ex: ...-Advisory-2233-München -> 2233)
                job_id_match = re.search(r'-(\d+)-', relative_link)
                if not job_id_match:
                    # Si aucun ID n'est trouvé, on se rabat sur une partie de l'URL pour l'unicité
                    job_id = relative_link.split('/')[-1]
                else:
                    job_id = job_id_match.group(1)

                job = JobPosting(
                    id=f"{source_name}_{job_id}",
                    title=title,
                    link=absolute_link,
                    posted=datetime.now(timezone.utc), # Date non disponible
                    source=source_name,
                    company=source_name,
                    location=location,
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