# Fichier: fetchers/adm.py

import re
from datetime import datetime, timezone
from urllib.parse import urljoin, parse_qs, urlparse

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError, Page

# Assurez-vous que le répertoire parent est dans le PYTHONPATH pour que cette importation fonctionne
# ou ajustez le chemin relatif si nécessaire (from ..models import JobPosting)
from models import JobPosting

BASE_URL = "https://sjobs.brassring.com/TGnewUI/Search/home/HomeWithPreLoad?partnerid=25416&siteid=5429&PageType=searchResults&SearchType=linkquery&LinkID=4393911"


def fetch(limit: int, source_name: str, **kwargs) -> list[JobPosting]:
    """
    Récupère les offres d'emploi pour ADM depuis leur portail carrière (BrassRing).

    Args:
        limit: Le nombre maximum d'offres à récupérer.
        source_name: Le nom de la source (ex: "ADM") à utiliser dans l'objet JobPosting.
        **kwargs: Arguments additionnels (non utilisés ici).

    Returns:
        Une liste d'objets JobPosting.
    """
    job_postings: list[JobPosting] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print(f"[{source_name}] Navigation vers la page carrière...")
            page.goto(BASE_URL, wait_until="networkidle", timeout=60000)

            # NOTE: Si une bannière de cookies apparaît, il faudra ajouter ici le code pour l'accepter.
            # Exemple:
            # try:
            #     page.locator("button_selector_for_cookies").click(timeout=5000)
            # except TimeoutError:
            #     print(f"[{source_name}] Pas de bannière de cookies trouvée ou déjà acceptée.")

            while len(job_postings) < limit:
                print(f"[{source_name}] Analyse de la page. Offres trouvées jusqu'ici: {len(job_postings)}/{limit}")
                # Attendre que les liens des offres soient chargés
                page.wait_for_selector('a.jobtitle[id^="Job_"]', timeout=30000)
                html_content = page.content()
                soup = BeautifulSoup(html_content, "html.parser")

                job_anchors = soup.select('a.jobtitle[id^="Job_"]')
                if not job_anchors:
                    print(f"[{source_name}] Aucun lien d'offre trouvé sur la page.")
                    break

                for anchor in job_anchors:
                    if len(job_postings) >= limit:
                        break

                    title = anchor.get_text(strip=True)
                    relative_link = anchor.get("href")
                    if not relative_link:
                        continue
                    
                    absolute_link = urljoin(BASE_URL, relative_link)

                    # Extraire le jobid pour un ID unique
                    parsed_url = urlparse(absolute_link)
                    query_params = parse_qs(parsed_url.query)
                    job_id = query_params.get("jobid", [None])[0]
                    if not job_id:
                        continue

                    # Les détails (localisation, etc.) sont dans des éléments frères qui suivent l'ancre
                    details = []
                    next_element = anchor.find_next_sibling()
                    while next_element and (not (next_element.name == 'a' and next_element.get('id', '').startswith('Job_'))):
                        if next_element.name == 'div' and 'jobValues' in next_element.get('class', []):
                            p_tag = next_element.find('p', class_='position3')
                            if p_tag:
                                detail_text = p_tag.get_text(strip=True)
                                if detail_text:
                                    details.append(detail_text)
                        next_element = next_element.find_next_sibling()
                    
                    location = ", ".join(details)

                    job = JobPosting(
                        id=f"{source_name}_{job_id}",
                        title=title,
                        link=absolute_link,
                        posted=datetime.now(timezone.utc),  # La date de publication n'est pas disponible
                        source=source_name,
                        company=source_name,
                        location=location,
                    )
                    job_postings.append(job)

                # --- Gestion de la pagination ---
                try:
                    next_button = page.get_by_role('link', name='Next >')
                    is_visible = next_button.is_visible()
                    is_enabled = next_button.is_enabled()

                    if is_visible and is_enabled:
                        print(f"[{source_name}] Clic sur le bouton 'Next >' pour la page suivante.")
                        # Sauvegarder l'ID du premier job pour vérifier que la page a bien changé
                        first_job_on_page_id = page.locator('a.jobtitle[id^="Job_"]').first.get_attribute('id')
                        
                        next_button.click()
                        
                        # Attendre que le contenu se rafraîchisse
                        page.wait_for_function(
                            f"""(expectedId) => {{
                                const firstJob = document.querySelector('a.jobtitle[id^="Job_"]');
                                return firstJob && firstJob.getAttribute('id') !== expectedId;
                            }}""",
                            first_job_on_page_id,
                            timeout=20000
                        )
                    else:
                        print(f"[{source_name}] Le bouton 'Next >' n'est plus visible ou actif. Fin de la pagination.")
                        break
                except TimeoutError:
                    print(f"[{source_name}] Timeout en attendant la page suivante. Fin de la pagination.")
                    break
                except Exception as e:
                    print(f"[{source_name}] Erreur lors de la pagination: {e}. Arrêt.")
                    break

        except TimeoutError:
            print(f"[{source_name}] La page a mis trop de temps à charger (Timeout).")
        except Exception as e:
            print(f"[{source_name}] Une erreur est survenue: {e}")
        finally:
            browser.close()

    print(f"[{source_name}] Fetch terminé. {len(job_postings)} offres récupérées.")
    return job_postings[:limit]