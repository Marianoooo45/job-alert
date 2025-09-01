# Fichier: fetchers/amundi.py

from datetime import datetime, timezone
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError

from models import JobPosting

BASE_URL = "https://jobs.amundi.com/offre-de-emploi/liste-offres.aspx"


def fetch(limit: int, source_name: str, **kwargs) -> list[JobPosting]:
    """
    Récupère les offres d'emploi pour Amundi depuis leur portail carrière.
    """
    job_postings: list[JobPosting] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print(f"[{source_name}] Navigation vers la page carrière: {BASE_URL}")
            page.goto(BASE_URL, wait_until="networkidle")

            # 1. Gérer la bannière de cookies
            try:
                cookie_button = page.get_by_role('button', name='Accepter & Fermer: Accepter')
                if cookie_button.is_visible(timeout=5000):
                    print(f"[{source_name}] Acceptation des cookies...")
                    cookie_button.click()
            except (TimeoutError, Exception):
                print(f"[{source_name}] Pas de bannière de cookies trouvée ou cliquable.")

            # 2. Boucle de pagination
            page_num = 1
            while len(job_postings) < limit:
                print(f"[{source_name}] Analyse de la page {page_num}...")
                
                try:
                    page.wait_for_selector("li.ts-offer-list-item", timeout=15000)
                except TimeoutError:
                    print(f"[{source_name}] Aucune offre trouvée sur la page. Arrêt.")
                    break
                
                html_content = page.content()
                soup = BeautifulSoup(html_content, "html.parser")
                
                job_cards = soup.select("li.ts-offer-list-item")
                if not job_cards:
                    break

                for card in job_cards:
                    if len(job_postings) >= limit:
                        break

                    title_link = card.select_one("a.ts-offer-list-item__title-link")
                    ref_span = card.select_one("span[data-reference]")
                    if not title_link or not ref_span:
                        continue

                    job_id = ref_span.get("data-reference")
                    title = title_link.get_text(strip=True)
                    relative_link = title_link.get("href")
                    absolute_link = urljoin(BASE_URL, relative_link)

                    # Les détails sont dans une liste <ul>
                    details_li = card.select("ul.ts-offer-list-item__description > li")
                    details = [li.get_text(strip=True) for li in details_li]

                    contract_type = details[0] if len(details) > 0 else None
                    company_subsidiary = details[1] if len(details) > 1 else source_name
                    # La localisation est parfois éclatée sur 2 <li>
                    location_parts = [part for part in details[2:] if part] # Prend les parties restantes et non vides
                    location = ", ".join(location_parts)

                    job = JobPosting(
                        id=f"{source_name}_{job_id.replace('-', '_')}",
                        title=title,
                        link=absolute_link,
                        posted=datetime.now(timezone.utc), # Date non disponible
                        source=source_name,
                        company=company_subsidiary, # Utilise la filiale si disponible
                        location=location,
                        contract_type=contract_type,
                    )
                    job_postings.append(job)

                if len(job_postings) >= limit:
                    print(f"[{source_name}] Limite de {limit} offres atteinte.")
                    break
                
                # --- Logique de pagination ---
                try:
                    next_button_selector = "#ctl00_ctl00_corpsRoot_corps_Pagination_linkSuivPage"
                    next_button = page.locator(next_button_selector)
                    
                    if not next_button.is_visible():
                        print(f"[{source_name}] Bouton 'Suivant' non visible. Fin de la pagination.")
                        break

                    print(f"[{source_name}] Clic sur 'Page suivante'...")
                    next_button.click()
                    page.wait_for_load_state("networkidle", timeout=20000)
                    page_num += 1
                except TimeoutError:
                    print(f"[{source_name}] Timeout en attendant la page suivante. Fin.")
                    break
                except Exception:
                    print(f"[{source_name}] Bouton 'Suivant' non trouvé. Fin de la pagination.")
                    break

        except TimeoutError:
            print(f"[{source_name}] La page a mis trop de temps à charger (Timeout).")
        except Exception as e:
            print(f"[{source_name}] Une erreur est survenue: {e}")
        finally:
            browser.close()

    print(f"[{source_name}] Fetch terminé. {len(job_postings)} offres récupérées.")
    return job_postings[:limit]