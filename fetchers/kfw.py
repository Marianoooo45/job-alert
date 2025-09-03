# Fichier: fetchers/kfw.py (Version Finale — Cookies DE puis EN via "de - Deutsch - Sprache" / "English - Englisch")

from datetime import datetime, timezone
from urllib.parse import urljoin
from locale import setlocale, LC_TIME
import re

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError

from models import JobPosting

BASE_URL = "https://jobs.kfw.de"
JOBS_URL = "https://jobs.kfw.de/index.php?ac=search_result&search_criterion_channel%5B%5D=12&btn_dosearch="

try:
    setlocale(LC_TIME, 'en_US.UTF-8')
except:
    try:
        setlocale(LC_TIME, 'English_United States.1252')
    except:
        print("[KFW] WARN: Could not set locale for English date parsing.")

# ------------------------------- Utils -------------------------------

def parse_kfw_date(date_str: str) -> datetime:
    """
    Supporte EN ('9/2/25' ou '09/02/2025') et DE ('02.09.25' ou '02.09.2025').
    """
    if not date_str:
        return datetime.now(timezone.utc)
    s = date_str.strip()
    for fmt in ('%m/%d/%y', '%m/%d/%Y', '%d.%m.%y', '%d.%m.%Y'):
        try:
            return datetime.strptime(s, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    m = re.search(r'(\d{1,2})[./](\d{1,2})[./](\d{2,4})', s)
    if m:
        a, b, y = m.groups()
        y = int(y)
        if y < 100:
            y += 2000 if y < 70 else 1900
        if '.' in s:  # DE format
            day, month = int(a), int(b)
        else:         # EN format
            month, day = int(a), int(b)
        try:
            return datetime(y, month, day, tzinfo=timezone.utc)
        except Exception:
            pass
    return datetime.now(timezone.utc)

def _try_click(loc, timeout=5000) -> bool:
    """Try clicking a locator if it exists and is visible."""
    try:
        loc.wait_for(state="visible", timeout=timeout)
        loc.scroll_into_view_if_needed()
        loc.click()
        return True
    except Exception:
        return False

def wait_for_results_rows(page, timeout=20000):
    """Attendre qu’il y ait au moins une ligne d’offre dans le tableau."""
    page.wait_for_load_state("domcontentloaded", timeout=timeout)
    page.wait_for_function(
        "document.querySelectorAll('tbody.jb-dt-list-body tr').length > 0",
        timeout=timeout
    )

def get_first_row_key(page) -> str:
    """Clé de la première ligne pour détecter un changement après pagination."""
    try:
        first = page.locator("tbody.jb-dt-list-body tr").first
        first.wait_for(state="visible", timeout=4000)
        href = first.locator("td a").first.get_attribute("href") or ""
        title = first.locator("td").first.inner_text(timeout=300) or ""
        return (href + "|" + title).strip()
    except Exception:
        return ""

def _ui_is_english(page) -> bool:
    try:
        if page.get_by_role("button", name=re.compile(r"Next page", re.I)).is_visible():
            return True
    except Exception:
        pass
    try:
        return bool(page.evaluate("() => (document.documentElement.lang || '').toLowerCase().startsWith('en')"))
    except Exception:
        return False

# -------------------------- Cookies & Langue -------------------------

def accept_cookies_de(page) -> bool:
    """
    Clique sur 'Annehmen und schließen' (ou variantes DE/EN) AVANT de changer la langue.
    """
    print("[KFW] Acceptation des cookies (DE) ...")
    names = [
        "Annehmen und schließen",
        re.compile(r"Alle akzeptieren", re.I),
        re.compile(r"Akzeptieren", re.I),
        re.compile(r"Zustimmen", re.I),
        re.compile(r"Zustimmen.*schließen", re.I),
        # si le CMP est déjà en EN pour une raison obscure
        re.compile(r"Accept( and close| all)?", re.I),
    ]

    # direct page
    for name in names:
        try:
            btn = page.get_by_role("button", name=name)
            if _try_click(btn, timeout=7000 if name == "Annehmen und schließen" else 2000):
                page.wait_for_timeout(300)
                print(f"[KFW] Cookies acceptés via: {name if isinstance(name, str) else name.pattern}")
                return True
        except Exception:
            continue

    # iframes CMP
    try:
        for frame in page.frames:
            if any(k in (frame.url or "") for k in ["sp_message_iframe", "consent", "onetrust"]):
                for name in names:
                    try:
                        btn = frame.get_by_role("button", name=name)
                        if _try_click(btn, timeout=3000):
                            page.wait_for_timeout(300)
                            print(f"[KFW] Cookies acceptés (iframe) via: {name if isinstance(name, str) else name.pattern}")
                            return True
                    except Exception:
                        continue
    except Exception:
        pass

    print("[KFW] Aucun bouton cookies cliquable trouvé (peut-être déjà accepté).")
    return False

def switch_to_english_after_cookies(page) -> bool:
    """
    Flow EXACT de l’Inspector:
      - bouton:  'de - Deutsch - Sprache'
      - lien:    'English - Englisch'
    Avec fallbacks classiques si libellés changent.
    """
    print("[KFW] Switch EN après cookies ...")

    # 1) Ouvrir le switcher (priorité à 'de - Deutsch - Sprache')
    openers = [
        page.get_by_role("button", name="de - Deutsch - Sprache"),
        page.get_by_role("button", name=re.compile(r"(Sprache auswählen|Select language|Deutsch - Sprache|language)", re.I)),
        page.locator("button[aria-label*='Sprache'], button[aria-label*='language']"),
    ]
    opened = any(_try_click(op, timeout=6000) for op in openers)
    if not opened:
        print("[KFW] Impossible d’ouvrir le sélecteur de langue.")
        return False

    # 2) Choisir l’entrée 'English - Englisch' (prioritaire), puis fallbacks
    options = [
        page.get_by_role("link", name="English - Englisch"),
        page.get_by_role("option", name="English"),
        page.get_by_text(re.compile(r"^\s*English\s*$", re.I)).first,
        page.locator("li:has-text('English')"),
        page.get_by_role("link", name=re.compile(r"English", re.I)),
    ]
    selected = any(_try_click(opt, timeout=6000) for opt in options)
    if not selected:
        print("[KFW] Option 'English - Englisch' introuvable.")
        return False

    # 3) Attendre des signaux UI anglais (sans networkidle)
    try:
        page.wait_for_function(
            "() => (document.documentElement.lang || '').toLowerCase().startsWith('en')",
            timeout=8000
        )
    except Exception:
        pass

    try:
        page.get_by_role("button", name=re.compile(r"Next page", re.I)).wait_for(state="visible", timeout=8000)
    except Exception:
        pass

    # fallback: forcer un render si la SPA a chargé mais pas réaffiché
    if not _ui_is_english(page):
        page.reload(wait_until="domcontentloaded")
    # attendre des lignes d’offres quoi qu’il arrive
    wait_for_results_rows(page, timeout=15000)

    ok = _ui_is_english(page)
    print(f"[KFW] UI anglaise détectée: {ok}")
    return ok

# ------------------------------ Fetch -------------------------------

def fetch(limit: int, source_name: str, **kwargs) -> list[JobPosting]:
    job_postings: list[JobPosting] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)  # laisser False pour debug visuel
        page = browser.new_page()
        page.set_default_timeout(30000)
        page.set_default_navigation_timeout(30000)

        try:
            print(f"[{source_name}] Navigation vers la page carrière...")
            page.goto(JOBS_URL, wait_until="domcontentloaded", timeout=30000)

            # --- 1) COOKIES EN ALLEMAND ---
            try:
                accepted = accept_cookies_de(page)
                if not accepted:
                    print(f"[{source_name}] Cookie banner non trouvé / déjà géré.")
            except Exception as e:
                print(f"[{source_name}] Erreur accept_cookies_de: {e}")

            # --- 2) SWITCH ENGLISH EXACT (Inspector flow) ---
            try:
                switched = switch_to_english_after_cookies(page)
                if not switched:
                    print(f"[{source_name}] Switch EN non garanti, on continue quand même.")
            except Exception as e:
                print(f"[{source_name}] Erreur switch_to_english_after_cookies: {e}")

            # --- 3) WAITS MÉTIER ---
            try:
                wait_for_results_rows(page, timeout=20000)
            except Exception:
                # soft refresh si la SPA a chargé sans rendre
                page.reload(wait_until="domcontentloaded")
                wait_for_results_rows(page, timeout=15000)

            page_num = 1
            while len(job_postings) < limit:
                print(f"[{source_name}] Analyse de la page {page_num}...")

                try:
                    page.wait_for_selector("tbody.jb-dt-list-body tr", timeout=15000)
                except TimeoutError:
                    print(f"[{source_name}] Aucune offre trouvée. Arrêt.")
                    break

                html_content = page.content()
                soup = BeautifulSoup(html_content, "html.parser")

                job_rows = soup.select("tbody.jb-dt-list-body tr")
                if not job_rows:
                    break

                for row in job_rows:
                    if len(job_postings) >= limit:
                        break

                    cells = row.find_all("td")
                    if len(cells) < 4:
                        continue

                    link_tag = cells[0].find("a")
                    if not link_tag or not link_tag.get("href"):
                        continue

                    job_id = row.get("data-jobad-id")
                    time_tag = cells[3].find("time")

                    job = JobPosting(
                        id=f"{source_name}_{job_id}",
                        title=link_tag.get_text(strip=True),
                        link=urljoin(BASE_URL, link_tag["href"]),
                        posted=parse_kfw_date(time_tag.get_text(strip=True) if time_tag else ""),
                        source=source_name,
                        company=source_name,
                        location=cells[1].get_text(strip=True).replace("\n", " "),
                    )
                    job_postings.append(job)

                if len(job_postings) >= limit:
                    break

                # --- 4) PAGINATION (attendre un vrai changement de contenu) ---
                try:
                    before_key = get_first_row_key(page)

                    # EN first (tu veux l’UI anglaise), DE en fallback
                    next_locators = [
                        "#pagination-container-top button:has-text('Next page')",   # EN
                        "#pagination-container-top [role='button']:has-text('Next')",
                        "#pagination-container-top button:has-text('Nächste Seite')",  # DE fallback
                        "#pagination-container-top [role='button']:has-text('Weiter')",
                        "nav[aria-label='pagination'] button:has-text('Next')",
                        "nav[aria-label='pagination'] button:has-text('Nächste')",
                    ]
                    clicked_next = False
                    for sel in next_locators:
                        if _try_click(page.locator(sel)):
                            clicked_next = True
                            break

                    if not clicked_next:
                        print(f"[{source_name}] Bouton 'Next page' non visible. Fin.")
                        break

                    page.wait_for_function(
                        """(prev) => {
                            const first = document.querySelector('tbody.jb-dt-list-body tr');
                            if (!first) return false;
                            const a = first.querySelector('td a');
                            const href = a ? a.getAttribute('href') : '';
                            const title = first.querySelector('td')?.textContent?.trim() || '';
                            return (href + '|' + title).trim() !== prev;
                        }""",
                        arg=before_key,
                        timeout=20000,
                    )
                    page_num += 1
                except (TimeoutError, Exception) as e:
                    print(f"[{source_name}] Pagination stoppée: {e}")
                    break

        except Exception as e:
            print(f"[{source_name}] Une erreur est survenue: {e}")
        finally:
            browser.close()

    print(f"[{source_name}] Fetch terminé. {len(job_postings)} offres récupérées.")
    return job_postings[:limit]
