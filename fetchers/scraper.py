# Fichier: fetchers/scraper.py (VERSION AMÉLIORÉE AVEC LOG D'URL)
import json
from playwright.sync_api import Page

def scrape_page_for_structured_data(page: Page, page_url: str | None = None) -> dict:
    """
    Cherche un script JSON-LD. Logue l'URL en cas d'absence de données
    ou d'erreur pour faciliter le débogage.
    """
    details = {"location": None, "contract_type": None}
    
    # On crée une chaîne de log préfixée pour éviter la répétition
    log_prefix = f" pour l'URL: {page_url}" if page_url else ""

    try:
        ld_json_element = page.query_selector('script[type="application/ld+json"]')
        
        if ld_json_element:
            # Pour un succès, le log n'est pas forcément nécessaire, mais on peut le garder pour être exhaustif
            # print(f"[Scraper] ✅ JSON-LD trouvé{log_prefix}")
            json_text = ld_json_element.inner_text()
            data = json.loads(json_text)
            
            details["contract_type"] = data.get("employmentType")
            
            job_location = data.get("jobLocation", {}).get("address", {})
            if job_location:
                city = job_location.get("addressLocality")
                country = job_location.get("addressCountry")
                if city and country:
                    details["location"] = f"{city}, {country}"
        else:
            # --- AMÉLIORATION DU LOG ---
            print(f"[Scraper] ⚠️ Avertissement: Pas de données structurées (JSON-LD) trouvées{log_prefix}")

    except Exception as e:
        # --- AMÉLIORATION DU LOG ---
        print(f"[Scraper] ❌ ERREUR inattendue lors du traitement du JSON-LD{log_prefix}. Erreur: {e}")
    
    return details