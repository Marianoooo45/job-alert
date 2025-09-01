# Fichier: fetchers/bunge.py (Version 2 - Correction de Syntaxe)

import re
from datetime import datetime, timezone
from urllib.parse import urljoin
from locale import setlocale, LC_TIME

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError

from models import JobPosting

BASE_URL = "https://jobs.bunge.com"
JOBS_URL = "https://jobs.bunge.com/search/?createNewAlert=false&q=&optionsFacetsDD_country="

# Pour parser les dates en anglais (ex: 'Aug 4, 2025')
try:
    setlocale(LC_TIME, 'en_US.UTF-8')
except:
    try:
        setlocale(LC_TIME, 'English_United States.1252')
    except:
        print("[BUNGE] WARN: Could not set locale to English for date parsing.")


def parse_bunge_date(date_str: str) -> datetime:
    """Parse date strings like 'Aug 4, 2025'."""
    try:
        return datetime.strptime(date_str.strip(), '%b %d, %Y').replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        return datetime.now(timezone.utc)


def fetch(limit: int, source_name: str, **kwargs) -> list[JobPosting]:
    """
    Récupère les offres d'emploi pour Bunge depuis leur portail SuccessFactors.
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
                cookie_button = page.get_by_role('button', name='Tout refuser')
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
                    date_tag = row.select_one("span.jobDate")
                    
                    if not link_tag or not link_tag.get("href"):
                        continue

                    relative_link = link_tag["href"]
                    absolute_link = urljoin(BASE_URL, relative_link)
                    title = link_tag.get_text(strip=True)
                    location = location_tag.get_text(strip=True) if location_tag else None
                    date_str = date_tag.get_text(strip=True) if date_tag else ""

                    job_id = relative_link.split('/')[-2]

                    job = JobPosting(
                        id=f"{source_name}_{job_id}",
                        title=title,
                        link=absolute_link,
                        posted=parse_bunge_date(date_str),
                        source=source_name,
                        company=source_name,
                        location=location.strip() if location else None,
                    )
                    job_postings.append(job)

                if len(job_postings) >= limit:
                    print(f"[{source_name}] Limite de {limit} offres atteinte.")
                    break
                
                # --- Logique de pagination ---
                try:
                    current_page_span = page.locator("span.currentPage").first
                    next_page_link = current_page_span.locator("xpath=./following-sibling::a[1]")
                    
                    if not next_page_link.is_visible():
                        print(f"[{source_name}] Plus de page suivante. Fin.")
                        break

                    next_page_num = next_page_link.inner_text()
                    print(f"[{source_name}] Clic sur la page {next_page_num}...")
                    next_page_link.click()
                    page.wait_for_load_state("networkidle", timeout=20000)
                    page_num = int(next_page_num)
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