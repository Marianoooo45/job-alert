# api/main.py
from fastapi import FastAPI, Query
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

from storage.sqlite_repo import list_all  # notre fonction filtrante

app = FastAPI(title="Job Alert API")

class Job(BaseModel):
    id: str
    title: str
    link: str
    posted: datetime
    source: str

@app.get("/ping")
def ping():
    return {"message": "pong"}

@app.get("/jobs", response_model=List[Job])
def jobs(
    bank: Optional[str]   = Query(None, description="DB ou SG"),
    keyword: Optional[str]= Query(None, description="Mot-clé à chercher dans le titre"),
    hours: Optional[int]  = Query(None, description="Annonces publiées depuis moins de X heures"),
):
    """
    Renvoie les offres stockées, filtrées par banque, mot-clé et fraîcheur.
    Si un paramètre est omis, on ne filtre pas dessus.
    """
    rows = list_all(hours=hours, bank=bank, keyword=keyword)
    return [Job(**r._asdict()) for r in rows]
