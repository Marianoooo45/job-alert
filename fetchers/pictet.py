# Fichier: fetchers/pictet.py (VERSION FINALE AVEC SÉLECTEUR D'ATTENTE SPÉCIFIQUE)

from __future__ import annotations
import re
from datetime import datetime, timezone
from typing import List
from bs4 import BeautifulSoup, Tag
from models import JobPosting
from playwright.sync_api import sync_playwright, expect
from storage.classifier import classify_job, normalize_contract_type

# --- CONSTANTES ---
BANK_SOURCE = "PICTET"
BASE_URL = "https://career012.successfactors.eu"
SEARCH_PAGE_URL = "https://career012.successfactors.eu/career?company=banquepict&career%5fns=job%5flisting%5fsummary&navBarLevel=JOB%5fSEARCH&_s.crb=bHx4PRZpx3AFK%2bIfaLkR2PCQcrVZ5DlWS%2f7FgHkAonQ%3d"

def _parse_card(card: Tag) -> JobPosting | None:
    link_tag = card.select_one("a.jobTitle"); note_section = card.select_one("div.noteSection")
    if not link_tag or not note_section or not link_tag.get('href'): return None
    title = link_tag.get_text(strip=True); relative_url = link_tag['href']; full_url = f"{BASE_URL}{relative_url}"
    note_text = note_section.get_text(separator='|', strip=True)
    job_id_match = re.search(r"career_job_req_id=(\d+)", relative_url)
    date_match = re.search(r"Posted on (\d{2}/\d{2}/\d{4})", note_text)
    location_match = re.search(r"-\s*([^|]+?)\s*-\s*([^|]+)", note_text)
    if not job_id_match: return None
    job_id = f"pictet-{job_id_match.group(1)}"
    try: posted = datetime.strptime(date_match.group(1), "%d/%m/%Y").replace(tzinfo=timezone.utc) if date_match else datetime.now(timezone.utc)
    except (ValueError, AttributeError): posted = datetime.now(timezone.utc)
    location_str = f"{location_match.group(2).strip()}, {location_match.group(1).strip()}" if location_match else None
    return JobPosting(id=job_id, title=title, link=full_url, posted=posted, source=BANK_SOURCE, company="Pictet", location=location_str, contract_type=normalize_contract_type(title, "Experienced Professionals"), category=classify_job(title))

def fetch(*, keyword: str = "", hours: int = 48, limit: int = 50, **kwargs) -> list[JobPosting]:
    print(f"🚀 Démarrage du fetcher pour {BANK_SOURCE}...")
    if keyword: return []
    jobs: List[JobPosting] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        context = browser.new_context()
        page = context.new_page()
        try:
            page.goto(SEARCH_PAGE_URL, timeout=90000, wait_until="domcontentloaded")
            try:
                page.get_by_text("Accept", exact=False).click(timeout=10000)
                print("  Cookies acceptés.")
            except Exception: pass
            
            page_num = 1
            while len(jobs) < limit:
                print(f"  Analyse de la page {page_num}...")
                page.wait_for_selector('tr.jobResultItem', timeout=20000)
                
                soup = BeautifulSoup(page.content(), 'lxml'); cards = soup.select('tr.jobResultItem')
                if not cards: break
                
                new_jobs_this_page = 0
                for card in cards:
                    job = _parse_card(card)
                    if job and job.id not in {j.id for j in jobs}:
                        jobs.append(job); new_jobs_this_page += 1
                
                print(f"  {new_jobs_this_page} nouvelle(s) offre(s) trouvée(s). Total collecté: {len(jobs)}")
                if len(jobs) >= limit: break

                try:
                    next_button = page.locator('[id$="_next_link"]').first
                    if next_button.count() == 0: break
                    
                    print("  Passage à la page suivante...")
                    next_button.click()

                    # --- LA CORRECTION DÉFINITIVE : ON SURVEILLE LE PREMIER CHAMP ---
                    print(f"  Attente de la mise à jour vers la page {page_num + 1}...")
                    page_input = page.locator('input.sfPaginatorPageSwitch').first
                    expect(page_input).to_have_value(str(page_num + 1), timeout=15000)
                    
                    page_num += 1
                except Exception as e:
                    print(f"  Fin de la pagination (erreur ou bouton introuvable) : {e}"); break
        except Exception as e:
            print(f"  ❌ Une erreur critique est survenue: {e}")
        finally:
            browser.close()
    
    print(f"✅ {BANK_SOURCE}: {len(jobs)} offres collectées.")
    return jobs[:limit]