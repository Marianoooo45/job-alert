# Fichier: fetchers/marex.py

import re
from datetime import datetime, timezone
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError

from models import JobPosting

BASE_URL = "https://www.marex.com"
JOBS_URL = "https://www.marex.com/careers/career-opportunities/"


def fetch(limit: int, source_name: str, **kwargs) -> list[JobPosting]:
    """
    Récupère les offres d'emploi pour Marex.
    """
    job_postings: list[JobPosting] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print(f"[{source_name}] Navigation vers la page carrière...")
            page.goto(JOBS_URL, wait_until="networkidle")

            # Pas de bannière de cookies bloquante observée

            # Attendre que les cartes d'offres soient chargées
            try:
                page.wait_for_selector("div.card.item-london-gb", timeout=15000) # Attendre un item spécifique pour être sûr
                print(f"[{source_name}] Offres chargées.")
            except TimeoutError:
                print(f"[{source_name}] Aucune offre trouvée sur la page. Arrêt.")
                return []

            html_content = page.content()
            soup = BeautifulSoup(html_content, "html.parser")
            
            job_cards = soup.select("div.card")
            print(f"[{source_name}] {len(job_cards)} cartes d'offres trouvées.")

            for card in job_cards:
                if len(job_postings) >= limit:
                    break

                link_tag = card.find("a")
                if not link_tag or not link_tag.get("href"):
                    continue

                relative_link = link_tag["href"]
                absolute_link = urljoin(BASE_URL, relative_link)
                
                # L'ID est dans le lien, ex: /c08f1b0dd51501-application-support-analyst/
                job_id = relative_link.rstrip('/').split('/')[-1].split('-')[0]
                if not job_id:
                    continue

                title = card.select_one("h3").get_text(strip=True)
                
                # Les détails sont dans une balise <p> séparés par <br>
                p_tag = card.select_one("p")
                if p_tag:
                    details = [line.strip() for line in p_tag.get_text(separator='\n').split('\n') if line.strip()]
                    location = details[0] if len(details) > 0 else None
                    contract_type = details[1] if len(details) > 1 else None
                else:
                    location, contract_type = None, None

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