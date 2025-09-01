# Fichier: fetchers/ag2r.py (Version 3 - Corrigée et Optimisée)

import re
import time
from datetime import datetime, timezone, timedelta
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError

from models import JobPosting

# MODIFICATION 1: Utilisation de la bonne URL que vous avez fournie.
BASE_URL = "https://www.ag2rlamondiale.fr/recrutement/nos-offres-d-emploi-cdi-cdd-alternance"


def parse_relative_date(date_str: str) -> datetime:
    """
    Convertit une chaîne de date relative (ex: "il y a 2 jours") en objet datetime.
    """
    now = datetime.now(timezone.utc)
    if "aujourd'hui" in date_str.lower():
        return now
    if "hier" in date_str.lower():
        return now - timedelta(days=1)
    
    match = re.search(r'(\d+)\s+jour', date_str)
    if match:
        days_ago = int(match.group(1))
        return now - timedelta(days=days_ago)
    
    match_semaine = re.search(r'(\d+)\s+semaine', date_str)
    if match_semaine:
        weeks_ago = int(match_semaine.group(1))
        return now - timedelta(weeks=weeks_ago)

    return now

def fetch(limit: int, source_name: str, **kwargs) -> list[JobPosting]:
    """
    Récupère les offres d'emploi pour AG2R La Mondiale.
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
                cookie_button = page.get_by_role('listitem', name='Acceptez et fermez')
                if cookie_button.is_visible(timeout=5000):
                    print(f"[{source_name}] Acceptation des cookies...")
                    cookie_button.click()
                    print(f"[{source_name}] Pause de 3 secondes pour la stabilisation de la page...")
                    time.sleep(3)
            except (TimeoutError, Exception):
                print(f"[{source_name}] Pas de bannière de cookies trouvée ou cliquable.")

            # Attendre que les premières offres soient chargées
            try:
                print(f"[{source_name}] Attente du chargement initial des offres...")
                page.wait_for_selector("div#candidatePanel_jobsList > div.card-item", timeout=20000)
                print(f"[{source_name}] Les offres initiales sont bien chargées.")
            except TimeoutError:
                print(f"[{source_name}] Aucune offre n'a pu être chargée initialement. Arrêt.")
                browser.close()
                return []

            # MODIFICATION 2: La boucle s'arrête de cliquer dès que le nombre d'offres
            # affichées sur la page est suffisant.
            while True:
                # On compte combien de cartes sont actuellement visibles sur la page
                visible_cards_count = page.locator("div.card-item").count()
                print(f"[{source_name}] {visible_cards_count} offres visibles sur la page (cible: {limit}).")

                if visible_cards_count >= limit:
                    print(f"[{source_name}] Limite de {limit} offres atteinte ou dépassée. Arrêt du chargement.")
                    break

                try:
                    load_more_button = page.get_by_role('button', name='Charger plus')
                    if not load_more_button.is_visible():
                        print(f"[{source_name}] Le bouton 'Charger plus' n'est plus visible.")
                        break
                    
                    print(f"[{source_name}] Clic sur 'Charger plus'...")
                    load_more_button.click()
                    time.sleep(1.5) # Pause légèrement augmentée pour les appels réseau
                except (TimeoutError, Exception):
                    print(f"[{source_name}] Le bouton 'Charger plus' n'est plus disponible. Fin de la pagination.")
                    break
            
            # Parser le HTML final
            print(f"[{source_name}] Début de l'analyse du HTML final...")
            html_content = page.content()
            soup = BeautifulSoup(html_content, "html.parser")
            
            job_cards = soup.select("div.card-item")
            print(f"[{source_name}] {len(job_cards)} cartes d'offres trouvées pour l'analyse.")

            for card in job_cards:
                if len(job_postings) >= limit:
                    break
                
                title_tag = card.select_one("a.title4.normal")
                id_tag = card.select_one("p.txt-12.cl-darkGrey")

                if not all([title_tag, title_tag.get("href"), id_tag]):
                    continue

                unique_id_text = id_tag.get_text(strip=True)
                job_id_match = re.search(r'([A-Z0-9_-]+)$', unique_id_text)
                job_id = job_id_match.group(1) if job_id_match else unique_id_text.replace(" ", "_")
                unique_id = f"{source_name}_{job_id}"

                if any(j.id == unique_id for j in job_postings):
                    continue
                    
                title = title_tag.get_text(strip=True)
                relative_link = title_tag["href"]
                absolute_link = urljoin(BASE_URL, relative_link)
                
                location = card.select_one("span.icon-locate").get_text(strip=True) if card.select_one("span.icon-locate") else None
                contract_type = card.select_one("span.tag").get_text(strip=True) if card.select_one("span.tag") else None
                posted_str = card.select_one("span.icon-time").get_text(strip=True) if card.select_one("span.icon-time") else ""
                    
                job = JobPosting(
                    id=unique_id,
                    title=title,
                    link=absolute_link,
                    posted=parse_relative_date(posted_str),
                    source=source_name,
                    company=source_name,
                    location=location,
                    contract_type=contract_type
                )
                job_postings.append(job)

        except TimeoutError:
            print(f"[{source_name}] La page a mis trop de temps à charger (Timeout).")
        except Exception as e:
            print(f"[{source_name}] Une erreur est survenue: {e}")
        finally:
            browser.close()

    print(f"[{source_name}] Fetch terminé. {len(job_postings)} offres récupérées.")
    # On s'assure de ne jamais retourner plus que la limite, même si on en a parsé un peu plus.
    return job_postings[:limit]