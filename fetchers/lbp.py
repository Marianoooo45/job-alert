# Fichier: fetchers/lbp.py (Version 3 - Lien Direct et ID Stable)

from datetime import datetime, timezone
from urllib.parse import urljoin

import re

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError

from models import JobPosting

BASE_URL = "https://www.labanquepostale.com"
JOBS_URL = "https://www.labanquepostale.com/candidats/offres-d-emploi/nos-offres-d-emploi.html"


def fetch(limit: int, source_name: str, **kwargs) -> list[JobPosting]:
    """
    Récupère les offres d'emploi pour La Banque Postale en utilisant le lien direct.
    """
    job_postings: list[JobPosting] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print(f"[{source_name}] Navigation vers la page carrière...")
            page.goto(JOBS_URL, wait_until="networkidle")

            page_num = 1
            while len(job_postings) < limit:
                print(f"[{source_name}] Analyse de la page {page_num}...")
                
                try:
                    page.wait_for_selector("article.o-jobOffer__push", timeout=15000)
                except TimeoutError:
                    print(f"[{source_name}] Aucune offre trouvée. Arrêt.")
                    break
                
                html_content = page.content()
                soup = BeautifulSoup(html_content, "html.parser")

                job_cards = soup.select("article.o-jobOffer__push")
                if not job_cards: break

                for card in job_cards:
                    if len(job_postings) >= limit: break
                    
                    # ==================== MODIFICATION CLÉ : Utiliser le vrai lien ====================
                    link_tag = card.select_one("a.m-cta")
                    title_tag = card.select_one("h3.a-body--large-bold")
                    
                    if not link_tag or not title_tag or not link_tag.get("href"):
                        print(f"[{source_name}] WARN: Carte d'offre sans lien ou titre, ignorée.")
                        continue
                    
                    relative_link = link_tag["href"]
                    absolute_link = urljoin(BASE_URL, relative_link)
                    
                    # L'ID est dans l'URL, ex: .job-16286.html
                    job_id_match = re.search(r'\.job-(\d+)\.html', relative_link)
                    job_id = job_id_match.group(1) if job_id_match else relative_link

                    title = title_tag.get_text(strip=True)
                    tags = card.select("p.o-jobOffer__push__tags span.a-cat-tag span")
                    infos = card.select("p.o-jobOffer__push__infos span")

                    contract_type = tags[1].get_text(strip=True) if len(tags) > 1 else None
                    location = infos[0].get_text(strip=True) if len(infos) > 0 else None
                    
                    job = JobPosting(
                        id=f"{source_name}_{job_id}",
                        title=title, link=absolute_link, posted=datetime.now(timezone.utc),
                        source=source_name, company=source_name,
                        location=location, contract_type=contract_type,
                    )
                    job_postings.append(job)
                
                if len(job_postings) >= limit: break
                
                try:
                    next_button = page.get_by_role('link', name='Page suivante')
                    if not next_button.is_visible():
                        print(f"[{source_name}] Bouton 'Page suivante' non visible. Fin.")
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