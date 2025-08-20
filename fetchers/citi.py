# Citi = Workday wrapper
# Utilise exactement la même logique que fetchers/workday.py
from __future__ import annotations

from .workday import fetch as workday_fetch

def fetch(*, keyword: str = "", hours: int = 360, limit: int = 50, **kwargs):
    """
    Wrap du fetcher Workday pour Citi.
    Paramètres Workday confirmés depuis la page job :
      base    = https://citi.wd5.myworkdayjobs.com
      tenant  = citi
      template= 2
    """
    return workday_fetch(
        base="https://citi.wd5.myworkdayjobs.com",
        tenant="citi",
        template="2",
        source_name="CITI",
        keyword=keyword,
        hours=hours,
        limit=limit,
        **kwargs,
    )
