# Fichier: notifiers/discord_embed.py (Version finale, propre)

import httpx
from models import JobPosting
from datetime import datetime, timezone

# Dictionnaire centralisé pour les couleurs, facile à maintenir.
BANK_COLORS = {
    "SG": 0xED2939,     # Rouge Société Générale
    "DB": 0x0066ff,     # Bleu Deutsche Bank
    "BNPP": 0x009A4D,   # Vert BNP Paribas
    "CA": 0x00603b,     # Vert Crédit Agricole
    "BPCE": 0x51134a,   # Violet BPCE
    "EDR": 0xfcc500,    # Jaune Edmond de Rothschild
    "HSBC": 0xDB0011,   # Rouge HSBC
    "UBS": 0xCC0000,    # Rouge UBS
    "RBC": 0x0061A8,    # Bleu RBC
    "RCO": 0x0C2B5A,    # Bleu marine Rothschild & Co
    "CIC": 0xE4001B,    # Rouge CIC
    "ODDO": 0x003366,   # Bleu foncé Oddo BHF
    "KC": 0x008A8C,     # Bleu-vert Kepler Cheuvreux
    "BBVA": 0x004481,   # Bleu BBVA
    "MUFG": 0xD90000,   # Rouge MUFG
    "JB": 0x333333,     # Gris Julius Baer
    "LO": 0x002B5A,     # Bleu Lombard Odier
    "ING": 0xFF6600,    # Orange ING
    "BARCLAYS": 0x00AEEF, # Le bleu ciel de Barclays
    "VON": 0x00a5ad,
}
DEFAULT_COLOR = 0x333333 # Une couleur par défaut sobre

def send(job: JobPosting, keyword: str | None = None, webhook_url: str | None = None):
    """
    Envoie un embed Discord pour un JobPosting.
    Utilise une couleur spécifique à la banque et l'URL du webhook.
    """
    if not webhook_url:
        # On garde un log en cas de problème de configuration
        print("[DISCORD] L'URL du webhook n'a pas été fournie. Notification ignorée.")
        return

    posted_date = job.posted or datetime.now(timezone.utc)
    ts_iso = posted_date.isoformat(timespec="seconds")
    color = BANK_COLORS.get(job.source, DEFAULT_COLOR)

    embed = {
        "title": job.title,
        "url": job.link,
        "color": color,
        "timestamp": ts_iso,
        "footer": {"text": f"Source: {job.source}"},
        "fields": [
            # On s'assure que la valeur n'est jamais None pour éviter les erreurs
            {"name": "Entreprise", "value": job.company or 'N/A', "inline": True},
        ]
    }
    
    # On ajoute les champs optionnels seulement s'ils ont une valeur valide
    if job.location:
        embed["fields"].append({"name": "Lieu", "value": job.location, "inline": True})
    
    if job.contract_type:
        embed["fields"].append({"name": "Contrat", "value": job.contract_type.upper(), "inline": True})

    if keyword:
        embed["fields"].append({"name": "Mot-clé", "value": keyword, "inline": True})

    try:
        httpx.post(webhook_url, json={"embeds": [embed]}, timeout=10)
    except httpx.RequestError as e:
        # On log uniquement les erreurs de réseau
        print(f"[DISCORD] Erreur lors de l'envoi de la notification: {e}")