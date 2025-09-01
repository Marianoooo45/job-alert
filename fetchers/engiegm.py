# Fichier: fetchers/engiegm.py
# Engie GM scraper – Playwright "locator-first", data-testid stables, pagination robuste (UI5)

from datetime import datetime, timezone
from urllib.parse import urljoin
from locale import setlocale, LC_TIME
from typing import List, Optional

from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
from models import JobPosting

BASE_URL = "https://jobs.engie.com"
JOBS_URL = (
    "https://jobs.engie.com/search/"
    "?createNewAlert=false&q=&locationsearch=&searchResultView=LIST"
    "&markerViewed=&carouselIndex="
    "&facetFilters=%7B%22cust_job_Family%22%3A%5B%22Trading+%2F+Portfolio+Management%22%2C"
    "%22Finance+%2F+Tax+%2F+Insurance%22%5D%7D&pageNumber=0"
)

# Locale pour parsing des dates
try:
    setlocale(LC_TIME, "en_US.UTF-8")
except Exception:
    try:
        setlocale(LC_TIME, "English_United States.1252")
    except Exception:
        print("[ENGIEGM] WARN: Could not set locale for date parsing.")


def parse_engie_date(date_str: Optional[str]) -> datetime:
    if not date_str:
        return datetime.now(timezone.utc)
    s = date_str.strip()
    # Ils exposent "Posting Start Date" au format MM/DD/YY sur le dump
    for fmt in ("%m/%d/%y", "%d/%m/%y", "%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    # fallback
    return datetime.now(timezone.utc)


def _accept_cookies(page) -> None:
    # Plusieurs libellés possibles FR/EN
    candidates = [
        ("button", "Autoriser tous les cookies"),
        ("button", "Tout accepter"),
        ("button", "Allow all cookies"),
        ("button", "Accept all"),
        ("button", "Accept All"),
    ]
    for role, name in candidates:
        try:
            btn = page.get_by_role(role, name=name)
            if btn.count() > 0:
                btn.first.click(timeout=3000)
                return
        except Exception:
            pass


def _set_sort_most_recent(page) -> None:
    """
    Essaie d’ouvrir le sélecteur (UI5) et de choisir 'Most Recent' (ou 'Plus récentes').
    On est tolérant : si ça échoue, on continue sans bloquer.
    """
    try:
        trigger = page.get_by_test_id("selectByTrigger")
        if trigger.count() == 0:
            return
        trigger.first.wait_for(state="visible", timeout=4000)
        # Sur UI5, cliquer sur la "label-root" ou l'icône ouvre la liste
        try:
            trigger.first.click(timeout=3000)
        except Exception:
            trigger.first.locator("svg").first.click(timeout=3000)

        # Options possibles (data-testid = "Most Recent")
        for txt in ["Most Recent", "Plus récentes", "Most recent"]:
            opt = page.get_by_test_id(txt) if txt == "Most Recent" else page.get_by_role("option", name=txt)
            # UI5 expose parfois les options comme <ui5-option data-testid="Most Recent">
            if opt.count() == 0:
                opt = page.get_by_role("listitem", name=txt)
            if opt.count() > 0:
                opt.first.click(timeout=3000)
                break
    except Exception:
        print("[ENGIEGM] INFO: Tri 'Most Recent' non appliqué (UI5 différent ?).")


def _wait_jobs_loaded(page) -> None:
    # Attendre la liste + au moins une carte
    page.wait_for_selector("ul[data-testid='jobCardList'] li[data-testid='jobCard']", timeout=15000)


def _get_text_safe(locator) -> str:
    try:
        if locator.count() > 0:
            return locator.first.inner_text().strip()
    except Exception:
        pass
    return ""


def _go_next_page(page) -> bool:
    """
    Utilise le bouton 'Next' stable: data-testid='goToNextPageBtn'.
    Retourne True si clic + rechargement OK, False si dernière page ou échec.
    """
    try:
        next_btn = page.get_by_test_id("goToNextPageBtn")
        if next_btn.count() == 0:
            return False

        # Vérifie disabled/aria-disabled
        el = next_btn.first
        if el.get_attribute("disabled") is not None:
            return False
        if (el.get_attribute("aria-disabled") or "").lower() == "true":
            return False

        # Clic + attente d’un vrai refresh du DOM
        html_before = page.content()
        el.click(timeout=4000)
        # UI5 rafraîchit via XHR → on attend un changement visible
        page.wait_for_load_state("networkidle", timeout=15000)
        page.wait_for_function(
            "(prev) => document.documentElement.innerHTML.length !== prev.length",
            arg=html_before,
            timeout=10000,
        )
        _wait_jobs_loaded(page)
        return True
    except PWTimeout:
        print("[ENGIEGM] WARN: Timeout sur la pagination Next.")
        return False
    except Exception as e:
        print(f"[ENGIEGM] WARN: Pagination Next impossible: {e}")
        return False


def fetch(limit: int, source_name: str, **kwargs) -> List[JobPosting]:
    job_postings: List[JobPosting] = []
    processed_ids = set()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print(f"[{source_name}] Navigation vers la page carrière…")
            page.goto(JOBS_URL, wait_until="networkidle", timeout=60000)

            # Cookies (si bannière)
            _accept_cookies(page)

            # Tri récent (si dispo)
            _set_sort_most_recent(page)

            page_num = 1
            while len(job_postings) < limit:
                print(f"[{source_name}] Analyse de la page {page_num}…")

                try:
                    _wait_jobs_loaded(page)
                except PWTimeout:
                    print(f"[{source_name}] Aucune offre trouvée sur la page. Fin.")
                    break

                cards = page.locator("ul[data-testid='jobCardList'] li[data-testid='jobCard']")
                count = 0
                try:
                    count = cards.count()
                except Exception:
                    count = 0

                if count == 0:
                    print(f"[{source_name}] 0 carte détectée. Fin.")
                    break

                for i in range(count):
                    if len(job_postings) >= limit:
                        break

                    card = cards.nth(i)
                    try:
                        # Titre + lien (UI5 expose data-testid="jobCardTitle_{index}")
                        title_el = card.locator("[data-testid^='jobCardTitle_']").first
                        if title_el.count() == 0:
                            # fallback ancien sélecteur
                            title_el = card.locator("a.jobCardTitle").first
                        if title_el.count() == 0:
                            continue
                        title = _get_text_safe(title_el)
                        href = title_el.get_attribute("href") or ""

                        # Lieu
                        location_el = card.locator("[data-testid='jobCardLocation']").first
                        location = _get_text_safe(location_el)

                        # Footer (ordre observé sur dump HTML):
                        # [0] Contract, [1] Family, [2] Entity, [3] Posting Start Date, [4] Requisition ID
                        footer_spans = card.locator(
                            "[data-testid='jobCardFooter'] span.JobsList_jobCardFooterValue__Lc--j"
                        )
                        footer_n = footer_spans.count() if footer_spans else 0

                        contract_type = _get_text_safe(footer_spans.nth(0)) if footer_n > 0 else ""
                        posted_txt = _get_text_safe(footer_spans.nth(3)) if footer_n > 3 else ""
                        req_id = _get_text_safe(footer_spans.nth(4)) if footer_n > 4 else ""

                        # Fallback ID: dernier segment de l’URL (e.g. .../48384-en_US)
                        job_id = req_id or (href.split("/")[-1] if href else None)
                        # Nettoie job_id pour enlever le suffixe -en_US si présent
                        if job_id and job_id.endswith("-en_US"):
                            job_id = job_id.replace("-en_US", "")
                        # Si ça reste None → on skip
                        if not job_id or job_id in processed_ids:
                            continue
                        processed_ids.add(job_id)

                        job = JobPosting(
                            id=f"{source_name}_{job_id}",
                            title=title,
                            link=href if href.startswith("http") else urljoin(BASE_URL, href),
                            posted=parse_engie_date(posted_txt),
                            source=source_name,
                            company=source_name,
                            location=location,
                            contract_type=contract_type,
                        )
                        job_postings.append(job)

                    except Exception as e_card:
                        print(f"[{source_name}] WARN: Erreur sur une carte, ignorée: {e_card}")

                if len(job_postings) >= limit:
                    break

                # Pagination via bouton Next
                if not _go_next_page(page):
                    print(f"[{source_name}] Dernière page atteinte.")
                    break

                page_num += 1

        except Exception as e:
            print(f"[{source_name}] Une erreur est survenue: {e}")
        finally:
            try:
                browser.close()
            except Exception:
                pass

    print(f"[{source_name}] Fetch terminé. {len(job_postings)} offres récupérées.")
    return job_postings[:limit]
