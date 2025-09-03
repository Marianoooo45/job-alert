# Fichier: fetchers/vitol.py (Version 2 - ID Unique Corrigé)

from datetime import datetime, timezone
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError

from models import JobPosting

BASE_URL = "https://www.vitol.com"
JOBS_URL = "https://www.vitol.com/open-roles/"


def fetch(limit: int, source_name: str, **kwargs) -> list[JobPosting]:
    job_postings: list[JobPosting] = []
    processed_ids = set() # Pour gérer les doublons au sein d'une même session

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print(f"[{source_name}] Navigation vers la page carrière...")
            page.goto(JOBS_URL, wait_until="networkidle")

            try:
                cookie_button = page.get_by_role('button', name='Reject All')
                if cookie_button.is_visible(timeout=5000):
                    print(f"[{source_name}] Refus des cookies...")
                    cookie_button.click()
            except (TimeoutError, Exception):
                print(f"[{source_name}] Pas de bannière de cookies.")

            page_num = 1
            while len(job_postings) < limit:
                print(f"[{source_name}] Analyse de la page {page_num}...")
                
                try:
                    page.wait_for_selector("a.job-card", timeout=15000)
                except TimeoutError:
                    print(f"[{source_name}] Aucune offre trouvée. Arrêt.")
                    break
                
                html_content = page.content()
                soup = BeautifulSoup(html_content, "html.parser")
                
                job_cards = soup.select("a.job-card")
                if not job_cards: break

                for card in job_cards:
                    if len(job_postings) >= limit: break

                    absolute_link = card.get("href")
                    if not absolute_link: continue
                    
                    # ==================== MODIFICATION CLÉ : ID Robuste ====================
                    # On extrait le slug de l'URL, qui contient l'ID unique de SmartRecruiters
                    # Ex: /Vitol/744000079782454-python-data-engineer -> 744000079782454
                    try:
                        job_id_slug = absolute_link.split('/')[-1]
                        job_id = job_id_slug.split('-')[0]
                    except IndexError:
                        continue # Si l'URL est mal formée, on ignore
                    # =====================================================================
                    
                    # On vérifie si on a déjà traité cet ID dans cette session
                    if job_id in processed_ids: continue
                    processed_ids.add(job_id)

                    title = card.select_one("h3.job-board__title").get_text(strip=True)
                    location = card.select_one("div.job-board__info").get_text(strip=True)
                    
                    job = JobPosting(
                        id=f"{source_name}_{job_id}",
                        title=title, link=absolute_link, posted=datetime.now(timezone.utc),
                        source=source_name, company=source_name, location=location,
                    )
                    job_postings.append(job)

                if len(job_postings) >= limit: break
                
                try:
                    next_button = page.get_by_role('link', name='Next')
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