# Fichier: fetchers/generali.py

from datetime import datetime, timezone
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError

from models import JobPosting

BASE_URL = "https://carrieres.generali.fr"
JOBS_URL = "https://carrieres.generali.fr/search/?createNewAlert=false&q=&locationsearch=&optionsFacetsDD_customfield1=&optionsFacetsDD_customfield2=&optionsFacetsDD_city=&optionsFacetsDD_customfield3="


def fetch(limit: int, source_name: str, **kwargs) -> list[JobPosting]:
    """
    Récupère les offres d'emploi pour Generali (plateforme SuccessFactors).
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
                cookie_button = page.get_by_role('button', name='Continuer sans accepter >')
                if cookie_button.is_visible(timeout=5000):
                    print(f"[{source_name}] Refus des cookies...")
                    cookie_button.click()
            except (TimeoutError, Exception):
                print(f"[{source_name}] Pas de bannière de cookies.")

            # 2. Boucle de pagination
            page_num = 1
            while len(job_postings) < limit:
                print(f"[{source_name}] Analyse de la page {page_num}...")
                
                try:
                    page.wait_for_selector("tr.data-row", timeout=15000)
                except TimeoutError:
                    print(f"[{source_name}] Aucune offre trouvée. Arrêt.")
                    break
                
                html_content = page.content()
                soup = BeautifulSoup(html_content, "html.parser")
                
                job_rows = soup.select("tr.data-row")
                if not job_rows:
                    break

                for row in job_rows:
                    if len(job_postings) >= limit:
                        break

                    link_tag = row.select_one("a.jobTitle-link")
                    location_tag = row.select_one("span.jobLocation")
                    
                    if not link_tag or not link_tag.get("href"):
                        continue

                    relative_link = link_tag["href"]
                    absolute_link = urljoin(BASE_URL, relative_link)
                    title = link_tag.get_text(strip=True)
                    location = location_tag.get_text(strip=True).strip() if location_tag else None
                    job_id = relative_link.split('/')[-2]

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

                if len(job_postings) >= limit:
                    break
                
                # --- Logique de pagination par numéro ---
                try:
                    next_page_num = page_num + 1
                    next_page_link = page.get_by_role('link', name=str(next_page_num), exact=True).first
                    
                    if not next_page_link.is_visible():
                        print(f"[{source_name}] Page {next_page_num} non trouvée. Fin.")
                        break

                    print(f"[{source_name}] Clic sur la page {next_page_num}...")
                    next_page_link.click()
                    page.wait_for_load_state("networkidle", timeout=20000)
                    page_num = next_page_num
                except Exception:
                    print(f"[{source_name}] Impossible de trouver la page suivante. Fin de la pagination.")
                    break

        except TimeoutError:
            print(f"[{source_name}] La page a mis trop de temps à charger (Timeout).")
        except Exception as e:
            print(f"[{source_name}] Une erreur est survenue: {e}")
        finally:
            browser.close()

    print(f"[{source_name}] Fetch terminé. {len(job_postings)} offres récupérées.")
    return job_postings[:limit]