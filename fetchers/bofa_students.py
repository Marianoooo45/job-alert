# Fichier: fetchers/bofa_students.py (Portail Étudiants)

from __future__ import annotations
from datetime import datetime, timezone
from typing import List
from bs4 import BeautifulSoup, Tag
from models import JobPosting
from playwright.sync_api import sync_playwright, Page
from storage.classifier import classify_job, normalize_contract_type

# --- On importe les fonctions de parsing depuis le premier fetcher pour ne pas les dupliquer ! ---
from .bofa_main import _parse_card, _scrape_page

# --- CONSTANTES ---
BANK_SOURCE = "BOFA"
BASE_URL = "https://careers.bankofamerica.com"
SEARCH_PAGE_URL = f"{BASE_URL}/en-us/students/job-search?ref=search&start=0&rows=10&search=getAllJobs"

def fetch(*, keyword: str = "", hours: int = 48, limit: int = 50, **kwargs) -> list[JobPosting]:
    print(f"🚀 Démarrage du fetcher pour {BANK_SOURCE} (Portail Étudiants)...")
    if keyword: return []
    jobs: List[JobPosting] = []
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        context = browser.new_context()
        page = context.new_page()
        try:
            page.goto(SEARCH_PAGE_URL, timeout=90000)
            try:
                page.get_by_role('button', name='Accept', exact=False).click(timeout=10000)
                print("  Cookies acceptés.")
            except Exception: pass
            
            # On réutilise notre fonction de scraping générique
            _scrape_page(page, limit, jobs)
            
        except Exception as e:
            print(f"  ❌ Une erreur critique est survenue: {e}")
        finally:
            browser.close()
    
    print(f"✅ {BANK_SOURCE} (Étudiants): {len(jobs)} offres collectées.")
    return jobs[:limit]