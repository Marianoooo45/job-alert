# Fichier: fetchers/flowtraders.py (Version 2 - Sélecteur Corrigé)

from datetime import datetime, timezone
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError

from models import JobPosting

BASE_URL = "https://www.flowtraders.com"
JOBS_URL = "https://www.flowtraders.com/careers/job-search/"


def fetch(limit: int, source_name: str, **kwargs) -> list[JobPosting]:
    """
    Récupère les offres d'emploi pour Flow Traders.
    """
    job_postings: list[JobPosting] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print(f"[{source_name}] Navigation vers la page carrière...")
            page.goto(JOBS_URL, wait_until="networkidle", timeout=60000)

            try:
                cookie_button = page.get_by_role('button', name='Decline all')
                if cookie_button.is_visible(timeout=5000):
                    print(f"[{source_name}] Refus des cookies...")
                    cookie_button.click()
            except (TimeoutError, Exception):
                print(f"[{source_name}] Pas de bannière de cookies.")

            print(f"[{source_name}] Déploiement de toutes les offres...")
            while True:
                try:
                    show_more_button = page.get_by_role('button', name='Show more')
                    if not show_more_button.is_visible():
                        print(f"[{source_name}] Bouton 'Show more' non visible. Fin.")
                        break
                    
                    show_more_button.click()
                    page.wait_for_load_state('networkidle', timeout=10000)
                except TimeoutError:
                    print(f"[{source_name}] Timeout en attendant le chargement.")
                    break
                except Exception:
                    print(f"[{source_name}] Le bouton 'Show more' n'est plus disponible.")
                    break
            
            print(f"[{source_name}] Toutes les offres sont maintenant affichées.")
            
            html_content = page.content()
            soup = BeautifulSoup(html_content, "html.parser")
            
            # ==================== MODIFICATION CLÉ : Sélecteur Robuste ====================
            # On sélectionne les div qui contiennent un lien vers une description de poste.
            # C'est bien plus stable que les classes CSS générées par Tailwind.
            job_cards = soup.select("div:has(> a[href*='/careers/job-description/'])")
            print(f"[{source_name}] {len(job_cards)} cartes d'offres trouvées.")
            # ==============================================================================

            for card in job_cards:
                if len(job_postings) >= limit:
                    break

                link_tag = card.select_one("a[href*='/careers/job-description/']")
                if not link_tag: continue
                
                relative_link = link_tag.get("href")
                absolute_link = urljoin(BASE_URL, relative_link)
                job_id = relative_link.split('/')[-1]

                title = card.select_one("h2").get_text(strip=True)
                
                meta_tag = card.select_one("h6")
                location_raw = meta_tag.get_text(strip=True) if meta_tag else ""
                location = location_raw.split('|')[0].strip() if '|' in location_raw else location_raw
                
                job = JobPosting(
                    id=f"{source_name}_{job_id}",
                    title=title,
                    link=absolute_link,
                    posted=datetime.now(timezone.utc),
                    source=source_name,
                    company=source_name,
                    location=location,
                )
                job_postings.append(job)

        except TimeoutError:
            print(f"[{source_name}] La page a mis trop de temps à charger (Timeout).")
        except Exception as e:
            print(f"[{source_name}] Une erreur est survenue: {e}")
        finally:
            browser.close()
    
    print(f"[{source_name}] Fetch terminé. {len(job_postings)} offres récupérées.")
    return job_postings[:limit]