# Fichier: fetchers/goldmansachs.py (VERSION FINALE AVEC PARSING CORRIGÉ)

from __future__ import annotations
from datetime import datetime, timezone
from typing import List
from bs4 import BeautifulSoup, Tag
from models import JobPosting
from playwright.sync_api import sync_playwright, expect
from storage.classifier import classify_job, normalize_contract_type

# --- CONSTANTES ---
BANK_SOURCE = "GOLDMANSACHS"
BASE_URL = "https://higher.gs.com"
SEARCH_PAGE_URL = f"{BASE_URL}/campus?&page=1&sort=POSTED_DATE"

# --- LA FONCTION DE PARSING CORRIGÉE ---
def _parse_card(card: Tag) -> JobPosting | None:
    # On commence la recherche depuis le conteneur 'div.border-bottom'
    link_tag = card.select_one("a.text-decoration-none")
    if not link_tag or not link_tag.get('href'): return None
    
    title_span = link_tag.select_one("span")
    title = title_span.get_text(strip=True) if title_span else ""
    if not title: return None
    
    relative_url = link_tag['href']; full_url = f"{BASE_URL}{relative_url}"
    location_tag = link_tag.select_one('div[data-testid="location"] span')
    location_str = location_tag.get_text(strip=True).replace('·', ', ') if location_tag else None
    
    contract_info_tag = link_tag.select_one('div.d-flex.align-items-center span.gs-text:last-of-type')
    raw_contract = contract_info_tag.get_text(strip=True).replace('·', '').strip() if contract_info_tag else "Analyst"
    
    try:
        job_id = f"goldmansachs-{relative_url.split('/roles/')[-1]}"
    except IndexError: return None
    
    return JobPosting(id=job_id, title=title, link=full_url, posted=datetime.now(timezone.utc), source=BANK_SOURCE, company="Goldman Sachs", location=location_str, contract_type=normalize_contract_type(title, raw_contract), category=classify_job(title))

def fetch(*, keyword: str = "", hours: int = 48, limit: int = 50, **kwargs) -> list[JobPosting]:
    print(f"🚀 Démarrage du fetcher pour {BANK_SOURCE}...")
    if keyword: return []
    jobs: List[JobPosting] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        context = browser.new_context()
        page = context.new_page()
        try:
            page.goto(SEARCH_PAGE_URL, timeout=90000, wait_until='domcontentloaded')
            try:
                page.get_by_role('button', name='Accept', exact=False).click(timeout=10000)
                print("  Cookies acceptés.")
            except Exception: pass
            
            page.wait_for_load_state('networkidle', timeout=25000)
            print("  Page stable et offres chargées.")
            
            page_num = 1
            while len(jobs) < limit:
                print(f"  Analyse de la page {page_num}...")
                
                first_offer_locator = page.locator('div.border-bottom a.text-decoration-none span').first
                previous_title = first_offer_locator.inner_text()
                
                soup = BeautifulSoup(page.content(), 'lxml')
                # --- LE SÉLECTEUR DE CARTE DÉFINITIF ---
                cards = soup.select('div.border-bottom')
                if not cards:
                    print("  Aucune carte d'offre trouvée sur la page.")
                    break
                
                new_jobs_this_page = 0
                for card in cards:
                    job = _parse_card(card)
                    if job and job.id not in {j.id for j in jobs}:
                        jobs.append(job); new_jobs_this_page += 1
                
                print(f"  {new_jobs_this_page} nouvelle(s) offre(s) trouvée(s). Total collecté: {len(jobs)}")
                if len(jobs) >= limit: break

                try:
                    next_button = page.get_by_role('link', name='Goto next page')
                    if next_button.count() == 0 or next_button.is_disabled(): break
                    
                    print("  Passage à la page suivante...")
                    next_button.click()
                    
                    print("  Attente de la mise à jour du contenu...")
                    expect(first_offer_locator).not_to_have_text(previous_title, timeout=20000)
                    
                    page_num += 1
                except Exception as e:
                    print(f"  Fin de la pagination (erreur ou bouton introuvable): {e}"); break
        except Exception as e:
            print(f"  ❌ Une erreur critique est survenue: {e}")
        finally:
            browser.close()
    
    print(f"✅ {BANK_SOURCE}: {len(jobs)} offres collectées.")
    return jobs[:limit]