# Fichier: fetchers/oddo_bhf.py
# Description: Fetcher pour Oddo BHF utilisant l'API HTML cachée avec les bons en-têtes.

from typing import List
from bs4 import BeautifulSoup
from datetime import datetime, timezone
import re
from urllib.parse import urljoin
import httpx

# Imports depuis les modules du projet
from models import JobPosting
from storage.classifier import classify_job, normalize_contract_type

# --- CONSTANTES CORRIGÉES GRÂCE À TON ANALYSE ---
BANK_SOURCE = "ODDO"
BASE_URL = "https://recrutement.altays-progiciels.com" # Le vrai domaine
API_URL = "https://recrutement.altays-progiciels.com/oddo/en/offres.html" # L'URL de l'API HTML

# --- LE DÉGUISEMENT POUR NOTRE SCRIPT ---
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0",
    "Referer": "https://recrutement.altays-progiciels.com/oddo/en/recherche.html",
    "X-Requested-With": "XMLHttpRequest"
}

def fetch(keyword: str, hours: int, limit: int, **bank_args) -> List[JobPosting]:
    print(f"[{BANK_SOURCE}] Démarrage du fetcher (mode API, déguisé)...")
    jobs_list: List[JobPosting] = []
    
    page_num = 1
    
    with httpx.Client(headers=HEADERS, timeout=20) as client:
        while len(jobs_list) < limit:
            print(f"  Fetching page {page_num}...")
            
            try:
                response = client.get(f"{API_URL}?page={page_num}")
                response.raise_for_status()
            except httpx.HTTPStatusError as e:
                print(f"  [ERREUR] Impossible de récupérer la page {page_num}: {e}")
                break

            soup = BeautifulSoup(response.text, "html.parser")
            job_cards = soup.select('li.jobs__detail')

            if not job_cards:
                print("  Plus d'offres trouvées. Arrêt du scraping.")
                break

            for card in job_cards:
                if len(jobs_list) >= limit:
                    break

                title_tag = card.select_one('div.jobs__detail__title a')
                if not title_tag: continue

                title = title_tag.get_text(strip=True)
                relative_url = title_tag.get('href')
                if not all([title, relative_url]): continue

                job_url = urljoin(BASE_URL, relative_url)
                
                match = re.search(r'-(\d+)\.html', job_url)
                if not match: continue
                job_id = f"oddo-{match.group(1)}"

                contract_tag = card.select_one('.badges--color-1')
                contract_raw = contract_tag.get_text(strip=True) if contract_tag else None
                
                location_tag = card.select_one('.badges--color-2')
                location_str = location_tag.get_text(strip=True) if location_tag else None

                contract_type = normalize_contract_type(contract_raw, title)
                category = classify_job(title)

                job = JobPosting(
                    id=job_id, title=title, link=job_url, posted=datetime.now(timezone.utc),
                    source=BANK_SOURCE, company="Oddo BHF", location=location_str,
                    keyword=keyword, category=category, contract_type=contract_type
                )
                jobs_list.append(job)
            
            page_num += 1

    print(f"✅ {BANK_SOURCE}: Successfully processed {len(jobs_list)} jobs.")
    return jobs_list