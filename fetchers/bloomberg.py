# Fichier: fetchers/bloomberg.py

import re
from datetime import datetime, timezone
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError

from models import JobPosting

BASE_URL = "https://bloomberg.avature.net/careers/SearchJobs/"


def fetch(limit: int, source_name: str, **kwargs) -> list[JobPosting]:
    """
    Récupère les offres d'emploi pour Bloomberg depuis leur portail Avature.
    """
    job_postings: list[JobPosting] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print(f"[{source_name}] Navigation vers la page carrière...")
            page.goto(BASE_URL, wait_until="networkidle", timeout=60000)

            # 1. Gérer la bannière de cookies
            try:
                cookie_button = page.get_by_role('button', name='Reject All')
                if cookie_button.is_visible(timeout=5000):
                    print(f"[{source_name}] Refus des cookies...")
                    cookie_button.click()
            except (TimeoutError, Exception):
                print(f"[{source_name}] Pas de bannière de cookies trouvée.")

            # 2. Boucle de pagination
            page_num = 1
            while len(job_postings) < limit:
                print(f"[{source_name}] Analyse de la page {page_num}...")

                try:
                    page.wait_for_selector("article.article--result", timeout=15000)
                except TimeoutError:
                    print(f"[{source_name}] Aucune offre trouvée sur la page. Arrêt.")
                    break
                
                html_content = page.content()
                soup = BeautifulSoup(html_content, "html.parser")
                
                job_cards = soup.select("article.article--result")
                if not job_cards:
                    break

                for card in job_cards:
                    if len(job_postings) >= limit:
                        break

                    title_link = card.select_one("h3.article__header__text__title a.link")
                    location_tag = card.select_one("span.list-item-location")

                    if not title_link or not title_link.get("href"):
                        continue
                    
                    link = urljoin(BASE_URL, title_link["href"])
                    title = title_link.get_text(strip=True)
                    location = location_tag.get_text(strip=True) if location_tag else None
                    
                    job_id_match = re.search(r'/(\d+)$', link)
                    job_id = job_id_match.group(1) if job_id_match else link.split('/')[-1]

                    job = JobPosting(
                        id=f"{source_name}_{job_id}",
                        title=title,
                        link=link,
                        posted=datetime.now(timezone.utc), # Date non disponible
                        source=source_name,
                        company=source_name,
                        location=location,
                    )
                    job_postings.append(job)

                if len(job_postings) >= limit:
                    print(f"[{source_name}] Limite de {limit} offres atteinte.")
                    break
                
                # --- Logique de pagination ---
                try:
                    # Le sélecteur cible le lien "Next" de manière fiable
                    next_button = page.get_by_role('link', name='Go to Next Page, Number').first
                    if not next_button.is_visible():
                        print(f"[{source_name}] Bouton 'Next' non visible. Fin.")
                        break

                    print(f"[{source_name}] Clic sur la page suivante...")
                    next_button.click()
                    page.wait_for_load_state("networkidle", timeout=20000)
                    page_num += 1
                except (TimeoutError, Exception):
                    print(f"[{source_name}] Bouton 'Next' non trouvé ou timeout. Fin.")
                    break

        except TimeoutError:
            print(f"[{source_name}] La page a mis trop de temps à charger (Timeout).")
        except Exception as e:
            print(f"[{source_name}] Une erreur est survenue: {e}")
        finally:
            browser.close()

    print(f"[{source_name}] Fetch terminé. {len(job_postings)} offres récupérées.")
    return job_postings[:limit]