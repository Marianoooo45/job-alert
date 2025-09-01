# Fichier: debug_extractor.py
# Objectif : Outil universel pour extraire le HTML d'une page après interaction.

import sys
from playwright.sync_api import sync_playwright

# --- CONFIGURATION ---
# Pour lancer : python debug_extractor.py "NomDeLaBanque" "https://url.du.site"
if len(sys.argv) != 3:
    print("\nERREUR : Vous devez fournir le nom de la banque et l'URL.")
    print('Exemple: python debug_extractor.py "ADM" "https://sjobs.brassring.com/..."')
    sys.exit(1)

NOM_BANQUE = sys.argv[1]
URL_DES_OFFRES = sys.argv[2]
OUTPUT_FILE = f"debug_page_{NOM_BANQUE}.html"
# --- FIN CONFIGURATION ---

print(f"--- Lancement de l'extraction HTML pour {NOM_BANQUE} ---")

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=False)
    page = browser.new_page()
    try:
        print(f"1. Navigation vers : {URL_DES_OFFRES}")
        page.goto(URL_DES_OFFRES, timeout=90000)
        
        print("\n2. Le navigateur est ouvert. Vous avez la main.")
        print("   >>> ACTION REQUISE <<<")
        print("   - Acceptez les cookies.")
        print("   - Scrollez, cliquez sur 'Load More' / 'Voir plus' si nécessaire.")
        print("   - Attendez que toutes les offres soient bien visibles à l'écran.")
        print("   - Une fois prêt, fermez la fenêtre du navigateur.")
        
        # Le script se met en pause et attend que vous fermiez le navigateur
        page.pause()
        
        print("\n3. Navigateur fermé. Extraction du code HTML final...")
        html_content = page.content()
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            f.write(html_content)
        
        print(f"\n✅ SUCCÈS ! Page sauvegardée dans : {OUTPUT_FILE}")

    except Exception as e:
        print(f"\n❌ ERREUR: {e}")
    finally:
        # On s'assure que le navigateur est bien fermé s'il est toujours ouvert
        if 'browser' in locals() and browser.is_connected():
            browser.close()