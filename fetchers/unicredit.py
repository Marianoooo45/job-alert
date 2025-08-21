# Fichier: fetchers/unicredit.py (VERSION FINALE ET FONCTIONNELLE)

from __future__ import annotations
from datetime import datetime, timezone
from typing import List
from bs4 import BeautifulSoup, Tag
from models import JobPosting
from playwright.sync_api import sync_playwright, Page
from storage.classifier import classify_job, normalize_contract_type

# --- CONSTANTES ---
BANK_SOURCE = "UNICREDIT"
BASE_URL = "https://careers.unicredit.eu"
SEARCH_PAGE_URL = f"{BASE_URL}/en_GB/jobsuche#"

def _parse_card(card: Tag) -> JobPosting | None:
    link_tag = card.select_one("h3.article__header__text__title a")
    if not link_tag or not link_tag.get('href'): return None
    title = link_tag.get_text(strip=True); full_url = link_tag['href']
    location_tag = card.select_one(".job-info-icon_world")
    contract_tag = card.select_one(".job-info-icon_work")
    location_str = location_tag.get_text(strip=True).replace(',', ', ') if location_tag else None
    raw_contract = contract_tag.get_text(strip=True) if contract_tag else None
    try:
        job_id = f"unicredit-{full_url.split('/')[-1]}"
    except IndexError: return None
    return JobPosting(id=job_id, title=title, link=full_url, posted=datetime.now(timezone.utc), source=BANK_SOURCE, company="UniCredit", location=location_str, contract_type=normalize_contract_type(title, raw_contract), category=classify_job(title))

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
                # Votre découverte sur les cookies
                page.get_by_role('link', { 'name': 'Accept all' }).click(timeout=10000)
                print("  Cookies acceptés.")
            except Exception: pass
            
            page_num = 1
            while len(jobs) < limit:
                print(f"  Analyse de la page {page_num}...")
                page.wait_for_selector('article.article--result', timeout=20000)
                soup = BeautifulSoup(page.content(), 'lxml')
                
                cards = soup.select('article.article--result')
                if not cards: break
                
                new_jobs_this_page = 0
                for card in cards:
                    job = _parse_card(card)
                    if job and job.id not in {j.id for j in jobs}:
                        jobs.append(job); new_jobs_this_page += 1
                
                print(f"  {new_jobs_this_page} nouvelle(s) offre(s) trouvée(s). Total collecté: {len(jobs)}")
                if len(jobs) >= limit: break

                try:
                    # --- LE SÉLECTEUR PARFAIT, GRÂCE À VOUS ---
                    # On cible le deuxième bouton "Next"
                    next_button = page.get_by_role('link', name='Go to Next Page, Number').nth(1)
                    
                    if not next_button.is_visible():
                        print("  Fin de la pagination (bouton 'Next' non visible).")
                        break
                    
                    print("  Passage à la page suivante...")
                    next_button.click()
                    page.wait_for_load_state('domcontentloaded', timeout=15000)
                    page_num += 1
                except Exception:
                    print("  Fin de la pagination (bouton introuvable ou erreur).")
                    break
        except Exception as e:
            print(f"  ❌ Une erreur critique est survenue: {e}")
        finally:
            browser.close()
    
    print(f"✅ {BANK_SOURCE}: {len(jobs)} offres collectées.")
    return jobs[:limit]