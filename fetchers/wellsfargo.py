# Fichier: fetchers/wellsfargo.py (VERSION FINALE AVEC CONTEXTE HUMAIN)

from __future__ import annotations
from datetime import datetime, timezone
from typing import List
from bs4 import BeautifulSoup, Tag
from models import JobPosting
from playwright.sync_api import sync_playwright, Page, expect
from storage.classifier import classify_job, normalize_contract_type

# --- CONSTANTES ---
BANK_SOURCE = "WELLSFARGO"
BASE_URL = "https://www.wellsfargojobs.com"
SEARCH_PAGE_URL = f"{BASE_URL}/fr/jobs/?search=&country="
USER_AGENT_STRING = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'

def _parse_card(card: Tag) -> JobPosting | None:
    link_tag = card.select_one("h2.card-title a.stretched-link")
    if not link_tag or not link_tag.get('href'): return None
    title = link_tag.get_text(strip=True); relative_url = link_tag['href']; full_url = f"{BASE_URL}{relative_url}"
    location_tag = card.select_one("li.list-inline-item:has(svg > use[xlink\\:href$='#map-marker'])")
    location_str = location_tag.get_text(strip=True) if location_tag else None
    try:
        job_id = f"wellsfargo-{relative_url.split('/')[3]}"
    except IndexError: return None
    return JobPosting(id=job_id, title=title, link=full_url, posted=datetime.now(timezone.utc), source=BANK_SOURCE, company="Wells Fargo", location=location_str, contract_type=normalize_contract_type(title, "Full-time"), category=classify_job(title))

def fetch(*, keyword: str = "", hours: int = 48, limit: int = 50, **kwargs) -> list[JobPosting]:
    print(f"🚀 Démarrage du fetcher pour {BANK_SOURCE}...")
    if keyword: return []
    jobs: List[JobPosting] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        # --- LA CORRECTION DÉFINITIVE : SIMULER UN CONTEXTE HUMAIN ---
        context = browser.new_context(
            user_agent=USER_AGENT_STRING,
            # On donne au navigateur headless une taille de fenêtre standard
            viewport={'width': 1920, 'height': 1080},
            # On spécifie la langue pour être cohérent
            locale='en-US' 
        )
        page = context.new_page()
        # On ajoute le script anti-détection
        page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        # --- FIN DE LA CORRECTION ---
        
        try:
            page.goto(SEARCH_PAGE_URL, timeout=90000)
            try:
                page.get_by_role('button', name='Accept', exact=False).click(timeout=10000)
                print("  Cookies acceptés.")
            except Exception: pass
            
            page_num = 1
            while len(jobs) < limit:
                print(f"  Analyse de la page {page_num}...")
                page.wait_for_selector('div.card-job', timeout=20000)
                
                first_offer_locator = page.locator('div.card-job h2 a').first
                previous_title = first_offer_locator.inner_text()
                
                soup = BeautifulSoup(page.content(), 'lxml')
                cards = soup.select('div.card-job')
                if not cards: break
                
                new_jobs_this_page = 0
                for card in cards:
                    job = _parse_card(card)
                    if job and job.id not in {j.id for j in jobs}:
                        jobs.append(job); new_jobs_this_page += 1
                
                print(f"  {new_jobs_this_page} nouvelle(s) offre(s) trouvée(s). Total collecté: {len(jobs)}")
                if len(jobs) >= limit: break

                try:
                    next_button = page.get_by_role('link', name='Go to next page of results')
                    if next_button.count() == 0: break
                    
                    print("  Passage à la page suivante...")
                    next_button.click()

                    print("  Attente de la mise à jour du contenu...")
                    expect(first_offer_locator).not_to_have_text(previous_title, timeout=20000)
                    
                    page_num += 1
                except Exception:
                    print("  Fin de la pagination (erreur ou bouton introuvable)."); break
        except Exception as e:
            print(f"  ❌ Une erreur critique est survenue: {e}")
        finally:
            browser.close()
    
    print(f"✅ {BANK_SOURCE}: {len(jobs)} offres collectées.")
    return jobs[:limit]