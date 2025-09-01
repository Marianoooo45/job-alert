# Fichier: fetchers/dnca.py

from datetime import datetime, timezone
from urllib.parse import urljoin
from locale import setlocale, LC_TIME

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError

from models import JobPosting

BASE_URL = "https://www.dnca-investments.com"
JOBS_URL = "https://www.dnca-investments.com/carrieres"

# Pour parser les dates en français (ex: '11/08/2025')
try:
    setlocale(LC_TIME, 'fr_FR.UTF-8')
except:
    try:
        setlocale(LC_TIME, 'French_France.1252')
    except:
        print("[DNCA] WARN: Could not set locale to French for date parsing.")


def parse_dnca_date(date_str: str) -> datetime:
    """Parse date strings like '11/08/2025'."""
    try:
        return datetime.strptime(date_str.strip(), '%d/%m/%Y').replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        return datetime.now(timezone.utc)


def fetch(limit: int, source_name: str, **kwargs) -> list[JobPosting]:
    """
    Récupère les offres d'emploi pour DNCA.
    """
    job_postings: list[JobPosting] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print(f"[{source_name}] Navigation vers la page carrière: {JOBS_URL}")
            page.goto(JOBS_URL, wait_until="domcontentloaded", timeout=60000)

            # 1. Gérer la bannière de cookies
            try:
                cookie_button = page.get_by_role('button', name='Tout refuser')
                if cookie_button.is_visible(timeout=5000):
                    print(f"[{source_name}] Refus des cookies...")
                    cookie_button.click()
            except (TimeoutError, Exception):
                print(f"[{source_name}] Pas de bannière de cookies trouvée.")
            
            # 2. Parser les offres
            html_content = page.content()
            soup = BeautifulSoup(html_content, "html.parser")
            
            job_cards = soup.select("div.offre-emploi")
            print(f"[{source_name}] {len(job_cards)} cartes d'offres trouvées.")

            for card in job_cards:
                if len(job_postings) >= limit:
                    break

                link_tag = card.select_one("a[href*='/carrieres/']")
                if not link_tag:
                    continue

                relative_link = link_tag["href"]
                absolute_link = urljoin(BASE_URL, relative_link)
                
                title = link_tag.get_text(strip=True)
                job_id = relative_link.split('/')[-1]

                # Les détails sont dans une balise <p> avec des <span>
                details_p = card.select_one("p.subtitles-content-article.offer")
                if not details_p:
                    continue
                
                details_spans = details_p.find_all("span")
                details = [span.get_text(strip=True) for span in details_spans]
                
                posted_str = details[0] if len(details) > 0 else ""
                contract_type = details[2] if len(details) > 2 else None
                location = details[4] if len(details) > 4 else None

                job = JobPosting(
                    id=f"{source_name}_{job_id}",
                    title=title,
                    link=absolute_link,
                    posted=parse_dnca_date(posted_str),
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