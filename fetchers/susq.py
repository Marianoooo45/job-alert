# Fichier: fetchers/susq.py

from datetime import datetime, timezone
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError

from models import JobPosting

BASE_URL = "https://careers.sig.com"
JOBS_URL = "https://careers.sig.com/search-results"


def fetch(limit: int, source_name: str, **kwargs) -> list[JobPosting]:
    """
    Récupère les offres d'emploi pour Susquehanna (SIG).
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
                # Le nom contient un caractère spécial, on utilise une expression régulière
                cookie_button = page.get_by_role('button', name=' Allow')
                if cookie_button.is_visible(timeout=5000):
                    print(f"[{source_name}] Acceptation des cookies...")
                    cookie_button.click()
            except (TimeoutError, Exception):
                print(f"[{source_name}] Pas de bannière de cookies.")

            # 2. Boucle de pagination
            page_num = 1
            while len(job_postings) < limit:
                print(f"[{source_name}] Analyse de la page {page_num}...")
                
                try:
                    page.wait_for_selector("li.jobs-list-item", timeout=15000)
                except TimeoutError:
                    print(f"[{source_name}] Aucune offre trouvée. Arrêt.")
                    break
                
                html_content = page.content()
                soup = BeautifulSoup(html_content, "html.parser")
                
                job_cards = soup.select("li.jobs-list-item")
                if not job_cards:
                    break

                for card in job_cards:
                    if len(job_postings) >= limit:
                        break

                    link_tag = card.select_one("a[data-ph-at-id='job-link']")
                    if not link_tag or not link_tag.get("href"):
                        continue
                    
                    job_id = link_tag.get("data-ph-at-job-id-text")
                    title = link_tag.get("data-ph-at-job-title-text")
                    location = link_tag.get("data-ph-at-job-location-text")
                    posted_str = link_tag.get("data-ph-at-job-post-date-text")
                    absolute_link = urljoin(BASE_URL, link_tag["href"])

                    try:
                        posted = datetime.fromisoformat(posted_str.replace("Z", "+00:00"))
                    except (ValueError, TypeError):
                        posted = datetime.now(timezone.utc)

                    job = JobPosting(
                        id=f"{source_name}_{job_id}",
                        title=title,
                        link=absolute_link,
                        posted=posted,
                        source=source_name,
                        company=source_name,
                        location=location,
                    )
                    job_postings.append(job)

                if len(job_postings) >= limit:
                    break
                
                try:
                    next_button = page.get_by_role('button', name='View next page')
                    if not next_button.is_visible() or next_button.is_disabled():
                        print(f"[{source_name}] Bouton 'Next' non visible ou désactivé. Fin.")
                        break

                    print(f"[{source_name}] Clic sur la page suivante...")
                    next_button.click()
                    page.wait_for_load_state("networkidle", timeout=20000)
                    page_num += 1
                except (TimeoutError, Exception):
                    print(f"[{source_name}] Impossible de trouver la page suivante. Fin.")
                    break

        except TimeoutError:
            print(f"[{source_name}] La page a mis trop de temps à charger.")
        except Exception as e:
            print(f"[{source_name}] Une erreur est survenue: {e}")
        finally:
            browser.close()
    
    print(f"[{source_name}] Fetch terminé. {len(job_postings)} offres récupérées.")
    return job_postings[:limit]