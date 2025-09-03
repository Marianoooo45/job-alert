# Fichier: fetchers/sycomore.py

from datetime import datetime, timezone
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError

from models import JobPosting

BASE_URL = "https://careers.smartrecruiters.com"
JOBS_URL = "https://careers.smartrecruiters.com/SycomoreAssetManagement"


def fetch(limit: int, source_name: str, **kwargs) -> list[JobPosting]:
    """
    Récupère les offres d'emploi pour Sycomore (plateforme SmartRecruiters).
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
            
            # 2. Parser les offres
            html_content = page.content()
            soup = BeautifulSoup(html_content, "html.parser")
            
            job_cards = soup.select("li.opening-job")
            print(f"[{source_name}] {len(job_cards)} cartes d'offres trouvées.")

            for card in job_cards:
                if len(job_postings) >= limit:
                    break

                link_tag = card.find("a", class_="details")
                if not link_tag or not link_tag.get("href"):
                    continue

                absolute_link = link_tag["href"]
                
                # L'ID est dans le lien, ex: /SycomoreAssetManagement/744000076989475-...
                job_id = absolute_link.split('/')[-2]

                title = link_tag.select_one("h4.job-title").get_text(strip=True)
                
                # Les détails sont dans une liste <ul>
                details_list = card.select("ul.job-list li")
                location = details_list[0].get_text(strip=True) if len(details_list) > 0 else None
                contract_type = details_list[1].get_text(strip=True) if len(details_list) > 1 else None
                
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