# Fichier: fetchers/imc.py

import json
from datetime import datetime, timezone
from urllib.parse import urljoin

import requests

from models import JobPosting

API_URL = "https://boards-api.greenhouse.io/v1/boards/imc/jobs"
BASE_URL = "https://www.imc.com/us/search-careers/job/"


def fetch(limit: int, source_name: str, **kwargs) -> list[JobPosting]:
    """
    Récupère les offres d'emploi pour IMC Trading directement depuis l'API Greenhouse.
    """
    job_postings: list[JobPosting] = []
    
    try:
        print(f"[{source_name}] Appel de l'API Greenhouse...")
        response = requests.get(API_URL, timeout=15)
        response.raise_for_status()
        
        data = response.json()
        
        print(f"[{source_name}] {len(data.get('jobs', []))} offres brutes trouvées.")

        for job_data in data.get("jobs", []):
            if len(job_postings) >= limit:
                break
            
            job_id = job_data.get("id")
            if not job_id:
                continue

            title = job_data.get("title")
            # Le lien n'est pas dans l'API, on doit le construire
            link = urljoin(BASE_URL, str(job_id))
            
            # La localisation est dans un tableau d'objets
            location_data = job_data.get("location")
            location = location_data.get("name") if location_data else "N/A"
            
            # La date est au format ISO 8601, ex: "2025-08-22T04:30:56-04:00"
            posted_str = job_data.get("updated_at")
            try:
                posted = datetime.fromisoformat(posted_str)
            except (ValueError, TypeError):
                posted = datetime.now(timezone.utc)

            job = JobPosting(
                id=f"{source_name}_{job_id}",
                title=title,
                link=link,
                posted=posted,
                source=source_name,
                company=source_name,
                location=location,
            )
            job_postings.append(job)

    except requests.RequestException as e:
        print(f"[{source_name}] Erreur lors de l'appel à l'API Greenhouse: {e}")
    except Exception as e:
        print(f"[{source_name}] Une erreur est survenue: {e}")

    print(f"[{source_name}] Fetch terminé. {len(job_postings)} offres récupérées.")
    return job_postings[:limit]