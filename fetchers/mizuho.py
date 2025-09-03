# Fichier: fetchers/mizuho.py (Version 3 - Pagination par Titre)

import re
from datetime import datetime, timezone
from urllib.parse import urljoin
from locale import setlocale, LC_TIME

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError

from models import JobPosting

BASE_URL = "https://career2.successfactors.eu"
JOBS_URL = "https://career2.successfactors.eu/career?company=mizuhoba01&career%5fns=job%5flisting%5fsummary&navBarLevel=JOB%5fSEARCH"

try:
    setlocale(LC_TIME, 'fr_FR.UTF-8')
except:
    try:
        setlocale(LC_TIME, 'French_France.1252')
    except:
        print("[MIZUHO] WARN: Could not set locale to French for date parsing.")


def parse_mizuho_date(date_str: str) -> datetime:
    """Parse date strings like '29/08/2025'."""
    try:
        return datetime.strptime(date_str.strip(), '%d/%m/%Y').replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        return datetime.now(timezone.utc)


def fetch(limit: int, source_name: str, **kwargs) -> list[JobPosting]:
    """
    Récupère les offres d'emploi pour Mizuho (plateforme SuccessFactors).
    """
    job_postings: list[JobPosting] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()

        try:
            print(f"[{source_name}] Navigation vers la page carrière...")
            page.goto(JOBS_URL, wait_until="networkidle")

            page_num = 1
            while len(job_postings) < limit:
                print(f"[{source_name}] Analyse de la page {page_num}...")
                
                try:
                    page.wait_for_selector("tr.jobResultItem", timeout=15000)
                except TimeoutError:
                    print(f"[{source_name}] Aucune offre trouvée. Arrêt.")
                    break
                
                html_content = page.content()
                soup = BeautifulSoup(html_content, "html.parser")
                
                job_rows = soup.select("tr.jobResultItem")
                if not job_rows: break

                for row in job_rows:
                    if len(job_postings) >= limit: break

                    link_tag = row.select_one("a.jobTitle")
                    if not link_tag or not link_tag.get("href"): continue
                    
                    absolute_link = urljoin(BASE_URL, link_tag["href"])
                    title = link_tag.get_text(strip=True)
                    
                    note_section = row.select_one("div.noteSection")
                    if not note_section: continue
                    
                    job_id_match = re.search(r"Requisition ID:.*?(\d+)", note_section.get_text())
                    date_match = re.search(r"Posted on.*?(\d{2}/\d{2}/\d{4})", note_section.get_text())
                    
                    job_id = job_id_match.group(1) if job_id_match else None
                    date_str = date_match.group(1) if date_match else ""
                    if not job_id: continue

                    job = JobPosting(
                        id=f"{source_name}_{job_id}", title=title, link=absolute_link,
                        posted=parse_mizuho_date(date_str), source=source_name,
                        company=source_name, location=None
                    )
                    job_postings.append(job)

                if len(job_postings) >= limit: break
                
                # ==================== MODIFICATION CLÉ : Pagination par Titre ====================
                try:
                    # On cible le lien par son titre "Next Page", ce qui est plus stable que l'ID.
                    # On prend le premier trouvé (celui du haut).
                    next_button = page.get_by_role('link', name='Next Page').first
                    
                    # On vérifie si son parent <li> n'est pas désactivé.
                    parent_li_class = next_button.locator("xpath=./..").get_attribute("class")
                    if "disabled" in (parent_li_class or ""):
                        print(f"[{source_name}] Bouton 'Next' désactivé. Fin.")
                        break

                    print(f"[{source_name}] Clic sur la page suivante...")
                    next_button.click()
                    page.wait_for_load_state("networkidle", timeout=20000)
                    page_num += 1
                except (TimeoutError, Exception):
                    print(f"[{source_name}] Impossible de trouver la page suivante. Fin.")
                    break
                # ==============================================================================

        except Exception as e:
            print(f"[{source_name}] Une erreur est survenue: {e}")
        finally:
            browser.close()
    
    print(f"[{source_name}] Fetch terminé. {len(job_postings)} offres récupérées.")
    return job_postings[:limit]