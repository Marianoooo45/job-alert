# Fichier: fetchers/bnp_paribas.py (Version 2.0 - Anti-Bot)

from __future__ import annotations
from datetime import datetime, timezone
import time
from typing import List
from bs4 import BeautifulSoup, Tag
from models import JobPosting
from playwright.sync_api import sync_playwright
from storage.classifier import classify_job, normalize_contract_type, enrich_location
from .scraper import scrape_page_for_structured_data

# --- Constantes ---
BASE_URL = "https://group.bnpparibas"
API_URL = f"{BASE_URL}/emploi-carriere/toutes-offres-emploi"
# ✅ On utilise un User-Agent de vrai navigateur pour paraître plus humain
USER_AGENT_STRING = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

def _parse_date_from_ld_json(raw_date: str | None) -> datetime | None:
    if not raw_date: return None
    try: return datetime.strptime(raw_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except (ValueError, TypeError): return datetime.now(timezone.utc)

def fetch(*, keyword: str = "", hours: int = 48, limit: int = 50, **kwargs) -> list[JobPosting]:
    log_message = f"avec le mot-clé '{keyword}'" if keyword else "(toutes les offres)"
    print(f"🚀 Démarrage du fetcher pour BNP Paribas {log_message}...")
    
    with sync_playwright() as p:
        # --- 👇 MODIFICATIONS ANTI-BOT 👇 ---
        
        # 1. On demande à Playwright de lancer une vraie version de Chrome, pas son Chromium de base.
        #    Cela fonctionne car les serveurs GitHub Actions ont Chrome d'installé.
        browser = p.chromium.launch(channel="chrome", headless=True) 
        
        # 2. On crée un contexte avec notre User-Agent personnalisé.
        context = browser.new_context(user_agent=USER_AGENT_STRING)
        page = context.new_page()

        # 3. Le secret : on exécute un script pour cacher le fait qu'on est un automate.
        page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

        # --- 👆 FIN DES MODIFICATIONS 👆 ---

        all_offers_html: List[Tag] = []

        try:
            # La logique de scraping reste identique
            if keyword:
                print("[BNP] La recherche par mot-clé est désactivée pour ce fetcher complexe.")
                return []

            print("[BNP] Navigation vers la page de base...")
            page.goto(API_URL, wait_until='domcontentloaded', timeout=60000)
            try:
                page.get_by_role('button', name='Accepter tous les cookies').click(timeout=5000)
                print("[BNP] Cookies acceptés.")
            except Exception:
                print("[BNP] Bandeau de cookies non trouvé.")
            page.wait_for_selector('article.card-offer', timeout=30000)

            print("[BNP] Phase 1: Recherche du bouton 'VOIR PLUS'...")
            while True:
                load_more_button = page.get_by_role('button', name='VOIR PLUS')
                if not load_more_button.is_visible():
                    print("  [BNP] Bouton 'VOIR PLUS' non trouvé. Fin de la phase 1.")
                    break
                print("  [BNP] Clic sur 'VOIR PLUS'...")
                load_more_button.scroll_into_view_if_needed()
                load_more_button.click()
                time.sleep(2)

            soup = BeautifulSoup(page.content(), 'lxml')
            all_offers_html.extend(soup.find_all('article', class_='card-offer'))
            print(f"[BNP] {len(all_offers_html)} offres collectées après la phase 1.")
            
            page_num = 3
            while len(all_offers_html) < limit:
                next_page_button = page.get_by_role("link", name="Aller à la page suivante")
                if not next_page_button.is_visible():
                    print("  [BNP] Plus de page suivante. Fin de la collecte.")
                    break
                
                print(f"  [BNP] Passage à la page {page_num + 1}...")
                next_page_button.click()
                page.wait_for_load_state('domcontentloaded')

                soup = BeautifulSoup(page.content(), 'lxml')
                new_cards = soup.find_all('article', class_='card-offer')
                all_offers_html.extend(new_cards)
                print(f"  [BNP] {len(new_cards)} offres ajoutées. Total : {len(all_offers_html)}")
                page_num += 1

        except Exception as e:
            print(f"[BNP] Erreur critique durant la collecte : {e}"); import traceback; traceback.print_exc(); browser.close(); return []

        print(f"🎉[BNP] SUCCÈS ! {len(all_offers_html)} offres brutes trouvées au total.")
        
        jobs: list[JobPosting] = []
        for offer_html in all_offers_html[:limit]:
            link_tag=offer_html.find('a',class_='card-link');title_tag=offer_html.find('h3',class_='title-4');
            if not link_tag or not title_tag or not link_tag.get('href'):continue
            relative_url=link_tag['href'];title=title_tag.get_text(strip=True);full_url=f"{BASE_URL}{relative_url}";job_id=f"BNPP_{relative_url.split('/')[-1]}";
            
            detail_page = context.new_page()
            try:
                detail_page.goto(full_url,wait_until='domcontentloaded',timeout=40000);details=scrape_page_for_structured_data(detail_page, page_url=full_url)
            except Exception as e:print(f"  [BNP] Erreur Playwright sur {full_url}: {e}");details={}
            finally: detail_page.close()

            job=JobPosting(id=str(job_id),title=title,link=full_url,posted=_parse_date_from_ld_json(details.get("datePosted")),source="BNPP",company="BNP Paribas",keyword=keyword,location=details.get("location"),contract_type=details.get("contract_type"));
            job.location=enrich_location(job.location);job.contract_type=normalize_contract_type(job.title,job.contract_type);job.category=classify_job(job.title);jobs.append(job)
        
        browser.close()
        print(f"✅ BNP Paribas: {len(jobs)} offres traitées et valides.")
        return jobs