# Fichier: fetchers/euronext.py

import re
from datetime import datetime, timezone
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError

from models import JobPosting

BASE_URL = "https://www.euronext.com"
JOBS_URL = "https://www.euronext.com/en/about/careers/open-positions"


def fetch(limit: int, source_name: str, **kwargs) -> list[JobPosting]:
    """
    Récupère les offres d'emploi pour Euronext.
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
                cookie_button = page.get_by_role('button', name='Reject All')
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
                    page.wait_for_selector("table.views-table tbody tr", timeout=15000)
                except TimeoutError:
                    print(f"[{source_name}] Aucune offre trouvée. Arrêt.")
                    break
                
                html_content = page.content()
                soup = BeautifulSoup(html_content, "html.parser")
                
                job_rows = soup.select("table.views-table tbody tr")
                if not job_rows:
                    break

                for row in job_rows:
                    if len(job_postings) >= limit:
                        break

                    cells = row.find_all("td")
                    if len(cells) < 5:
                        continue

                    link_tag = cells[1].find("a")
                    if not link_tag or not link_tag.get("href"):
                        continue
                    
                    relative_link = link_tag["href"]
                    absolute_link = urljoin(BASE_URL, relative_link)
                    
                    # L'ID est dans l'URL, ex: /r23089-italy...
                    job_id_match = re.search(r'/(r\d+)-', relative_link)
                    job_id = job_id_match.group(1) if job_id_match else relative_link.split('/')[-1]

                    title = link_tag.get_text(strip=True)
                    country = cells[0].get_text(strip=True)
                    contract_type = cells[2].get_text(strip=True)
                    city = cells[3].get_text(strip=True)
                    location = f"{city}, {country}"

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

                if len(job_postings) >= limit:
                    print(f"[{source_name}] Limite de {limit} offres atteinte.")
                    break
                
                # --- Logique de pagination ---
                try:
                    next_button = page.get_by_role('link', name='Next', exact=True)
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

        except TimeoutError:
            print(f"[{source_name}] La page a mis trop de temps à charger (Timeout).")
        except Exception as e:
            print(f"[{source_name}] Une erreur est survenue: {e}")
        finally:
            browser.close()

    print(f"[{source_name}] Fetch terminé. {len(job_postings)} offres récupérées.")
    return job_postings[:limit]