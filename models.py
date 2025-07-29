# Fichier: models.py

from dataclasses import dataclass
from datetime import datetime

@dataclass
class JobPosting:
    id: str
    title: str
    link: str
    posted: datetime
    source: str
    company: str | None = None
    location: str | None = None
    keyword: str = ""
    category: str = "Autre"
    # ✨ NOUVEAU CHAMP AJOUTÉ
    contract_type: str | None = None

    def __post_init__(self):
        if self.company is None:
            self.company = self.source