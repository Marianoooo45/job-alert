# Fichier : fetchers/ubs.py (Version finale et fonctionnelle)

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
from bs4 import BeautifulSoup
from typing import List
from datetime import datetime, timezone

from models import JobPosting
from storage.classifier import classify_job, normalize_contract_type

SEARCH_PAGE_URL = "https://jobs.ubs.com/TGnewUI/Search/home/HomeWithPreLoad?partnerid=25008&siteid=5131&PageType=searchResults&SearchType=linkquery&LinkID=15232"
USER_AGENT_STRING = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'

def fetch(keyword: str, hours: int, limit: int, **bank_args) -> List[JobPosting]:
    print("Fetching jobs from UBS (Final Playwright Strategy)...")
    jobs: List[JobPosting] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(user_agent=USER_AGENT_STRING)
        page = context.new_page()
        page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

        try:
            print(f"  Navigating to {SEARCH_PAGE_URL}...")
            page.goto(SEARCH_PAGE_URL, wait_until='domcontentloaded', timeout=40000)

            try:
                print("  Looking for the 'Agree to all' cookie button...")
                page.get_by_role('button', name='Agree to all').click(timeout=10000)
                print("  ✅ Cookie banner accepted.")
            except PlaywrightTimeoutError:
                print("  - Cookie banner not found or already accepted.")

            # --- ✨ LE BON SÉLECTEUR, BASÉ SUR TON ANALYSE ✨ ---
            # Les offres sont des <li> avec la classe 'job'
            print("  Waiting for job list to be loaded...")
            page.wait_for_selector('li.job', timeout=30000)
            print("  ✅ Job list is visible.")

            html_content = page.content()
            soup = BeautifulSoup(html_content, 'lxml')
            
            job_cards = soup.find_all('li', class_='job', limit=limit)
            print(f"  Found {len(job_cards)} job cards on the page.")

            for card in job_cards:
                title_link_tag = card.select_one('a.jobtitle')
                if not title_link_tag or not title_link_tag.get('href'): continue

                title = title_link_tag.get_text(strip=True)
                job_url = title_link_tag['href']
                
                # Les autres infos sont dans des <p> avec la classe 'jobProperty'
                properties = card.select('p.jobProperty')
                location_str = None
                if properties:
                    # On prend la première propriété comme étant le lieu
                    location_str = properties[0].get_text(strip=True)

                contract_type = normalize_contract_type(title, None)

                try:
                    job_id = f"ubs-{job_url.split('jobid=')[-1]}"
                except IndexError:
                    job_id = f"ubs-{job_url}"

                category = classify_job(title)
                
                job = JobPosting(
                    id=job_id,
                    title=title,
                    link=job_url,
                    posted=datetime.now(timezone.utc),
                    source="UBS",
                    company="UBS",
                    location=location_str,
                    keyword=keyword,
                    category=category,
                    contract_type=contract_type
                )
                jobs.append(job)

        except Exception as e:
            print(f"  ❌ A critical error occurred: {e}")
            import traceback
            traceback.print_exc()
        finally:
            browser.close()
    
    print(f"✅ UBS: Successfully processed {len(jobs)} jobs.")
    return jobs