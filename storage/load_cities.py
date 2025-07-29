import csv
from pathlib import Path
import pickle

def build_city_country_map(csv_path: Path, out_path: Path, min_population: int = 10000):
    mapping = {}
    with csv_path.open(encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if int(row.get("population", "0")) < min_population:
                continue
            city = row["name"].strip().lower()
            country = row["country_name"].strip()
            mapping[city] = country
    with out_path.open("wb") as f:
        pickle.dump(mapping, f)
    print(f"✅ {len(mapping)} villes chargées dans {out_path}")

if __name__ == "__main__":
    csv_path = Path(__file__).parent / "../csv/cities.csv"
    out_path = Path(__file__).parent / "city_country.pkl"
    build_city_country_map(csv_path, out_path)
