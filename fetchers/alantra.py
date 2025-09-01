# Fichier: fetchers/alantra.py (Version 5 - Correction Syntaxe Pagination)

from datetime import datetime, timezone

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError

from models import JobPosting

BASE_URL = "https://www.alantra.com/careers/apply/"


def fetch(limit: int, source_name: str, **kwargs) -> list[JobPosting]:
    """
    Récupère les offres d'emploi pour Alantra, avec une gestion de pagination corrigée.
    """
    job_postings: list[JobPosting] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print(f"[{source_name}] Navigation vers la page carrière: {BASE_URL}")
            page.goto(BASE_URL, wait_until="networkidle", timeout=60000)

            # Gérer la bannière de cookies
            try:
                cookie_button = page.get_by_role('link', name='Accept')
                if cookie_button.is_visible(timeout=5000):
                    print(f"[{source_name}] Acceptation des cookies...")
                    cookie_button.click()
                    page.wait_for_load_state('networkidle', timeout=5000)
            except (TimeoutError, Exception):
                print(f"[{source_name}] Pas de bannière de cookies trouvée ou cliquable.")

            page_num = 1
            processed_ids = set()

            while len(job_postings) < limit:
                print(f"[{source_name}] Analyse de la page {page_num}...")
                
                try:
                    page.wait_for_selector("li.careers__list__item", timeout=15000)
                except TimeoutError:
                    print(f"[{source_name}] Aucune offre trouvée sur la page {page_num}. Fin.")
                    break

                html_content = page.content()
                soup = BeautifulSoup(html_content, "html.parser")
                job_cards = soup.select("ul.news-grid > li.careers__list__item")

                if not job_cards:
                    print(f"[{source_name}] Plus de cartes d'offres trouvées.")
                    break

                first_job_id_on_this_page = job_cards[0].select_one("svg[data-career]").get("data-career") if job_cards and job_cards[0].select_one("svg[data-career]") else None

                for card in job_cards:
                    if len(job_postings) >= limit: break

                    id_tag = card.select_one("svg[data-career]")
                    if not id_tag: continue
                    
                    job_id = id_tag["data-career"]
                    unique_id = f"{source_name}_{job_id}"

                    if unique_id in processed_ids: continue
                    processed_ids.add(unique_id)

                    title_tag = card.select_one("p.news-grid__items_title")
                    popup_link_tag = card.select_one("a.popup-contact-me")
                    if not all([title_tag, popup_link_tag, popup_link_tag.get("href")]): continue
                    
                    popup_id = popup_link_tag["href"]
                    popup_div = soup.select_one(f"div{popup_id}")
                    apply_link_tag = popup_div.select_one("a.btn[href*='workdayjobs.com']") if popup_div else None
                    
                    if not apply_link_tag or not apply_link_tag.get("href"):
                        print(f"[{source_name}] WARN: Pas de lien Workday trouvé pour '{title_tag.get_text(strip=True)}'")
                        continue

                    job = JobPosting(
                        id=unique_id,
                        title=title_tag.get_text(strip=True),
                        link=apply_link_tag["href"],
                        posted=datetime.now(timezone.utc),
                        source=source_name, company=source_name,
                        location=card.select_one("div.news-grid__items_publish_date").get_text(strip=True),
                        category=card.select_one("div.news-grid__items_cat").get_text(strip=True) if card.select_one("div.news-grid__items_cat") else None,
                    )
                    job_postings.append(job)
                
                if len(job_postings) >= limit:
                    print(f"[{source_name}] Limite de {limit} offres atteinte.")
                    break

                # --- Logique de pagination ---
                try:
                    next_button = page.locator("a.next.page-numbers")
                    if not next_button.is_visible():
                        print(f"[{source_name}] Bouton 'Suivant' non visible. Fin de la pagination.")
                        break
                    
                    if not first_job_id_on_this_page:
                        print(f"[{source_name}] Impossible de trouver un ID de référence. Arrêt de la pagination.")
                        break

                    print(f"[{source_name}] Clic sur le bouton 'Suivant'...")
                    next_button.click()
                    
                    # ==================== CORRECTION DE SYNTAXE ====================
                    # On injecte la variable directement dans la chaîne JS.
                    # La fonction JS n'a plus d'argument, ce qui résout le TypeError.
                    js_condition = f"""() => {{
                        const firstJob = document.querySelector('li.careers__list__item svg[data-career]');
                        return firstJob && firstJob.getAttribute('data-career') !== '{first_job_id_on_this_page}';
                    }}"""
                    
                    print(f"[{source_name}] Attente de la mise à jour du contenu (ID de référence: {first_job_id_on_this_page})...")
                    page.wait_for_function(js_condition, timeout=15000)
                    # ================================================================

                    page_num += 1
                except TimeoutError:
                    print(f"[{source_name}] Timeout : le contenu de la page ne s'est pas mis à jour après le clic. Fin.")
                    break
                except Exception as e:
                    # On affiche l'erreur réelle pour le débogage futur.
                    print(f"[{source_name}] Erreur sur le bouton 'Suivant': {type(e).__name__}: {e}. Fin.")
                    break

        except TimeoutError:
            print(f"[{source_name}] La page a mis trop de temps à charger (Timeout).")
        except Exception as e:
            print(f"[{source_name}] Une erreur est survenue: {type(e).__name__}: {e}")
        finally:
            browser.close()
    
    print(f"[{source_name}] Fetch terminé. {len(job_postings)} offres récupérées.")
    return job_postings[:limit]