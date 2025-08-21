# Fichier: fetchers/blackrock.py (VERSION FINALE AVEC TRI PAR DATE CORRIGÉ)

from __future__ import annotations
from datetime import datetime, timezone
from typing import List
from bs4 import BeautifulSoup, Tag
from models import JobPosting
from playwright.sync_api import sync_playwright, Page
from storage.classifier import classify_job, normalize_contract_type

# --- CONSTANTES ---
BANK_SOURCE = "BLACKROCK"
BASE_URL = "https://careers.blackrock.com"
SEARCH_PAGE_URL = f"{BASE_URL}/search-jobs?k=&l=&orgIds=45831"

def _parse_card(card: Tag) -> JobPosting | None:
    link_tag = card.select_one("a.section3__search-results-a")
    if not link_tag or not link_tag.get('href'): return None
    title = link_tag.select_one("h2.section3__job-title").get_text(strip=True)
    relative_url = link_tag['href']; full_url = f"{BASE_URL}{relative_url}"
    location_tag = link_tag.select_one("span.section3__job-info")
    location_str = location_tag.get_text(strip=True) if location_tag else None
    job_id = link_tag.get('data-job-id')
    if not job_id:
        try: job_id = relative_url.split('/')[-1]
        except IndexError: return None
    return JobPosting(id=f"blackrock-{job_id}", title=title, link=full_url, posted=datetime.now(timezone.utc), source=BANK_SOURCE, company="BlackRock", location=location_str, contract_type=normalize_contract_type(title, "Full Time"), category=classify_job(title))

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
                page.get_by_role('button', name='Required Only').click(timeout=10000)
                print("  Cookies acceptés (Required Only).")
            except Exception: pass

            # --- LA CORRECTION DÉFINITIVE POUR LE TRI PAR DATE ---
            try:
                print("  Application du tri par date de publication (méthode directe)...")
                # On cible le <select> et on sélectionne l'option par sa valeur '13'
                page.select_option('select.section3__search-results-sort-select', value='13')
                # On attend que le réseau soit calme, signe que le rechargement est terminé
                page.wait_for_load_state('networkidle', timeout=15000)
                print("   Tri par date appliqué avec succès.")
            except Exception as e:
                print(f"   AVERTISSEMET : Impossible d'appliquer le tri par date. Erreur: {e}")
            # --- FIN DE LA CORRECTION ---
            
            page_num = 1
            while len(jobs) < limit:
                print(f"  Analyse de la page {page_num}...")
                page.wait_for_selector('li.section3__search-results-li', timeout=20000)
                soup = BeautifulSoup(page.content(), 'lxml')
                
                cards = soup.select('li.section3__search-results-li')
                if not cards: break
                
                new_jobs_this_page = 0
                for card in cards:
                    job = _parse_card(card)
                    if job and job.id not in {j.id for j in jobs}:
                        jobs.append(job); new_jobs_this_page += 1
                
                print(f"  {new_jobs_this_page} nouvelle(s) offre(s) trouvée(s). Total collecté: {len(jobs)}")
                if len(jobs) >= limit: break

                try:
                    next_button = page.get_by_role('link', name='Next')
                    if next_button.count() == 0: break
                    print("  Passage à la page suivante...")
                    next_button.click()
                    page.wait_for_load_state('domcontentloaded', timeout=15000)
                    page_num += 1
                except Exception:
                    print("  Fin de la pagination (erreur ou bouton introuvable)."); break
        except Exception as e:
            print(f"  ❌ Une erreur critique est survenue: {e}")
        finally:
            browser.close()
    
    print(f"✅ {BANK_SOURCE}: {len(jobs)} offres collectées.")
    return jobs[:limit]