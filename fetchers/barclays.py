# Fichier: fetchers/barclays.py (VERSION FINALE AVEC PAUSE FIXE FIABLE)

from __future__ import annotations
from datetime import datetime, timezone
from typing import List
from bs4 import BeautifulSoup
from models import JobPosting
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError, expect
from storage.classifier import classify_job, normalize_contract_type, enrich_location

BASE_URL = "https://search.jobs.barclays"
API_URL = f"{BASE_URL}/search-jobs"
USER_AGENT_STRING = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'

def fetch(*, keyword: str = "", hours: int = 48, limit: int = 250, **kwargs) -> list[JobPosting]:
    log_message = f"avec le mot-clé '{keyword}'" if keyword else "(toutes les offres)"
    print(f"🚀 Démarrage du fetcher pour Barclays {log_message}...")
    
    if keyword:
        print("[BARCLAYS] AVERTISSEMENT : La recherche par mot-clé n'est pas supportée pour ce fetcher.")
        return []

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        context = browser.new_context(
            user_agent=USER_AGENT_STRING,
            locale="en-GB",
            timezone_id="Europe/London",
            viewport={"width": 1920, "height": 1080},
            permissions=[]
        )
        page = context.new_page()
        page.set_default_timeout(45000)

        all_offers_html: list = []

        try:
            print("[BARCLAYS] Navigation vers la page de recherche...")
            page.goto(API_URL, wait_until='domcontentloaded')

            try:
                page.get_by_role('button', name='Accept All').click(timeout=15000)
                print("[BARCLAYS] Cookies acceptés.")
            except PlaywrightTimeoutError:
                print("[BARCLAYS] Bandeau de cookies non trouvé ou déjà géré.")
            
            print("[BARCLAYS] Attente de la stabilisation de la page (network idle)...")
            page.wait_for_load_state('networkidle', timeout=25000)
            print("[BARCLAYS] Page stable et offres initiales chargées.")

            # --- BOUCLE DE PAGINATION AVEC PAUSE FIXE ---
            page_num = 1
            while len(all_offers_html) < limit:
                soup = BeautifulSoup(page.content(), 'lxml')
                results_container = soup.find('div', {'data-selector-name': 'joblist'})
                if not results_container: break
                current_cards = results_container.select('div.list-item--card')
                if not current_cards: break
                all_offers_html.extend(current_cards)
                print(f"[BARCLAYS] Page {page_num} analysée. {len(current_cards)} offres ajoutées. Total : {len(all_offers_html)}")
                if len(all_offers_html) >= limit: break
                
                try:
                    next_page_button = page.get_by_role("link", name="Next")
                    
                    # On vérifie si le bouton est désactivé, ce qui arrive sur la dernière page.
                    if next_page_button.get_attribute('aria-disabled') == 'true':
                        print("[BARCLAYS] 'Next' button is disabled. Fin de la pagination.")
                        break

                    print(f"[BARCLAYS] Passage à la page {page_num + 1}...")
                    next_page_button.click()
                    
                    # --- LA CORRECTION FINALE ET DÉFINITIVE ---
                    # On remplace l'attente 'expect' par une pause fixe, plus fiable.
                    print("[BARCLAYS] Attente de 1 seconde pour le chargement de la nouvelle page...")
                    page.wait_for_timeout(1000)
                    
                    page_num += 1

                except Exception as e:
                    print(f"[BARCLAYS] Fin de la pagination (ou erreur : {e}).")
                    break
            # --- FIN DE LA BOUCLE ---
        except Exception as e:
            print(f"[BARCLAYS] Erreur critique durant la collecte : {e}"); browser.close(); return []

        print(f"🎉[BARCLAYS] SUCCÈS ! {len(all_offers_html)} offres brutes trouvées au total.")
        
        jobs: list[JobPosting] = []
        for offer_html in all_offers_html[:limit]:
            link_tag=offer_html.find('a',class_='job-title--link');location_tag=offer_html.find('p',class_='job-location');
            if not link_tag or not link_tag.get('href'):continue
            relative_url=link_tag['href'];job_id=f"BARC_{link_tag.get('data-job-id',relative_url.split('/')[-1])}";
            job=JobPosting(id=str(job_id),title=link_tag.get_text(strip=True),link=f"{BASE_URL}{relative_url}",source="BARCLAYS",company="Barclays",location=location_tag.get_text(strip=True) if location_tag else None,keyword=keyword,posted=datetime.now(timezone.utc));
            job.location=enrich_location(job.location);job.contract_type=normalize_contract_type(job.title,None);job.category=classify_job(job.title);jobs.append(job);
        
        browser.close()
        print(f"✅ Barclays: {len(jobs)} offres traitées et valides.")
        return jobs