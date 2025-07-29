# Fichier: storage/load_city_country.py

import csv
import pickle
from pathlib import Path

INPUT_CSV = Path(__file__).parent / "cities.csv"
OUTPUT_PKL = Path(__file__).parent / "city_country.pkl"

city_to_country = {}

with open(INPUT_CSV, newline='', encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        city = row["name"].strip().lower()
        country = row["country_name"].strip()
        if city not in city_to_country:
            city_to_country[city] = country

with open(OUTPUT_PKL, "wb") as f:
    pickle.dump(city_to_country, f)

print(f"{len(city_to_country)} villes enregistrées dans {OUTPUT_PKL}")
