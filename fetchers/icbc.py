# Fichier: fetchers/icbc.py (Version 2 - Anti-Détection Headless)

from datetime import datetime, timezone
from urllib.parse import urljoin
from locale import setlocale, LC_TIME

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError

from models import JobPosting

BASE_URL = "https://icbccareers.resourcesolutions.com"
JOBS_URL = "https://icbccareers.resourcesolutions.com/gold/iapply/index.cfm?event=jobs.search"

try:
    setlocale(LC_TIME, 'en_US.UTF-8')
except:
    try:
        setlocale(LC_TIME, 'English_United States.1252')
    except:
        print("[ICBC] WARN: Could not set locale to English for date parsing.")


def parse_icbc_date(date_str: str) -> datetime:
    try:
        return datetime.strptime(date_str.strip(), '%d-%b-%Y').replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        return datetime.now(timezone.utc)


def fetch(limit: int, source_name: str, **kwargs) -> list[JobPosting]:
    job_postings: list[JobPosting] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        
        # ==================== MODIFICATION CLÉ : SIMULATION D'UN NAVIGATEUR RÉEL ====================
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080}
        )
        page = context.new_page()
        # =========================================================================================

        try:
            print(f"[{source_name}] Navigation vers la page carrière...")
            page.goto(JOBS_URL, wait_until="domcontentloaded", timeout=60000)

            try:
                print(f"[{source_name}] Clic sur 'Recherche' pour afficher les offres...")
                search_button = page.get_by_role('button', name='Recherche')
                search_button.click()
                page.wait_for_load_state("networkidle", timeout=15000)
            except (TimeoutError, Exception) as e:
                print(f"[{source_name}] Impossible de cliquer sur Recherche ou timeout: {e}")
                return []

            html_content = page.content()
            soup = BeautifulSoup(html_content, "html.parser")
            
            job_rows = soup.select("table#jobSearchResult tbody tr")
            print(f"[{source_name}] {len(job_rows)} offres trouvées.")

            for row in job_rows:
                if len(job_postings) >= limit: break

                cells = row.find_all("td")
                if len(cells) < 6: continue

                link_tag = cells[0].find("a")
                if not link_tag or not link_tag.get("href"): continue
                
                job_id = link_tag.get_text(strip=True)
                absolute_link = urljoin(BASE_URL, link_tag["href"])
                
                title = cells[1].get_text(strip=True)
                contract_type = cells[3].get_text(strip=True)
                location = cells[4].get_text(strip=True)
                date_str = cells[5].get_text(strip=True)

                job = JobPosting(
                    id=f"{source_name}_{job_id}",
                    title=title,
                    link=absolute_link,
                    posted=parse_icbc_date(date_str),
                    source=source_name, company=source_name,
                    location=location,
                    contract_type=contract_type,
                )
                job_postings.append(job)

        except TimeoutError:
            print(f"[{source_name}] La page a mis trop de temps à charger (Timeout).")
        except Exception as e:
            print(f"[{source_name}] Une erreur est survenue: {e}")
        finally:
            page.close()
            context.close()
            browser.close()
    
    print(f"[{source_name}] Fetch terminé. {len(job_postings)} offres récupérées.")
    return job_postings[:limit]