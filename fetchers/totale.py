# Fichier: fetchers/totale.py

from datetime import datetime, timezone
from urllib.parse import urljoin
from locale import setlocale, LC_TIME

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError

from models import JobPosting

BASE_URL = "https://jobs.totalenergies.com"
JOBS_URL = "https://jobs.totalenergies.com/fr_FR/careers/SearchJobs/?704=%5B39836%5D&704_format=1390&listFilterMode=1&jobRecordsPerPage=20&jobOffset=0"

# Pour parser les dates en français (ex: '02-09-2025')
try:
    setlocale(LC_TIME, 'fr_FR.UTF-8')
except:
    try:
        setlocale(LC_TIME, 'French_France.1252')
    except:
        print("[TOTALE] WARN: Could not set locale to French for date parsing.")


def parse_totale_date(date_str: str) -> datetime:
    """Parse date strings like '02-09-2025'."""
    try:
        return datetime.strptime(date_str.strip(), '%d-%m-%Y').replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        return datetime.now(timezone.utc)


def fetch(limit: int, source_name: str, **kwargs) -> list[JobPosting]:
    """
    Récupère les offres d'emploi pour TotalEnergies (plateforme Avature).
    """
    job_postings: list[JobPosting] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print(f"[{source_name}] Navigation vers la page carrière...")
            page.goto(JOBS_URL, wait_until="networkidle")

            try:
                cookie_button = page.get_by_role('button', name='Accepter tout')
                if cookie_button.is_visible(timeout=5000):
                    print(f"[{source_name}] Acceptation des cookies...")
                    cookie_button.click()
            except (TimeoutError, Exception):
                print(f"[{source_name}] Pas de bannière de cookies.")

            page_num = 1
            while len(job_postings) < limit:
                print(f"[{source_name}] Analyse de la page {page_num}...")
                
                try:
                    page.wait_for_selector("div.article--result", timeout=15000)
                except TimeoutError:
                    print(f"[{source_name}] Aucune offre trouvée. Arrêt.")
                    break
                
                html_content = page.content()
                soup = BeautifulSoup(html_content, "html.parser")
                
                job_cards = soup.select("div.article--result")
                if not job_cards: break

                for card in job_cards:
                    if len(job_postings) >= limit: break

                    link_tag = card.select_one("h3.article__header__text__title a.link")
                    if not link_tag or not link_tag.get("href"): continue
                    
                    absolute_link = urljoin(BASE_URL, link_tag["href"])
                    job_id = absolute_link.split('/')[-1]
                    title = link_tag.get_text(strip=True)
                    
                    details_list = card.select("ul.article__header__text__subtitle li")
                    date_str = details_list[0].get_text(strip=True) if len(details_list) > 0 else ""
                    location = details_list[1].get_text(strip=True) if len(details_list) > 1 else None
                    contract_type = details_list[2].get_text(strip=True) if len(details_list) > 2 else None

                    job = JobPosting(
                        id=f"{source_name}_{job_id}", title=title, link=absolute_link,
                        posted=parse_totale_date(date_str), source=source_name,
                        company=source_name, location=location, contract_type=contract_type
                    )
                    job_postings.append(job)

                if len(job_postings) >= limit: break
                
                try:
                    next_button = page.get_by_role('link', name='Aller à la page numéro Suiv >>')
                    if not next_button.is_visible():
                        print(f"[{source_name}] Bouton 'Suivant' non visible. Fin.")
                        break

                    print(f"[{source_name}] Clic sur la page suivante...")
                    next_button.click()
                    page.wait_for_load_state("networkidle", timeout=20000)
                    page_num += 1
                except (TimeoutError, Exception):
                    print(f"[{source_name}] Impossible de trouver la page suivante. Fin.")
                    break

        except Exception as e:
            print(f"[{source_name}] Une erreur est survenue: {e}")
        finally:
            browser.close()

    print(f"[{source_name}] Fetch terminé. {len(job_postings)} offres récupérées.")
    return job_postings[:limit]