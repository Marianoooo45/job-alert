# Fichier: fetchers/lfde.py

from datetime import datetime, timezone
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError

from models import JobPosting

BASE_URL = "https://www.lfde.com"
JOBS_URL = "https://www.lfde.com/fr-fr/nous-connaitre/carrieres/"


def fetch(limit: int, source_name: str, **kwargs) -> list[JobPosting]:
    """
    Récupère les offres d'emploi pour LFDE.
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
                cookie_button = page.get_by_role('button', name='TOUT ACCEPTER')
                if cookie_button.is_visible(timeout=5000):
                    print(f"[{source_name}] Acceptation des cookies...")
                    cookie_button.click()
            except (TimeoutError, Exception):
                print(f"[{source_name}] Pas de bannière de cookies.")
            
            # 2. Parser les offres
            html_content = page.content()
            soup = BeautifulSoup(html_content, "html.parser")
            
            # Les offres sont des liens <a> dans une liste <ul>
            link_tags = soup.select("ul.links_title li a.link")
            print(f"[{source_name}] {len(link_tags)} offres trouvées.")

            for link_tag in link_tags:
                if len(job_postings) >= limit:
                    break

                relative_link = link_tag.get("href")
                if not relative_link:
                    continue
                
                absolute_link = urljoin(BASE_URL, relative_link)
                title = link_tag.get_text(strip=True)
                
                # L'ID est le dernier segment de l'URL
                job_id = relative_link.rstrip('/').split('/')[-1]

                job = JobPosting(
                    id=f"{source_name}_{job_id}",
                    title=title,
                    link=absolute_link,
                    posted=datetime.now(timezone.utc), # Date non disponible
                    source=source_name,
                    company=source_name,
                    location=None, # La localisation n'est pas sur la carte
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