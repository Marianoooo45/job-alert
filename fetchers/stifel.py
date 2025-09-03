# Fichier: fetchers/stifel.py (Version 3 - Syntaxe iFrame Corrigée)

from datetime import datetime, timezone
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError, FrameLocator

from models import JobPosting

BASE_URL = "https://careers-stifel.icims.com"
JOBS_URL = "https://careers-stifel.icims.com/jobs/search?mode=job&iis=Company+Website"


def fetch(limit: int, source_name: str, **kwargs) -> list[JobPosting]:
    """
    Récupère les offres d'emploi pour Stifel (plateforme iCIMS).
    """
    job_postings: list[JobPosting] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print(f"[{source_name}] Navigation vers la page carrière...")
            page.goto(JOBS_URL, wait_until="networkidle")
            
            iframe: FrameLocator = page.frame_locator('iframe[id="icims_content_iframe"]')

            # ==================== MODIFICATION CLÉ : Syntaxe Corrigée ====================
            try:
                # La bonne syntaxe est d'utiliser locator(...).wait_for() sur un FrameLocator
                iframe.locator("div.iCIMS_JobsTable").wait_for(state="visible", timeout=15000)
                print(f"[{source_name}] Offres chargées dans l'iframe.")
            except TimeoutError:
                print(f"[{source_name}] Aucune offre trouvée dans l'iframe. Arrêt.")
                return []
            # ===========================================================================

            while True:
                try:
                    load_more_button = iframe.get_by_role('button', name='Load More')
                    if not load_more_button.is_visible():
                        print(f"[{source_name}] Bouton 'Load More' non visible. Fin.")
                        break
                    
                    print(f"[{source_name}] Clic sur 'Load More'...")
                    load_more_button.click()
                    # Utilisation de la bonne syntaxe pour l'attente
                    iframe.locator(".iCIMS_Loading").wait_for(state="hidden", timeout=10000)
                except Exception:
                    print(f"[{source_name}] Pas ou plus de bouton 'Load More'.")
                    break

            html_content = iframe.locator("body").inner_html()
            soup = BeautifulSoup(html_content, "html.parser")
            
            job_cards = soup.select("div.iCIMS_JobsTable > div.row")
            print(f"[{source_name}] {len(job_cards)} cartes d'offres trouvées.")

            for card in job_cards:
                if len(job_postings) >= limit: break

                link_tag = card.select_one("a.iCIMS_Anchor")
                title_tag = card.select_one("h3")
                
                header_divs = card.select("div.header")
                if not link_tag or not title_tag or len(header_divs) < 2:
                    continue

                absolute_link = link_tag["href"]
                title = title_tag.get_text(strip=True)
                
                location = header_divs[0].get_text(strip=True)
                job_id = header_divs[1].get_text(strip=True)
                
                contract_tag = card.select("dt:-soup-contains('Position Type') + dd")
                contract_type = contract_tag[0].get_text(strip=True) if contract_tag else None

                job = JobPosting(
                    id=f"{source_name}_{job_id.replace('-', '_')}",
                    title=title, link=absolute_link, posted=datetime.now(timezone.utc),
                    source=source_name, company=source_name,
                    location=location, contract_type=contract_type
                )
                job_postings.append(job)

        except TimeoutError:
            print(f"[{source_name}] La page ou l'iframe a mis trop de temps à charger.")
        except Exception as e:
            print(f"[{source_name}] Une erreur est survenue: {e}")
        finally:
            browser.close()
    
    print(f"[{source_name}] Fetch terminé. {len(job_postings)} offres récupérées.")
    return job_postings[:limit]