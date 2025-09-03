# Fichier: fetchers/fidelity.py (Version 2 - Anti-Détection Headless)

from datetime import datetime, timezone
from urllib.parse import urljoin
from locale import setlocale, LC_TIME

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError

from models import JobPosting

BASE_URL = "https://jobs.fidelity.com"
JOBS_URL = "https://jobs.fidelity.com/en/jobs/?search=&origin=global&lat=&lng="

try:
    setlocale(LC_TIME, 'en_US.UTF-8')
except:
    try:
        setlocale(LC_TIME, 'English_United States.1252')
    except:
        print("[FIDELITY] WARN: Could not set locale to English for date parsing.")

def parse_fidelity_date(date_str: str) -> datetime:
    try:
        clean_date_str = date_str.replace("Posted", "").strip()
        full_date_str = f"{clean_date_str} {datetime.now().year}"
        return datetime.strptime(full_date_str, '%b %d %Y').replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        return datetime.now(timezone.utc)

def fetch(limit: int, source_name: str, **kwargs) -> list[JobPosting]:
    job_postings: list[JobPosting] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # ==================== MODIFICATION CLÉ : SIMULATION D'UN NAVIGATEUR RÉEL ====================
        # On définit un User-Agent et une taille de fenêtre pour ne pas être détecté comme un robot.
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080}
        )
        page = context.new_page()
        # =========================================================================================

        try:
            print(f"[{source_name}] Navigation vers la page carrière...")
            page.goto(JOBS_URL, wait_until="networkidle")

            try:
                cookie_button = page.get_by_role('button', name='Reject All')
                if cookie_button.is_visible(timeout=5000):
                    print(f"[{source_name}] Refus des cookies...")
                    cookie_button.click()
            except (TimeoutError, Exception):
                print(f"[{source_name}] Pas de bannière de cookies.")

            page_num = 1
            while len(job_postings) < limit:
                print(f"[{source_name}] Analyse de la page {page_num}...")
                
                try:
                    page.wait_for_selector("div.card-job", timeout=15000)
                except TimeoutError:
                    print(f"[{source_name}] Aucune offre trouvée sur la page. Fin.")
                    break
                
                html_content = page.content()
                soup = BeautifulSoup(html_content, "html.parser")
                
                job_cards = soup.select("div.card-job")
                if not job_cards: break

                for card in job_cards:
                    if len(job_postings) >= limit: break

                    job_id = card.get("data-id")
                    title_link = card.select_one("h2.card-title a.js-view-job")
                    
                    if not job_id or not title_link: continue
                    
                    title = title_link.get_text(strip=True)
                    absolute_link = urljoin(BASE_URL, title_link.get("href"))

                    meta_items = card.select("ul.job-meta li")
                    date_str, locations = "", []
                    for item in meta_items:
                        for span in item.find_all("span"):
                            if "Posted" in span.get_text(): date_str = span.get_text(strip=True)
                        for div in item.find_all("div"): locations.append(div.get_text(strip=True))
                    
                    job = JobPosting(
                        id=f"{source_name}_{job_id}", title=title, link=absolute_link,
                        posted=parse_fidelity_date(date_str), source=source_name,
                        company=source_name, location=", ".join(locations)
                    )
                    job_postings.append(job)

                if len(job_postings) >= limit: break
                
                try:
                    next_button = page.get_by_role('link', name='Next page')
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

        except Exception as e:
            print(f"[{source_name}] Une erreur est survenue: {e}")
        finally:
            page.close()
            context.close()
            browser.close()

    print(f"[{source_name}] Fetch terminé. {len(job_postings)} offres récupérées.")
    return job_postings[:limit]