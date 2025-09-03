# Fichier: fetchers/scor.py (Version 3 - Sélecteur de Bouton Corrigé)

import re
from datetime import datetime, timezone
from urllib.parse import urljoin
from locale import setlocale, LC_TIME

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError

from models import JobPosting

JOBS_URL = "https://fa-errt-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_2001/jobs?mode=location"

try:
    setlocale(LC_TIME, 'en_US.UTF-8')
except:
    try:
        setlocale(LC_TIME, 'English_United States.1252')
    except:
        print("[SCOR] WARN: Could not set locale to English for date parsing.")


def parse_scor_date(date_str: str) -> datetime:
    """Parse date strings like '09/02/2025'."""
    try:
        return datetime.strptime(date_str.strip(), '%m/%d/%Y').replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        return datetime.now(timezone.utc)


def fetch(limit: int, source_name: str, **kwargs) -> list[JobPosting]:
    job_postings: list[JobPosting] = []
    processed_ids = set()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print(f"[{source_name}] Navigation vers la page carrière...")
            page.goto(JOBS_URL, wait_until="networkidle")

            try:
                cookie_button = page.get_by_role('button', name='Decline')
                if cookie_button.is_visible(timeout=5000):
                    print(f"[{source_name}] Refus des cookies...")
                    cookie_button.click()
            except (TimeoutError, Exception):
                print(f"[{source_name}] Pas de bannière de cookies.")
            
            try:
                page.wait_for_selector("div.job-grid-item", timeout=20000)
                print(f"[{source_name}] Offres initiales chargées.")
            except TimeoutError:
                print(f"[{source_name}] Aucune offre n'a pu être chargée initialement.")
                return []

            while page.locator("li[data-qa='searchResultItem']").count() < limit:
                try:
                    # ==================== MODIFICATION CLÉ : Sélecteur Corrigé ====================
                    show_more_button = page.locator("button:has-text('Show More Results')")
                    # ==============================================================================
                    
                    if not show_more_button.is_visible():
                        print(f"[{source_name}] Bouton 'Show More' non visible. Fin.")
                        break
                    
                    print(f"[{source_name}] Clic sur 'Show More Results'...")
                    with page.expect_response("**/resources/latest/jobs**", timeout=15000) as response_info:
                        show_more_button.click()
                    
                    response = response_info.value
                    print(f"[{source_name}] Nouvelles offres reçues (Status: {response.status}).")

                except TimeoutError:
                    print(f"[{source_name}] Timeout en attendant plus d'offres. Fin.")
                    break
                except Exception as e:
                    print(f"[{source_name}] Le bouton 'Show More' n'est plus disponible: {e}")
                    break

            html_content = page.content()
            soup = BeautifulSoup(html_content, "html.parser")
            job_cards = soup.select("div.job-grid-item")
            print(f"[{source_name}] {len(job_cards)} cartes d'offres trouvées.")

            for card in job_cards:
                if len(job_postings) >= limit: break

                link_tag = card.select_one("a.job-grid-item__link")
                if not link_tag or not link_tag.get("href"): continue

                link = link_tag["href"]
                job_id_match = re.search(r'/job/(\d+)/', link)
                if not job_id_match: continue
                
                job_id = job_id_match.group(1)
                if job_id in processed_ids: continue
                processed_ids.add(job_id)

                title = card.select_one("span.job-tile__title").get_text(strip=True)
                
                details_list = card.select("li.job-list-item__job-info-item")
                location, date_str = None, ""
                for item in details_list:
                    label = item.select_one("div.job-list-item__job-info-label")
                    if label and "Locations" in label.get_text():
                        location = item.select_one("div.job-list-item__job-info-value").get_text(strip=True)
                    if label and "Posting Dates" in label.get_text():
                        date_str = item.select_one("div.job-list-item__job-info-value").get_text(strip=True)

                job = JobPosting(
                    id=f"{source_name}_{job_id}", title=title, link=link,
                    posted=parse_scor_date(date_str), source=source_name,
                    company=source_name, location=location
                )
                job_postings.append(job)

        except Exception as e:
            print(f"[{source_name}] Une erreur est survenue: {e}")
        finally:
            browser.close()

    print(f"[{source_name}] Fetch terminé. {len(job_postings)} offres récupérées.")
    return job_postings[:limit]