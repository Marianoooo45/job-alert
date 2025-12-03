# Fichier: fetchers/nomura.py

from datetime import datetime, timezone
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError

from models import JobPosting

BASE_URL = "https://nomuracampus.tal.net"
JOBS_URL = (
    "https://nomuracampus.tal.net/vx/lang-en-GB/mobile-0/"
    "appcentre-ext/brand-4/xf-3348347fc789/candidate/jobboard/vacancy/1/adv/"
)


def fetch(limit: int, source_name: str, **kwargs) -> list[JobPosting]:
    """
    Récupère les offres d'emploi pour Nomura (plateforme Lumesse TalentLink).

    - Ne lit plus aucune date sur le site (closing date ou autre).
    - Utilise la date/heure du scraping (UTC) comme `posted`.
    """
    job_postings: list[JobPosting] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print(f"[{source_name}] Navigation vers la page carrière...")
            page.goto(JOBS_URL, wait_until="networkidle")

            # Attendre que le tableau des offres soit chargé
            try:
                page.wait_for_selector("table.solr_search_list tbody tr", timeout=15000)
                print(f"[{source_name}] Offres chargées.")
            except TimeoutError:
                print(f"[{source_name}] Aucune offre trouvée sur la page. Arrêt.")
                return []

            html_content = page.content()
            soup = BeautifulSoup(html_content, "html.parser")

            job_rows = soup.select("table.solr_search_list tbody tr.search_res")
            print(f"[{source_name}] {len(job_rows)} offres trouvées.")

            for row in job_rows:
                if len(job_postings) >= limit:
                    break

                job_id = row.get("data-oppid")
                link_tag = row.select_one("a.subject")

                if not job_id or not link_tag or not link_tag.get("href"):
                    continue

                # Lien absolu vers l'offre
                absolute_link = urljoin(BASE_URL, link_tag["href"])
                title = link_tag.get_text(strip=True)

                cells = row.find_all("td")
                if len(cells) < 2:
                    # On veut au moins la colonne "location"
                    continue

                location = cells[1].get_text(strip=True)

                # On ne prend plus aucune date sur le site :
                # on fixe la date de "publication" à la date du scraping.
                posted = datetime.now(timezone.utc)

                job = JobPosting(
                    id=f"{source_name}_{job_id}",
                    title=title,
                    link=absolute_link,
                    posted=posted,
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
