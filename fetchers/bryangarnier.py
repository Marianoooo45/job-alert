# Fichier: fetchers/bryangarnier.py

import re
from datetime import datetime, timezone
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError

from models import JobPosting

BASE_URL = "https://jobs.50skills.com"


def fetch(limit: int, source_name: str, **kwargs) -> list[JobPosting]:
    """
    Récupère les offres d'emploi pour Bryan Garnier depuis leur portail 50skills.
    """
    job_postings: list[JobPosting] = []
    page_url = f"{BASE_URL}/bryangarnier/en"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print(f"[{source_name}] Navigation vers la page carrière: {page_url}")
            page.goto(page_url, wait_until="networkidle", timeout=60000)

            # 1. Gérer la bannière de cookies/notifications
            try:
                dismiss_button = page.get_by_role('button', name='Dismiss')
                if dismiss_button.is_visible(timeout=5000):
                    print(f"[{source_name}] Fermeture de la notification...")
                    dismiss_button.click()
            except (TimeoutError, Exception):
                print(f"[{source_name}] Pas de notification à fermer.")
            
            # 2. Attendre que les offres soient chargées
            try:
                page.wait_for_selector("div.sc-bTTELM > a", timeout=15000)
                print(f"[{source_name}] Les offres sont chargées.")
            except TimeoutError:
                print(f"[{source_name}] Aucune offre n'a été trouvée sur la page.")
                return []

            html_content = page.content()
            soup = BeautifulSoup(html_content, "html.parser")
            
            # Chaque offre est un lien direct dans le conteneur principal
            job_cards = soup.select("div.sc-bTTELM > a")
            print(f"[{source_name}] {len(job_cards)} cartes d'offres trouvées.")

            for card in job_cards:
                if len(job_postings) >= limit:
                    break

                relative_link = card.get("href")
                if not relative_link:
                    continue

                title_tag = card.select_one("h2.sc-eeMvmM")
                location_tag = card.select_one("div.sc-cUEOzv")

                if not title_tag:
                    continue

                absolute_link = urljoin(BASE_URL, relative_link)
                title = title_tag.get_text(strip=True)
                location = location_tag.get_text(strip=True) if location_tag else None
                
                # L'ID est dans l'URL, c'est le plus fiable
                job_id_match = re.search(r'/(\d+)$', relative_link)
                job_id = job_id_match.group(1) if job_id_match else relative_link.split('/')[-1]

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