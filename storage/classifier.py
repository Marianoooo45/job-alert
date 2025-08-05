# Fichier: storage/classifier.py (Version 5.2 - Calibration Ultime)

import re
import pickle
from pathlib import Path
from typing import Optional

import spacy
import numpy as np
from langdetect import detect, lang_detect_exception

# --- 1. CHARGEMENT DES MODÈLES (INCHANGÉ) ---
try:
    nlp_fr = spacy.load("fr_core_news_md")
    print("[Classifier] ✅ Modèle expert Français 'fr_core_news_md' chargé.")
except OSError:
    print("[Classifier] ❌ ERREUR: Installer 'fr_core_news_md' via: python -m spacy download fr_core_news_md")
    nlp_fr = None
try:
    nlp_en = spacy.load("en_core_web_md")
    print("[Classifier] ✅ Modèle expert Anglais 'en_core_web_md' chargé.")
except OSError:
    print("[Classifier] ❌ ERREUR: Installer 'en_core_web_md' via: python -m spacy download en_core_web_md")
    nlp_en = None

# --- ON NE NETTOIE PAS LE TITRE ---

# --- CLASSIFICATEUR PAR RÈGLES (LE SCALPEL) - VERSION FINALE ET PRIORISÉE ---
# Ordre des règles revu pour une précision maximale. Les plus spécifiques en premier.
RULE_BASED_CLASSIFICATION = {
    # Priorité 1 : Métiers très spécifiques et non ambigus
    r"\b(rh|ressources humaines|human resources|recruteur|recruiter|payroll|HR|paie)\b": "HR / Ressources Humaines",
    r"\b(juriste|legal counsel|avocat|droit|fiscaliste|fiscalité|lawyer|legal|regulation|contentieux|tax)\b": "Legal / Juridique",
    r"\b(marketing|communication|comms|brand|infographiste|designer|ux|ui|product designer)\b": "Design / Marketing / Comms",
    
    # Priorité 2 : IT et Data, souvent très clairs
    r"\b(developer|logicielles|développeur|informatique|software engineer|fullstack|backend|frontend|devops|cloud|java|infrastructure|cybersécurité|cybersecurity|mainframe|sre|réseau|systems|systèmes|technique|technicien|test|qa|cyber|security|it|mainframe|engineer|application)\b": "IT / Tech",
    r"\b(data|quant|quantitative|quantitatif|modeling|modélisation|machine learning|statisticien|statistique|sql|\bai\b|architect)\b": "Data / Quant",
        
    # Priorité 3 : Fonctions transverses
    r"\b(project manager|chef de projet|chargé de projet|pmo|project|business analyst|functional analyst|innovation)\b": "Project / Business Management",
    r"\b(middle office|middle-office|mid office|back office|back-office|officer|controls|gestionnaire|payments|deposits|operator|operations|operational|reviewer|settlement|settlements|règlement-livraison|support|service manager|lifecycle|custody|production|reconciliation)\b": "Operations",
    
    # Priorité 4 : Finance de Marché et Banque d'Affaires
    r"\b(m&a|merger|acquisition|fusion|lbo|private equity|relationship manager|venture capital|credit analyst|credit analysis|corporate finance|coverage|o&a|origination|financements structurés|structured finance|affaires spéciales|affaires entreprises)\b": "Investment Banking",
    r"\b(trader|trading|distribution|sales trader|institutional sales|sales|structurer|salle de marché|market maker|global market|global markets|fixed income|equity|vendeur|forex|structured products|fx|etf|actions|rates|produit structuré|produits structurés)\b": "Markets",
    
    
    # Priorité 5 : Asset Management et Risques/Conformité
    r"\b(asset management|gérant|portfolio manager|fonds|fund|investment manager|distressed assets)\b": "Asset Management",
    r"\b(risk|risque|risks|risques|conformité|compliance|aml|kyc|lcb-ft|sanctions|financial crime)\b": "Risk / Compliance",
    
    # Priorité 6 : Audit et Contrôle
    r"\b(audit|auditeur|auditing|contrôleur|controller|p&l|auditor|profit and loss|contrôle financier|commissariat aux comptes|inspection|réglementaire|contrôle de gestion)\b": "Audit / Contrôle",

    # Priorité 7 : Banque de détail (attrape-tout pour les postes en agence)
    r"\b(conseiller|chargé de clientèle|banquier privé|private banker|gestion de patrimoine|directeur d'agence|gestionnaire de clientèle|account manager|retail|commercial|chargé d'accueil|chargé d'affaire|commerciale)\b": "Retail Banking / Clientèle",
}

def classify_by_rules(text: str) -> Optional[str]:
    lower_text = text.lower()
    for rule, category in RULE_BASED_CLASSIFICATION.items():
        if re.search(rule, lower_text):
            return category
    return None

# --- L'IA (LE MARTEAU), UTILISÉE EN DERNIER RECOURS ---
CATEGORY_PROFILES = {
    # Profils enrichis pour les cas ambigus
    "Retail Banking / Clientèle": "Conseiller clientèle agence bancaire banque de détail gestion patrimoine commercial account executive",
    "Operations": "Middle office back office post-marché trade support règlement-livraison reporting opérations settlement client service support production specialist reconciliation comptable",
    "Markets": "Finance de marché sales trader trading actions dérivés fixed income equity derivatives recherche research analyst rates structuring",
    "Investment Banking": "Banque d'affaires fusion acquisition M&A corporate finance LBO private equity venture capital deal advisory coverage origination O&A FIG credit analyst",
    "Asset Management": "Gestion d'actifs asset management portfolio manager gérant de portefeuille fonds investissement buy-side wealth management",
    "Audit / Contrôle": "Audit financier externe interne commissariat aux comptes contrôle interne inspection financial audit internal control p&l profit and loss",
    "Risk / Compliance": "Risques de marché crédit opérationnel conformité compliance AML KYC LCB-FT réglementaire market risk credit risk operational risk know your client",
    "Legal / Juridique": "Juriste legal counsel avocat droit des sociétés financier bancaire contrats corporate law fiscal",
    "IT / Tech": "Développeur software engineer fullstack backend frontend web devops cloud infrastructure cybersécurité cybersecurity IT support Akamai WAF test qa cyber forensics security",
    "Data / Quant": "Data scientist analyst engineer machine learning quantitatif modélisation statistiques quantitative modeling SQL AI artificial intelligence data architect visualisation",
    "Project / Business Management": "Chef de projet project manager PMO business analyst functional analyst management",
    "HR / Ressources Humaines": "Recrutement ressources humaines RH talent acquisition HRBP human resources recruiter payroll",
    "Design / Marketing / Comms": "Communication marketing digital brand content designer UX UI comms",
    "VIE": "VIE V.I.E volontariat international entreprise expatriation",
}

CATEGORY_VECTORS_FR = {cat: nlp_fr(prof).vector for cat, prof in CATEGORY_PROFILES.items()} if nlp_fr else {}
CATEGORY_VECTORS_EN = {cat: nlp_en(prof).vector for cat, prof in CATEGORY_PROFILES.items()} if nlp_en else {}

def classify_job(text: str, location: str = "") -> str:
    if not text: return "Autre"
    rule_based_category = classify_by_rules(text)
    if rule_based_category: return rule_based_category
    try: lang = detect(text)
    except lang_detect_exception.LangDetectException: lang = 'en'
    job_vector, target_vectors = (nlp_fr(text.lower()).vector, CATEGORY_VECTORS_FR) if lang == 'fr' and nlp_fr else (nlp_en(text.lower()).vector, CATEGORY_VECTORS_EN) if nlp_en else (None, None)
    if job_vector is None or not job_vector.any() or not target_vectors: return "Autre"
    similarities = {
        cat: np.dot(job_vector, cat_vec) / (np.linalg.norm(job_vector) * np.linalg.norm(cat_vec))
        for cat, cat_vec in target_vectors.items() if np.linalg.norm(cat_vec) > 0
    }
    if not similarities: return "Autre"
    best_category = max(similarities, key=similarities.get)
    if similarities[best_category] < 0.62: return "Autre"
    return best_category

# --- NORMALISATION DU TYPE DE CONTRAT ---
def normalize_contract_type(title: str, raw_text: str | None) -> str:
    combined_text = (f"{raw_text or ''} {title or ''}").lower().replace('-', ' ').replace('_', ' ')
    specific_terms = { 'stage': 'stage', 'internship': 'stage', 'intern': 'stage', 'stagiaire': 'stage', 'alternance': 'alternance', 'apprentissage': 'alternance', 'apprenticeship': 'alternance', 'alternant': 'alternance', 'apprenti': 'alternance', 'work-study': 'alternance', 'cdd': 'cdd', 'contrat à durée déterminée': 'cdd', 'temporary': 'cdd', 'contract': 'cdd', 'freelance': 'freelance', 'indépendant': 'freelance', 'v.i.e': 'vie', 'vie': 'vie' }
    for keyword, standardized_value in specific_terms.items():
        if keyword in combined_text: return standardized_value
    seniority_implies_cdi = { 'analyst', 'associate', 'vp', 'vice president', 'director', 'manager', 'specialist', 'executive', 'officer', 'engineer' }
    for keyword in seniority_implies_cdi:
        if keyword in combined_text: return 'cdi'
    generic_terms = { 'cdi': 'cdi', 'contrat à durée indéterminée': 'cdi', 'permanent': 'cdi', 'regular': 'cdi', 'full time': 'cdi' }
    for keyword, standardized_value in generic_terms.items():
        if keyword in combined_text: return standardized_value
    return "non-specifie"

# --- AUTRES FONCTIONS (INCHANGÉES) ---
try:
    with open(Path(__file__).parent / "city_country.pkl", "rb") as f:
        CITY_COUNTRY = pickle.load(f)
except FileNotFoundError:
    print("[CLASSIFIER] ERREUR: 'city_country.pkl' introuvable.")
    CITY_COUNTRY = {}

def enrich_location(raw_location: str | None) -> str | None:
    if not raw_location: return None
    lower = raw_location.lower()
    for city, country in CITY_COUNTRY.items():
        if city.lower() in lower: return f"{raw_location} ({country})"
    return raw_location