# Fichier: fetchers/glencore.py (VERSION FINALE AVEC LIMITE CORRIGÉE)

from __future__ import annotations
from datetime import datetime, timezone
from typing import List
from bs4 import BeautifulSoup, Tag
from models import JobPosting
from playwright.sync_api import sync_playwright
from storage.classifier import classify_job, normalize_contract_type

# --- CONSTANTES ---
BANK_SOURCE = "GLENCORE"
BASE_URL = "https://www.glencore.com"
SEARCH_PAGE_URL = f"{BASE_URL}/careers/jobs"

def _parse_card(card: Tag) -> JobPosting | None:
    cells = card.find_all("td");
    if len(cells) < 4: return None
    link_tag = cells[0].find("a")
    if not link_tag or not link_tag.get("href"): return None
    title = link_tag.get_text(strip=True); relative_url = link_tag['href']; full_url = f"{BASE_URL}{relative_url}"
    location_str = cells[1].get_text(strip=True); date_str = cells[2].get_text(strip=True)
    try:
        posted = datetime.strptime(date_str, "%d/%m/%Y").replace(tzinfo=timezone.utc)
    except ValueError:
        posted = datetime.now(timezone.utc)
    try:
        job_id = f"glencore-{relative_url.split('/')[-1]}"
    except IndexError: return None
    return JobPosting(id=job_id, title=title, link=full_url, posted=posted, source=BANK_SOURCE, company="Glencore", location=location_str, contract_type=normalize_contract_type(title, "Full-time"), category=classify_job(title))

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
                page.get_by_role('button', name='Confirm').click(timeout=10000)
                print("  Cookies acceptés.")
            except Exception: pass
            
            try:
                print("  Application du tri par date...")
                page.locator('button').filter(has_text='Job Position (ascending)').click()
                page.get_by_role('option', name='Posting date (descending)').click()
                page.wait_for_load_state('networkidle', timeout=15000)
                print("  Tri appliqué.")
            except Exception as e:
                print(f"  AVERTISSEMENT: Impossible d'appliquer le tri par date. {e}")

            # --- BOUCLE DE PAGINATION CORRIGÉE ---
            while True:
                # On compte le nombre de lignes (tr) dans le tableau
                current_count = page.locator('table tbody tr').count()
                print(f"  Actuellement {current_count} offres visibles.")
                
                # LA CONDITION DE LIMITE CORRIGÉE
                if current_count >= limit:
                    print(f"  Limite de {limit} atteinte. Fin du chargement.")
                    break

                try:
                    load_more_button = page.get_by_role('button', name='Load more')
                    if not load_more_button.is_visible():
                        print("  Bouton 'Load more' non visible. Fin.")
                        break
                    
                    print("  Clic sur 'Load more'...")
                    load_more_button.click()
                    page.wait_for_timeout(3000)
                    
                    new_count = page.locator('table tbody tr').count()
                    if new_count == current_count:
                        print("  Le nombre d'offres n'a pas augmenté. Fin.")
                        break
                except Exception:
                    print("  Fin du chargement (bouton introuvable ou erreur).")
                    break
            # --- FIN DE LA BOUCLE ---

            print("  Pagination terminée. Parsing du HTML final...")
            soup = BeautifulSoup(page.content(), 'lxml')
            cards = soup.select('table tbody tr', limit=limit)
            
            for card in cards:
                job = _parse_card(card)
                if job: jobs.append(job)

        except Exception as e:
            print(f"  ❌ Une erreur critique est survenue: {e}")
        finally:
            browser.close()
    
    print(f"✅ {BANK_SOURCE}: {len(jobs)} offres collectées.")
    return jobs[:limit]