# Fichier: fetchers/jefferies.py

from __future__ import annotations
from datetime import datetime, timezone
from typing import List
from bs4 import BeautifulSoup, Tag
from models import JobPosting
from playwright.sync_api import sync_playwright
from storage.classifier import classify_job, normalize_contract_type

# --- CONSTANTES ---
BANK_SOURCE = "JEFFERIES"
BASE_URL = "https://jefferies.tal.net"
SEARCH_PAGE_URL = f"{BASE_URL}/vx/lang-en-GB/mobile-0/appcentre-ext/brand-4/xf-016c915b0a67/candidate/jobboard/vacancy/2/adv/"

def _parse_card(card: Tag) -> JobPosting | None:
    """Parse une seule carte d'offre (li) du site Jefferies."""
    link_tag = card.select_one("h3.candidate-opp-field-2 > a.subject")
    if not link_tag or not link_tag.get('href'):
        return None

    title = link_tag.get_text(strip=True)
    full_url = link_tag['href']
    
    # La localisation est dans le titre, on ne peut pas l'extraire de manière fiable ici.
    # On la laisse à None, enrich_location s'en chargera peut-être.
    location_str = None
    
    job_id_raw = card.get('data-oppid')
    if not job_id_raw:
        return None
        
    job_id = f"jefferies-{job_id_raw}"
    
    return JobPosting(
        id=job_id,
        title=title,
        link=full_url,
        posted=datetime.now(timezone.utc), # Date non disponible dans la liste
        source=BANK_SOURCE,
        company="Jefferies",
        location=location_str,
        contract_type=normalize_contract_type(title, None),
        category=classify_job(title)
    )

def fetch(*, keyword: str = "", hours: int = 48, limit: int = 50, **kwargs) -> list[JobPosting]:
    print(f"🚀 Démarrage du fetcher pour {BANK_SOURCE}...")
    if keyword: return []
    jobs: List[JobPosting] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        context = browser.new_context()
        page = context.new_page()
        try:
            page.goto(SEARCH_PAGE_URL, timeout=90000)
            try:
                page.get_by_role('button', name='Accept', exact=False).click(timeout=10000)
                print("  Cookies acceptés.")
            except Exception: pass
            
            page_num = 1
            while len(jobs) < limit:
                print(f"  Analyse de la page {page_num}...")
                page.wait_for_selector('li.opp-container', timeout=20000)
                soup = BeautifulSoup(page.content(), 'lxml')
                
                cards = soup.select('li.opp-container')
                if not cards: break
                
                new_jobs_this_page = 0
                for card in cards:
                    job = _parse_card(card)
                    if job and job.id not in {j.id for j in jobs}:
                        jobs.append(job)
                        new_jobs_this_page += 1
                
                print(f"  {new_jobs_this_page} nouvelle(s) offre(s) trouvée(s). Total collecté: {len(jobs)}")
                if len(jobs) >= limit: break

                try:
                    # On anticipe une pagination standard avec un lien "Next"
                    next_button = page.locator('a:has-text("Next")')
                    if next_button.count() == 0:
                        print("  Fin de la pagination (bouton 'Next' non trouvé).")
                        break
                    
                    print("  Passage à la page suivante...")
                    next_button.click()
                    page.wait_for_load_state('domcontentloaded', timeout=15000)
                    page_num += 1
                except Exception:
                    print("  Fin de la pagination (erreur ou bouton introuvable).")
                    break
        except Exception as e:
            print(f"  ❌ Une erreur critique est survenue: {e}")
        finally:
            browser.close()
    
    print(f"✅ {BANK_SOURCE}: {len(jobs)} offres collectées.")
    return jobs[:limit]