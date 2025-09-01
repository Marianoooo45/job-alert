# Fichier: fetchers/bptrading.py

import re
from datetime import datetime, timezone, timedelta
from urllib.parse import urljoin, parse_qs, urlparse

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError

from models import JobPosting

BASE_URL = "https://www.bp.com/en/global/corporate/careers/search-and-apply.html"


def parse_posted_date(date_str: str) -> datetime:
    """
    Convertit une chaîne de date relative (ex: "Posted 4 days ago") en objet datetime.
    """
    now = datetime.now(timezone.utc)
    date_str = date_str.lower()

    if "today" in date_str:
        return now
    
    match = re.search(r'(\d+)\s+days?\s+ago', date_str)
    if match:
        days_ago = int(match.group(1))
        return now - timedelta(days=days_ago)

    # Fallback si le format est inconnu
    return now


def fetch(limit: int, source_name: str, **kwargs) -> list[JobPosting]:
    """
    Récupère les offres d'emploi pour BP depuis leur portail carrière.
    """
    job_postings: list[JobPosting] = []
    # L'URL fournie contient déjà les bons filtres pour Finance et Trading
    start_url = "https://www.bp.com/en/global/corporate/careers/search-and-apply.html?group%5B0%5D=Finance%20Group&group%5B1%5D=Supply%20%26%20Trading%20Group"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print(f"[{source_name}] Navigation vers la page carrière filtrée...")
            page.goto(start_url, wait_until="networkidle", timeout=60000)

            # 1. Gérer la bannière de cookies
            try:
                cookie_button = page.get_by_role('button', name='Reject all')
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
                    page.wait_for_selector("li.ais-Hits-item", timeout=15000)
                except TimeoutError:
                    print(f"[{source_name}] Aucune offre trouvée sur la page. Arrêt.")
                    break
                
                html_content = page.content()
                soup = BeautifulSoup(html_content, "html.parser")
                
                job_cards = soup.select("li.ais-Hits-item")
                if not job_cards:
                    break

                for card in job_cards:
                    if len(job_postings) >= limit:
                        break

                    link_tag = card.select_one("a.Hit_hit__lKdvb")
                    if not link_tag or not link_tag.get("href"):
                        continue

                    relative_link = link_tag["href"]
                    absolute_link = urljoin(BASE_URL, relative_link)
                    
                    # Extraire le jobId de l'URL
                    parsed_url = urlparse(absolute_link)
                    job_id = parse_qs(parsed_url.query).get('jobId', [None])[0]
                    if not job_id:
                        continue
                    
                    title = link_tag.select_one("h3.Hit_hitTitle__zzFsg").get_text(strip=True)
                    location = link_tag.select_one("div.Hit_hitRegionBox__A0iFv").get_text(strip=True)
                    posted_str = link_tag.select_one("div.Hit_hitLastUpdated__Flh0y").get_text(strip=True)
                    
                    job = JobPosting(
                        id=f"{source_name}_{job_id}",
                        title=title,
                        link=absolute_link,
                        posted=parse_posted_date(posted_str),
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
                    next_button = page.get_by_role('link', name='Next page')
                    if not next_button.is_visible():
                        print(f"[{source_name}] Bouton 'Next page' non visible. Fin.")
                        break

                    print(f"[{source_name}] Clic sur la page suivante...")
                    next_button.click()
                    page.wait_for_load_state("networkidle", timeout=20000)
                    page_num += 1
                except (TimeoutError, Exception):
                    print(f"[{source_name}] Bouton 'Next page' non trouvé ou timeout. Fin.")
                    break

        except TimeoutError:
            print(f"[{source_name}] La page a mis trop de temps à charger (Timeout).")
        except Exception as e:
            print(f"[{source_name}] Une erreur est survenue: {e}")
        finally:
            browser.close()

    print(f"[{source_name}] Fetch terminé. {len(job_postings)} offres récupérées.")
    return job_postings[:limit]