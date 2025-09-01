# Fichier: fetchers/axaim.py (Version 2 - Parsing du Script JS)

import re
import ast
from datetime import datetime, timezone
from urllib.parse import urljoin

from playwright.sync_api import sync_playwright, TimeoutError

from models import JobPosting

BASE_URL = "https://jobs.axa/careersection/axa_im_external/joblist.ftl"
JOB_DETAIL_URL = "https://jobs.axa/careersection/axa_im_external/jobdetail.ftl"


def fetch(limit: int, source_name: str, **kwargs) -> list[JobPosting]:
    """
    Récupère les offres d'emploi pour AXA IM en parsant les données JS (Taleo).
    """
    job_postings: list[JobPosting] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print(f"[{source_name}] Navigation vers la page carrière: {BASE_URL}")
            page.goto(BASE_URL, wait_until="networkidle")

            # Gérer la bannière de cookies
            try:
                cookie_button = page.get_by_role('button', name='Tout refuser')
                if cookie_button.is_visible(timeout=5000):
                    print(f"[{source_name}] Refus des cookies...")
                    cookie_button.click()
            except (TimeoutError, Exception):
                print(f"[{source_name}] Pas de bannière de cookies trouvée.")

            page_num = 1
            while len(job_postings) < limit:
                print(f"[{source_name}] Analyse de la page {page_num}...")
                
                # Attendre un élément stable de la page pour s'assurer qu'elle est prête
                page.wait_for_selector('#requisitionListInterface', timeout=20000)
                
                html_content = page.content()
                
                # Expression régulière pour trouver le bloc de données des offres dans le script
                match = re.search(r"api\.fillList\('requisitionListInterface', 'listRequisition', (\[.*?\])\);", html_content, re.DOTALL)
                
                if not match:
                    print(f"[{source_name}] Impossible de trouver les données des offres dans le script. Fin.")
                    break

                # Le groupe 1 contient la liste sous forme de chaîne de caractères
                data_string = match.group(1)
                
                try:
                    # ast.literal_eval est plus sûr que eval() pour interpréter une structure de données Python
                    job_data_list = ast.literal_eval(data_string)
                except (ValueError, SyntaxError):
                    print(f"[{source_name}] Erreur lors du parsing des données JS.")
                    break

                # La structure de Taleo est un grand tableau plat. Chaque offre occupe un certain nombre d'éléments.
                # En analysant le script, chaque offre est représentée par 31 éléments.
                chunk_size = 31
                for i in range(0, len(job_data_list), chunk_size):
                    if len(job_postings) >= limit: break
                    
                    chunk = job_data_list[i : i + chunk_size]
                    
                    if len(chunk) < chunk_size: continue

                    # Indices basés sur votre analyse du script
                    requisition_id = chunk[3]
                    title = chunk[4]
                    job_id = chunk[12]
                    location = chunk[13]
                    
                    # On construit le lien manuellement
                    link = f"{JOB_DETAIL_URL}?job={requisition_id}"

                    job = JobPosting(
                        id=f"{source_name}_{job_id}",
                        title=title,
                        link=link,
                        posted=datetime.now(timezone.utc), # Date non fiable dans le script
                        source=source_name,
                        company=source_name,
                        location=location,
                    )
                    job_postings.append(job)

                if len(job_postings) >= limit:
                    print(f"[{source_name}] Limite de {limit} offres atteinte.")
                    break

                # Pagination
                try:
                    next_button = page.get_by_role('link', name='Next')
                    if not next_button.is_visible():
                        print(f"[{source_name}] Bouton 'Next' non visible. Fin de la pagination.")
                        break

                    print(f"[{source_name}] Clic sur 'Next'...")
                    next_button.click()
                    page.wait_for_load_state("networkidle", timeout=20000)
                    page_num += 1
                except (TimeoutError, Exception):
                    print(f"[{source_name}] Bouton 'Next' non cliquable ou timeout. Fin.")
                    break
        except Exception as e:
            print(f"[{source_name}] Une erreur est survenue: {e}")
        finally:
            browser.close()
            
    print(f"[{source_name}] Fetch terminé. {len(job_postings)} offres récupérées.")
    return job_postings[:limit]