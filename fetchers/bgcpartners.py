# Fichier: fetchers/bgcpartners.py (Version 2 - Corrigée sans 'await')

import re
from datetime import datetime, timezone

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError

from models import JobPosting

BASE_URL = "https://hdow.fa.us6.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1003/jobs?mode=location"


def fetch(limit: int, source_name: str, **kwargs) -> list[JobPosting]:
    """
    Récupère les offres d'emploi pour BGC Partners depuis leur portail Oracle Cloud.
    """
    job_postings: list[JobPosting] = []
    processed_ids = set()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print(f"[{source_name}] Navigation vers la page carrière...")
            page.goto(BASE_URL, wait_until="networkidle", timeout=60000)

            # 1. Gérer la bannière de cookies
            try:
                cookie_button = page.get_by_role('button', name='I Decline')
                if cookie_button.is_visible(timeout=5000):
                    print(f"[{source_name}] Refus des cookies...")
                    cookie_button.click()
            except (TimeoutError, Exception):
                print(f"[{source_name}] Pas de bannière de cookies trouvée.")
            
            # Attendre que les premières offres se chargent
            try:
                page.wait_for_selector("div.job-list-item", timeout=20000)
                print(f"[{source_name}] Offres initiales chargées.")
            except TimeoutError:
                print(f"[{source_name}] Aucune offre n'a pu être chargée initialement.")
                return []

            # 2. Cliquer sur "Show More Results" jusqu'à disparition
            while True:
                visible_cards_count = page.locator("div.job-list-item").count()
                if visible_cards_count >= limit:
                    print(f"[{source_name}] Limite de {limit} offres affichées. Arrêt du chargement.")
                    break
                try:
                    show_more_button = page.get_by_role('button', name='Show More Results')
                    if not show_more_button.is_visible():
                        print(f"[{source_name}] Bouton 'Show More' non visible. Fin.")
                        break
                    
                    print(f"[{source_name}] Clic sur 'Show More Results'...")
                    show_more_button.click()
                    page.wait_for_load_state('networkidle', timeout=10000)
                except TimeoutError:
                    print(f"[{source_name}] Timeout en attendant le chargement de plus d'offres.")
                    break
                except Exception:
                    print(f"[{source_name}] Le bouton 'Show More' n'est plus disponible.")
                    break

            # 3. Parser le HTML final
            print(f"[{source_name}] Analyse du HTML final...")
            html_content = page.content()
            soup = BeautifulSoup(html_content, "html.parser")

            job_cards = soup.select("div.job-list-item")
            print(f"[{source_name}] {len(job_cards)} cartes d'offres trouvées.")

            for card in job_cards:
                if len(job_postings) >= limit:
                    break

                link_tag = card.select_one("a.job-list-item__link")
                if not link_tag or not link_tag.get("href"):
                    continue

                link = link_tag["href"]
                job_id_match = re.search(r'/job/(\d+)/', link)
                if not job_id_match:
                    continue
                
                job_id = job_id_match.group(1)
                unique_id = f"{source_name}_{job_id}"
                
                if unique_id in processed_ids:
                    continue
                processed_ids.add(unique_id)

                title_tag = card.select_one("span.job-tile__title")
                location_tag = card.select_one("span[data-bind*='primaryLocation']")
                
                title = title_tag.get_text(strip=True) if title_tag else "N/A"
                location = location_tag.get_text(strip=True) if location_tag else "N/A"
                
                job = JobPosting(
                    id=unique_id,
                    title=title,
                    link=link,
                    posted=datetime.now(timezone.utc),
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