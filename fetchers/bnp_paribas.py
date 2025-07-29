# Fichier: fetchers/bnp_paribas.py (Version Robuste pour GitHub Actions)

from __future__ import annotations
from datetime import datetime, timezone
from typing import List
from bs4 import BeautifulSoup
from models import JobPosting
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError, expect
from storage.classifier import classify_job, normalize_contract_type, enrich_location
from .scraper import scrape_page_for_structured_data

BASE_URL = "https://group.bnpparibas"
API_URL = f"{BASE_URL}/emploi-carriere/toutes-offres-emploi"
USER_AGENT_STRING = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'

def _parse_date_from_ld_json(raw_date: str | None) -> datetime | None:
    if not raw_date: return None
    try: return datetime.strptime(raw_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except (ValueError, TypeError): return datetime.now(timezone.utc)

def fetch(*, keyword: str = "", hours: int = 48, limit: int = 250, **kwargs) -> list[JobPosting]:
    log_message = f"avec le mot-clé '{keyword}'" if keyword else "(toutes les offres)"
    print(f"🚀 Démarrage du fetcher pour BNP Paribas {log_message}...")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)

        # --- CONFIGURATION CRUCIALE POUR GITHUB ACTIONS ---
        # On force la langue, le fuseau horaire et la taille de l'écran
        # pour simuler un environnement de bureau européen standard.
        context = browser.new_context(
            user_agent=USER_AGENT_STRING,
            locale="fr-FR",  # Force la langue française
            timezone_id="Europe/Paris", # Force le fuseau horaire
            viewport={"width": 1920, "height": 1080} # Force une grande taille d'écran
        )
        page = context.new_page()
        # --- FIN DE LA CONFIGURATION ---

        page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        
        # On augmente le timeout par défaut pour être plus tolérant aux lenteurs réseau
        page.set_default_timeout(45000)

        all_offers_html: list = []

        try:
            print("[BNP] Navigation vers la page de base...")
            page.goto(API_URL, wait_until='domcontentloaded')

            try:
                print("[BNP] Recherche du bandeau de cookies...")
                page.get_by_role('button', name='Accepter tous les cookies').click(timeout=15000)
                print("[BNP] Cookies acceptés.")
            except PlaywrightTimeoutError:
                print("[BNP] Bandeau de cookies non trouvé ou déjà géré.")
            
            print("[BNP] Attente du chargement initial des offres...")
            page.wait_for_selector('article.card-offer', timeout=30000)

            print("[BNP] Phase 1: Clics sur 'VOIR PLUS'...")
            click_count = 0
            while True:
                try:
                    load_more_button = page.locator('button.cta-load-more')
                    load_more_button.wait_for(state="visible", timeout=10000) # Timeout légèrement augmenté
                    load_more_button.click()
                    click_count += 1
                    print(f"  [BNP] Clic n°{click_count} sur 'VOIR PLUS' effectué.")
                    page.wait_for_load_state('networkidle', timeout=15000)
                except PlaywrightTimeoutError:
                    print(f"  [BNP] Fin de la phase 1 après {click_count} clic(s).")
                    break
            
            print("[BNP] Phase 2: Recherche de la pagination...")
            page_num = 1
            while len(all_offers_html) < limit:
                soup = BeautifulSoup(page.content(), 'lxml')
                current_cards = soup.select('article.card-offer:not(.promotion)')
                current_urls = {job.find('a')['href'] for job in all_offers_html} if all_offers_html else set()
                unique_new_cards = [card for card in current_cards if card.find('a')['href'] not in current_urls]
                
                if not unique_new_cards and page_num > 1:
                     print("  [BNP] Aucune nouvelle offre unique trouvée sur cette page. Fin de la collecte.")
                     break
                
                all_offers_html.extend(unique_new_cards)
                print(f"  [BNP] Analyse de la page {page_num}. {len(unique_new_cards)} offres ajoutées. Total : {len(all_offers_html)}")
                
                try:
                    first_offer_on_page = page.locator('article.card-offer:not(.promotion) a.card-link').first
                    previous_url = first_offer_on_page.get_attribute('href')
                    next_page_button = page.get_by_role("link", name="Aller à la page suivante")
                    next_page_button.click()
                    page_num += 1
                    print(f"  [BNP] Passage à la page {page_num}...")
                    print("  [BNP] Attente de la mise à jour du contenu...")
                    expect(page.locator('article.card-offer:not(.promotion) a.card-link').first).not_to_have_attribute('href', previous_url, timeout=15000)
                    print(f"  [BNP] Contenu de la page {page_num} chargé avec succès.")

                except PlaywrightTimeoutError:
                    print("  [BNP] Le contenu n'a pas changé ou le bouton n'a pas été trouvé. Fin de la collecte.")
                    break
                except Exception as e:
                     print(f"  [BNP] Une erreur est survenue lors de la pagination : {e}")
                     break

        except Exception as e:
            print(f"[BNP] Erreur critique durant la collecte : {e}")
            browser.close()
            return []

        print(f"🎉[BNP] SUCCÈS ! {len(all_offers_html)} offres brutes trouvées au total.")
        # ... le reste de votre code est parfait et reste inchangé ...
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