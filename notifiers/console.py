from models import JobPosting

def notify(job: JobPosting):
    """Affiche une alerte simple dans la console pour une nouvelle offre."""
    print(f"\n[ALERTE] Offre trouvée : {job.title}")
    print(f"Lien : {job.link}\n")