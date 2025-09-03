# Fichier: fetchers/nomura.py

from datetime import datetime, timezone
from urllib.parse import urljoin
from locale import setlocale, LC_TIME

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError

from models import JobPosting

BASE_URL = "https://nomuracampus.tal.net"
JOBS_URL = "https://nomuracampus.tal.net/vx/lang-en-GB/mobile-0/appcentre-ext/brand-4/xf-3348347fc789/candidate/jobboard/vacancy/1/adv/"

# Pour parser les dates en anglais (ex: '30 Sept 2025')
try:
    setlocale(LC_TIME, 'en_US.UTF-8')
except:
    try:
        setlocale(LC_TIME, 'English_United States.1252')
    except:
        print("[NOMURA] WARN: Could not set locale to English for date parsing.")


def parse_nomura_date(date_str: str) -> datetime:
    """Parse date strings like '30 Sept 2025'."""
    try:
        return datetime.strptime(date_str.strip(), '%d %b %Y').replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        return datetime.now(timezone.utc)


def fetch(limit: int, source_name: str, **kwargs) -> list[JobPosting]:
    """
    Récupère les offres d'emploi pour Nomura (plateforme Lumesse TalentLink).
    """
    job_postings: list[JobPosting] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print(f"[{source_name}] Navigation vers la page carrière...")
            page.goto(JOBS_URL, wait_until="networkidle")

            # Pas de bannière de cookies bloquante observée

            # Attendre que le tableau des offres soit chargé
            try:
                page.wait_for_selector("table.solr_search_list tbody tr", timeout=15000)
                print(f"[{source_name}] Offres chargées.")
            except TimeoutError:
                print(f"[{source_name}] Aucune offre trouvée sur la page. Arrêt.")
                return []

            html_content = page.content()
            soup = BeautifulSoup(html_content, "html.parser")
            
            job_rows = soup.select("table.solr_search_list tbody tr.search_res")
            print(f"[{source_name}] {len(job_rows)} offres trouvées.")

            for row in job_rows:
                if len(job_postings) >= limit:
                    break

                job_id = row.get("data-oppid")
                link_tag = row.select_one("a.subject")
                
                if not job_id or not link_tag or not link_tag.get("href"):
                    continue

                absolute_link = link_tag["href"]
                title = link_tag.get_text(strip=True)
                
                cells = row.find_all("td")
                if len(cells) < 3:
                    continue
                
                location = cells[1].get_text(strip=True)
                date_str = cells[2].get_text(strip=True)
                
                job = JobPosting(
                    id=f"{source_name}_{job_id}",
                    title=title,
                    link=absolute_link,
                    posted=parse_nomura_date(date_str),
                    source=source_name,
                    company=source_name,
                    location=location,
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