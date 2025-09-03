from datetime import datetime, timezone
from urllib.parse import urljoin
from locale import setlocale, LC_TIME

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError

from models import JobPosting

BASE_URL = "https://jobs.standardchartered.com"
JOBS_URL = "https://jobs.standardchartered.com/content/Search-Result-Page/?employment_type=early_careers&campaign=ec-homepage"

try:
    setlocale(LC_TIME, 'en_US.UTF-8')
except:
    try:
        setlocale(LC_TIME, 'English_United States.1252')
    except:
        print("[STANCHART] WARN: Could not set locale to English for date parsing.")

def parse_stanchart_date(date_str: str) -> datetime:
    try:
        start_date_str = date_str.split(' - ')[0]
        return datetime.strptime(start_date_str.strip(), '%a %b %d %Y').replace(tzinfo=timezone.utc)
    except Exception:
        return datetime.now(timezone.utc)

def fetch(limit: int, source_name: str, **kwargs) -> list[JobPosting]:
    job_postings: list[JobPosting] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print(f"[{source_name}] Navigation vers la page carrière…")
            page.goto(JOBS_URL, wait_until="domcontentloaded")

            # Cookies (Accept All)
            try:
                cookie_btn = page.get_by_role("button", name="Accept All")
                if cookie_btn.is_visible(timeout=5000):
                    cookie_btn.click()
            except Exception:
                pass

            # Augmenter la pagination à 30
            try:
                selector = page.locator("select").first
                selector.select_option("30")
                page.wait_for_load_state("networkidle", timeout=10000)
                print(f"[{source_name}] Pagination ajustée à 30 résultats/page.")
            except Exception as e:
                print(f"[{source_name}] Impossible de changer la pagination : {e}")

            # Attente du contenu
            try:
                page.wait_for_selector("div.search_results_main__item", timeout=15000)
            except TimeoutError:
                print(f"[{source_name}] Aucune offre trouvée.")
                return []

            soup = BeautifulSoup(page.content(), "html.parser")
            cards = soup.select("div.search_results_main__item")

            print(f"[{source_name}] {len(cards)} offre(s) trouvée(s).")

            for card in cards:
                if len(job_postings) >= limit:
                    break

                link_tag = card.select_one("a.search_results_main__item-button[data-name='url']")
                title_tag = card.select_one("h5.search_results_main__item-title")
                if not link_tag or not title_tag:
                    continue

                absolute_link = urljoin(BASE_URL, link_tag["href"])
                job_id = absolute_link.rstrip("/").split("/")[-2]

                location_tag = card.select_one("span[data-name='location'] span")
                contract_tag = card.select_one("span[data-name='job-type'] span")
                date_tag = card.select_one("span[data-name='date-posted'] span")

                job_postings.append(JobPosting(
                    id=f"{source_name}_{job_id}",
                    title=title_tag.get_text(strip=True),
                    link=absolute_link,
                    posted=parse_stanchart_date(date_tag.get_text(strip=True) if date_tag else ""),
                    source=source_name,
                    company=source_name,
                    location=location_tag.get_text(strip=True) if location_tag else None,
                    contract_type=contract_tag.get_text(strip=True) if contract_tag else None
                ))

        except Exception as e:
            print(f"[{source_name}] Erreur: {e}")
        finally:
            browser.close()

    print(f"[{source_name}] Fetch terminé. {len(job_postings)} offres récupérées.")
    return job_postings[:limit]
