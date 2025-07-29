# Fichier: fetchers/barclays.py
# VERSION DE DEBUG - Phase 1
# Objectif: Sauvegarder le HTML de la page de résultats pour analyse.
# Ce fichier est temporaire et ne retourne aucune offre.

import time
from playwright.sync_api import sync_playwright

URL = "https://search.jobs.barclays/search-jobs"
OUTPUT_FILE = "debug_page_barclays.html"

# On respecte le nom de la fonction attendu par collector.py
def fetch(*, keyword: str = "", hours: int = 48, limit: int = 50, **kwargs) -> list:
    """
    Fonction de debug qui navigue vers Barclays, sauvegarde le HTML et retourne une liste vide.
    """
    print("🚀 [DEBUG Barclays] Lancement du script d'extraction HTML...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
        page = context.new_page()

        try:
            print(f"  Navigating to {URL}...")
            page.goto(URL, wait_until='domcontentloaded', timeout=60000)

            try:
                page.get_by_role("button", name="Accept All").click(timeout=5000)
                print("  Cookies acceptés.")
            except Exception:
                print("  Bandeau de cookies non trouvé.")
            
            print("  Clic sur le bouton de recherche pour afficher les résultats...")
            page.locator(".navigation--submit-button").click()
            
            print("  Attente du chargement des cartes d'offres...")
            page.wait_for_selector('section.jobs-list', timeout=30000)
            
            print("  Pause de 5 secondes...")
            time.sleep(5)

            print("  Récupération du contenu HTML...")
            html_content = page.content()

            with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
                f.write(html_content)
            
            print(f"\n✅ [DEBUG Barclays] SUCCÈS ! Fichier HTML sauvegardé sous : {OUTPUT_FILE}")

        except Exception as e:
            print(f"\n❌ [DEBUG Barclays] ERREUR: {e}")
        finally:
            browser.close()
            print("  Navigateur fermé.")

    # Très important: retourner une liste vide pour que collector.py ne plante pas.
    return []