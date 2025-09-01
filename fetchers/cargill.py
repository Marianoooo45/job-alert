# Fichier: fetchers/cargill.py (Version 9 - Pagination Robuste)

from datetime import datetime, timezone
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError

from models import JobPosting

BASE_URL = "https://careers.cargill.com"
JOBS_URL = "https://careers.cargill.com/en/search-jobs"


def fetch(limit: int, source_name: str, **kwargs) -> list[JobPosting]:
    """
    Récupère les offres d'emploi pour Cargill, avec une pagination réseau robuste.
    """
    job_postings: list[JobPosting] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(permissions=[])
        page = context.new_page()

        try:
            print(f"[{source_name}] Navigation vers la page carrière...")
            page.goto(JOBS_URL, wait_until="domcontentloaded", timeout=60000)
            page.wait_for_selector('button:has-text("Category")', timeout=30000)
            print(f"[{source_name}] Page principale chargée.")

            try:
                accept_button = page.get_by_role('button', name='Accept all cookies')
                if accept_button.is_visible(timeout=5000):
                    print(f"[{source_name}] Acceptation des cookies...")
                    accept_button.click()
                    page.wait_for_timeout(1000)
            except (TimeoutError, Exception):
                print(f"[{source_name}] Pas de bannière de cookies à accepter.")

            # Appliquer les filtres
            try:
                print(f"[{source_name}] Application des filtres de catégorie...")
                with page.expect_response("**/search-jobs/results**", timeout=20000) as response_info:
                    page.get_by_role('button', name='Category').click()
                    page.get_by_label('Search Filter').get_by_text('FINANCE').click()
                    page.get_by_label('Category', exact=True).get_by_text('FINANCIAL MARKETS').click()
                    page.get_by_label('Search Filter').get_by_text('TRADE EXECUTION').click()
                    page.get_by_label('Search Filter').get_by_text('TRADING').click()
                response = response_info.value
                print(f"[{source_name}] Résultats AJAX reçus (Status: {response.status}).")
            except Exception as e:
                print(f"[{source_name}] Erreur lors de l'application des filtres: {e}")
                return []

            # Boucle de pagination
            page_num = 1
            while len(job_postings) < limit:
                print(f"[{source_name}] Analyse de la page {page_num}...")
                
                page.wait_for_selector("section#search-results-list", timeout=10000)
                html_content = page.content()
                soup = BeautifulSoup(html_content, "html.parser")
                
                job_links = soup.select("section#search-results-list li a")
                if not job_links and page_num == 1:
                    print(f"[{source_name}] Aucun résultat trouvé pour les filtres. Fin.")
                    break
                elif not job_links:
                    print(f"[{source_name}] Plus d'offres à analyser.")
                    break

                for link_tag in job_links:
                    if len(job_postings) >= limit: break
                    relative_link = link_tag["href"]
                    absolute_link = urljoin(BASE_URL, relative_link)
                    job_id = link_tag.get("data-job-id", relative_link.split('/')[-1])
                    title = link_tag.select_one("h3").get_text(strip=True)
                    location = link_tag.select_one("span.job-location").get_text(strip=True)
                    
                    job = JobPosting(
                        id=f"{source_name}_{job_id}", title=title, link=absolute_link,
                        posted=datetime.now(timezone.utc), source=source_name, 
                        company=source_name, location=location
                    )
                    job_postings.append(job)

                if len(job_postings) >= limit: break
                
                # ==================== MODIFICATION CLÉ : Pagination Robuste ====================
                try:
                    next_button = page.get_by_role('link', name='Next')
                    if not next_button.is_visible():
                        print(f"[{source_name}] Bouton 'Next' non visible. Fin.")
                        break

                    print(f"[{source_name}] Clic sur 'Next'...")
                    # On attend la réponse réseau de la page suivante, comme pour les filtres
                    with page.expect_response("**/search-jobs/results**", timeout=20000) as response_info:
                        next_button.click()
                    
                    response = response_info.value
                    print(f"[{source_name}] Page {page_num + 1} chargée (Status: {response.status}).")
                    page_num += 1
                except (TimeoutError, Exception):
                    print(f"[{source_name}] Impossible de passer à la page suivante. Fin.")
                    break
                # ===========================================================================

        except Exception as e:
            print(f"[{source_name}] Une erreur est survenue: {e}")
        finally:
            page.close()
            context.close()
            browser.close()

    print(f"[{source_name}] Fetch terminé. {len(job_postings)} offres récupérées.")
    return job_postings[:limit]