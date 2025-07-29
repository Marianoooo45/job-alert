# Fichier: install_browsers.py (Version 2 - Robuste avec subprocess)
# Objectif: Forcer l'installation et capturer 100% de la sortie.

import subprocess
import sys

print("--- Début du script d'installation (méthode subprocess) ---")

# On s'assure d'utiliser le python de l'environnement virtuel actuel
# pour lancer le module playwright. C'est la méthode la plus fiable.
command = [sys.executable, "-m", "playwright", "install", "--with-deps"]

print(f"Exécution de la commande : {' '.join(command)}")

try:
    # On lance la commande comme un processus séparé et on attend qu'elle se termine.
    # capture_output=True va récupérer tout ce que la commande affiche.
    result = subprocess.run(
        command, 
        capture_output=True, 
        text=True,  # Pour avoir la sortie en format texte
        check=False # On ne lève pas d'exception pour pouvoir analyser la sortie nous-mêmes
    )

    print("\n--- La commande est terminée. Analyse de la sortie : ---")
    
    print("\n--- Sortie Standard (stdout) ---")
    print(result.stdout if result.stdout else "Aucune sortie standard.")

    print("\n--- Erreurs (stderr) ---")
    print(result.stderr if result.stderr else "Aucune erreur standard.")

    if result.returncode == 0 and result.stdout:
         print("\n✅ SUCCÈS ! L'installation semble avoir réussi. Les navigateurs devraient être prêts.")
    else:
         print("\n❌ ÉCHEC. L'installation n'a pas abouti. Veuillez copier-coller TOUTE la sortie ci-dessus.")

except FileNotFoundError:
    print("\n!!! ERREUR CRITIQUE !!!")
    print(f"Python n'arrive pas à trouver l'exécutable : '{sys.executable}'")
    print("Il y a un problème fondamental avec votre environnement virtuel.")
except Exception as e:
    print(f"\n!!! UNE ERREUR PYTHON INATTENDUE S'EST PRODUITE !!!")
    import traceback
    traceback.print_exc()