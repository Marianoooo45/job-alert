# Fichier: fetchers/sanofi.py

from datetime import datetime, timezone
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError

from models import JobPosting

BASE_URL = "https://jobs.sanofi.com"
JOBS_URL = "https://jobs.sanofi.com/fr/recherche-d%27offres?k=&l=&orgIds=2649"


def fetch(limit: int, source_name: str, **kwargs) -> list[JobPosting]:
    """
    Récupère les offres d'emploi pour Sanofi Finance.
    """
    job_postings: list[JobPosting] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print(f"[{source_name}] Navigation vers la page carrière...")
            page.goto(JOBS_URL, wait_until="networkidle")

            # 1. Gérer la bannière de cookies
            try:
                cookie_button = page.get_by_role('button', name='Tout accepter')
                if cookie_button.is_visible(timeout=5000):
                    print(f"[{source_name}] Acceptation des cookies...")
                    cookie_button.click()
            except (TimeoutError, Exception):
                print(f"[{source_name}] Pas de bannière de cookies.")

            # 2. Appliquer le filtre "Finance"
            try:
                print(f"[{source_name}] Application du filtre 'Finance'...")
                page.get_by_role('button', name="Famille d'emplois ").click()
                
                # On attend la réponse réseau qui confirme que le filtre est appliqué
                with page.expect_response("**/recherche-d'offres**", timeout=15000):
                    page.get_by_role('checkbox', name='Finance').check()
                
                print(f"[{source_name}] Filtre 'Finance' appliqué.")
            except Exception as e:
                print(f"[{source_name}] Erreur lors de l'application du filtre: {e}")
                # On ne bloque pas si le filtre échoue, on essaie de scraper quand même

            # 3. Boucle de pagination
            page_num = 1
            while len(job_postings) < limit:
                print(f"[{source_name}] Analyse de la page {page_num}...")
                
                try:
                    page.wait_for_selector("#search-results-list > ul > li > a", timeout=15000)
                except TimeoutError:
                    print(f"[{source_name}] Aucune offre trouvée. Arrêt.")
                    break
                
                html_content = page.content()
                soup = BeautifulSoup(html_content, "html.parser")
                
                job_links = soup.select("#search-results-list > ul > li > a")
                if not job_links:
                    break

                for link_tag in job_links:
                    if len(job_postings) >= limit:
                        break

                    job_id = link_tag.get("data-job-id")
                    if not job_id:
                        continue

                    title = link_tag.select_one("h2").get_text(strip=True)
                    location = link_tag.select_one("span.job-location").get_text(strip=True).replace("Site: ", "")
                    absolute_link = urljoin(BASE_URL, link_tag["href"])

                    job = JobPosting(
                        id=f"{source_name}_{job_id}",
                        title=title,
                        link=absolute_link,
                        posted=datetime.now(timezone.utc), # Date non disponible
                        source=source_name,
                        company=source_name,
                        location=location,
                    )
                    job_postings.append(job)

                if len(job_postings) >= limit:
                    break
                
                try:
                    next_button = page.get_by_role('link', name=' Suivant')
                    if not next_button.is_visible():
                        print(f"[{source_name}] Bouton 'Suivant' non visible. Fin.")
                        break

                    print(f"[{source_name}] Clic sur la page suivante...")
                    next_button.click()
                    page.wait_for_load_state("networkidle", timeout=20000)
                    page_num += 1
                except (TimeoutError, Exception):
                    print(f"[{source_name}] Impossible de trouver la page suivante. Fin.")
                    break

        except TimeoutError:
            print(f"[{source_name}] La page a mis trop de temps à charger (Timeout).")
        except Exception as e:
            print(f"[{source_name}] Une erreur est survenue: {e}")
        finally:
            browser.close()
    
    print(f"[{source_name}] Fetch terminé. {len(job_postings)} offres récupérées.")
    return job_postings[:limit]