from pydantic import BaseModel
from datetime import datetime

class Job(BaseModel):
    id: str
    title: str
    link: str
    posted: datetime
    source: str          # DB, SG, …
