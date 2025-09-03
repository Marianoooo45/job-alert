# Fichier: fetchers/smbc.py

from datetime import datetime, timezone
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError

from models import JobPosting

BASE_URL = "https://careers.smbcgroup.com"
JOBS_URL = "https://careers.smbcgroup.com/smbc/search/?createNewAlert=false&q=&locationsearch="


def fetch(limit: int, source_name: str, **kwargs) -> list[JobPosting]:
    """
    Récupère les offres d'emploi pour SMBC (plateforme SuccessFactors).
    """
    job_postings: list[JobPosting] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print(f"[{source_name}] Navigation vers la page carrière...")
            page.goto(JOBS_URL, wait_until="networkidle")

            try:
                cookie_button = page.get_by_role('button', name='Accept All Cookies')
                if cookie_button.is_visible(timeout=5000):
                    print(f"[{source_name}] Acceptation des cookies...")
                    cookie_button.click()
            except (TimeoutError, Exception):
                print(f"[{source_name}] Pas de bannière de cookies.")

            # Cliquer sur "More Search Results" jusqu'à disparition
            print(f"[{source_name}] Chargement de toutes les offres...")
            while True:
                try:
                    more_button = page.get_by_role('button', name='More Search Results')
                    if not more_button.is_visible():
                        print(f"[{source_name}] Bouton 'More' non visible. Fin.")
                        break
                    
                    more_button.click()
                    page.wait_for_load_state('networkidle', timeout=10000)
                except TimeoutError:
                    print(f"[{source_name}] Timeout en attendant le chargement.")
                    break
                except Exception:
                    print(f"[{source_name}] Bouton 'More' non disponible.")
                    break
            
            print(f"[{source_name}] Toutes les offres sont maintenant affichées.")
            
            # Parser le HTML final
            html_content = page.content()
            soup = BeautifulSoup(html_content, "html.parser")
            
            job_cards = soup.select("li.job-tile")
            print(f"[{source_name}] {len(job_cards)} cartes d'offres trouvées.")

            for card in job_cards:
                if len(job_postings) >= limit: break

                link_tag = card.select_one("a.jobTitle-link")
                if not link_tag or not link_tag.get("href"): continue
                
                relative_link = link_tag["href"]
                absolute_link = urljoin(BASE_URL, relative_link)
                job_id = relative_link.split('/')[-2]
                
                title = link_tag.get_text(strip=True)
                
                location_div = card.select_one("div[id*='desktop-section-location-value']")
                location = location_div.get_text(strip=True) if location_div else None

                job = JobPosting(
                    id=f"{source_name}_{job_id}",
                    title=title,
                    link=absolute_link,
                    posted=datetime.now(timezone.utc), # Date non disponible sur la carte
                    source=source_name,
                    company=source_name,
                    location=location,
                )
                job_postings.append(job)

        except Exception as e:
            print(f"[{source_name}] Une erreur est survenue: {e}")
        finally:
            browser.close()

    print(f"[{source_name}] Fetch terminé. {len(job_postings)} offres récupérées.")
    return job_postings[:limit]