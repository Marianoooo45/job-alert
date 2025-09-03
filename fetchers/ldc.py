from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse, parse_qs
import re

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError

from models import JobPosting

BASE_URL = "https://www.ldc.com"
JOBS_URL = "https://www.ldc.com/careers/join-ldc/"

def _try_accept_cookies(page) -> None:
    # On tente plusieurs sélecteurs usuels de CMP
    candidates = [
        "#onetrust-accept-btn-handler",
        "button:has-text('Accept all')",
        "button:has-text('Accept')",
        "button:has-text('Agree')",
        "button:has-text('Accepter')",
        "button[aria-label*='accept' i]",
        "[data-testid*='accept' i]",
    ]
    for sel in candidates:
        try:
            locator = page.locator(sel)
            if locator.first.is_visible(timeout=1500):
                locator.first.click()
                return
        except Exception:
            pass

def fetch(limit: int, source_name: str, **kwargs) -> list[JobPosting]:
    """
    Récupère les offres d'emploi pour Louis Dreyfus Company (LDC).
    Version 6 : viewport mobile + cookies + sélecteurs robustes.
    """
    job_postings: list[JobPosting] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            # Viewport mobile pour rendre visible le bloc '...all-jobs-mobile'
            viewport={"width": 390, "height": 844},
            user_agent=(
                "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) "
                "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
            ),
            locale="en-US",
        )
        page = context.new_page()

        try:
            print(f"[{source_name}] Navigation vers la page carrière…")
            page.goto(JOBS_URL, wait_until="domcontentloaded")

            # Cookies (si présent)
            _try_accept_cookies(page)

            # Attendre que le container des résultats soit attaché (pas forcément visible)
            # On tolère mobile + desktop via un pattern sur les liens de détail.
            print(f"[{source_name}] Attente du chargement initial des offres…")
            page.wait_for_selector(
                "a[href*='/careers/join-ldc/job-details/?id=']",
                state="attached",
                timeout=20000,
            )

            # Déploie toutes les offres si bouton 'Load more jobs' présent
            print(f"[{source_name}] Déploiement de toutes les offres…")
            while True:
                try:
                    load_more = page.get_by_role("button", name=re.compile(r"Load more jobs", re.I))
                    if not load_more.is_visible():
                        break
                    load_more.click()
                    page.wait_for_load_state("networkidle", timeout=10000)
                except TimeoutError:
                    print(f"[{source_name}] Timeout pendant 'Load more'.")
                    break
                except Exception:
                    # Bouton absent / plus de pages
                    break

            print(f"[{source_name}] Toutes les offres affichées (ou pas de pagination). Parsing…")
            html_content = page.content()
            soup = BeautifulSoup(html_content, "html.parser")

            # Sélecteur robuste: tous les liens vers /job-details/?id=...
            job_cards = soup.select("a[href*='/careers/join-ldc/job-details/?id=']")
            print(f"[{source_name}] {len(job_cards)} carte(s) trouvée(s).")

            for card in job_cards:
                if len(job_postings) >= limit:
                    break

                absolute_link = urljoin(BASE_URL, card.get("href", ""))
                if not absolute_link:
                    continue

                parsed_url = urlparse(absolute_link)
                job_id = parse_qs(parsed_url.query).get("id", [None])[0]
                if not job_id:
                    continue

                # Titre : préférer le nœud dédié, sinon fallback sur le texte du lien
                title_tag = card.select_one(".page-search-job__name")
                title = (title_tag.get_text(strip=True) if title_tag
                         else card.get_text(" ", strip=True))

                # Infos (catégorie/contrat/lieu) si présents dans le bloc 'information'
                info_div = card.select_one(".page-search-job__information")
                contract_type = location = None
                if info_div:
                    lines = [ln.strip() for ln in info_div.get_text("\n", strip=True).split("\n") if ln.strip()]
                    # Sur mobile : [Category, Contract, Location]
                    if len(lines) >= 2:
                        contract_type = lines[1]
                    if len(lines) >= 3:
                        location = lines[2]

                job = JobPosting(
                    id=f"{source_name}_{job_id}",
                    title=title,
                    link=absolute_link,
                    posted=datetime.now(timezone.utc),
                    source=source_name,
                    company=source_name,
                    location=location,
                    contract_type=contract_type,
                )
                job_postings.append(job)

        except Exception as e:
            print(f"[{source_name}] Une erreur est survenue: {e}")
        finally:
            context.close()
            browser.close()

    print(f"[{source_name}] Fetch terminé. {len(job_postings)} offres récupérées.")
    return job_postings[:limit]
