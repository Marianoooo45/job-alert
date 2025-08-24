# Fichier: storage/classifier.py

from __future__ import annotations
import re
import pickle
import unicodedata
from pathlib import Path
from typing import Optional
import html


# -------------------------------------------------------------
# Utils
# -------------------------------------------------------------

def strip_accents(text: str) -> str:
    if not text:
        return ""
    return "".join(ch for ch in unicodedata.normalize("NFD", text) if unicodedata.category(ch) != "Mn")


def prep_text(text: str) -> str:
    if not text:
        return ""
    text = html.unescape(text)
    text = strip_accents(text).lower()
    return text

# --- NEW: normalisation légère pour tolérer les variantes de genre/slash ---
_GENDER_SLASH_FIX = re.compile(r"\((?:h/?f|f/?h|e|ere|rice)\)")
_SLASH_FEM_FIX   = re.compile(r"([a-z]{3,})/[a]")  # ex: banquero/a -> banqueroa

def _soft_normalize(text: str) -> str:
    if not text:
        return ""
    t = prep_text(text)
    t = _GENDER_SLASH_FIX.sub("", t)
    t = _SLASH_FEM_FIX.sub(r"\1a", t)
    return t

# -------------------------------------------------------------
# SPECIAL RULE GM/S&T (prudente) — interns/graduates uniquement
# -------------------------------------------------------------

_SPECIAL_GM_ST_REGEX = (
    r"(?!.{0,120}\b("
    r"capital\s+markets?|ecm\b|dcm\b|investment\s+banking|internal\s+audit|audit|risk|treasury|alm|"
    r"corporate\s+banking|cash\s+management|transaction\s+banking|\bcoverage(?!\s*markets)|"
    r"data\s+(?:analyst|scientist|engineer)|\bstrats?\b|quantitative\s+strats?|strategists?|"
    r"support|help\s*desk|l1|application\s+support|prod(?:uction)?\s+support|technology|tech\b|it\b"
    r")\b)"
    r"\b(?:"
      r"(?:\bintern(?!al)\b|internship|off[-\s]?cycle|industrial\s+placement|\bsummer\s+analyst\b|\bgraduate\b|placement|\bstage\b(?!\s*[ivx]+\b))"
      r"[\s\S]{0,40}?"
      r"(?:\bglobal\s+markets?\b|\bsales\s*&\s*trading\b|\bsales\s+and\s+trading\b|\bs&?t\b|\bficc\b|"
      r"\bfx\b|\brates?\b|\bcredit\b|\bequities?\s+(?:sales|trading)\b|\bderivatives?\s+(?:sales|trading)\b)"
    r"|"
      r"(?:\bglobal\s+markets?\b|\bsales\s*&\s*trading\b|\bsales\s+and\s+trading\b|\bs&?t\b|\bficc\b)"
      r"[\s\S]{0,40}?"
      r"(?:\bintern(?!al)\b|internship|off[-\s]?cycle|industrial\s+placement|\bsummer\s+analyst\b|\bgraduate\b|placement|\bstage\b(?!\s*[ivx]+\b))"
    r")\b"
)

# -------------------------------------------------------------
# MANUAL OVERRIDES (avant toutes les règles)
# -------------------------------------------------------------

MANUAL_OVERRIDES: list[tuple[str, str]] = [
    # Cas remontés — on **redirige** vers une vraie catégorie Admin/EA
    (r"\bglobal\s+markets?\b.{0,20}\bexecutive\s+assistant\b", "Administrative / Executive Assistant"),
    (r"\bmarkets?\s+ea\b", "Administrative / Executive Assistant"),  # EA = Executive Assistant
    (r"\bexecutive\s+assistant\b.{0,20}\b(global\s+)?markets?\b", "Administrative / Executive Assistant"),
]


# -------------------------------------------------------------
# REGLES — ordre = cascade (base existante)
# -------------------------------------------------------------

RULE_BASED_CLASSIFICATION: dict[str, str] = {
    # ---------- GARDE-FOUS ----------
    r"\btrade\b(?!r|ing)\b.{0,20}\b(transaction|services?|processing|operations?|ops?|operator|analyst|control|support)\b": "Operations — Middle Office",
    r"\b(transaction|services?|processing|operations?|ops?|operator|analyst|control|support)\b.{0,20}\btrade\b(?!r|ing)\b": "Operations — Middle Office",

    # ---------- GM early-career ----------
    r"\bglobal\s+markets?\b(?:(?!executive|assistant|ea|product\s+control|operations?|murex|support)[\s\w]{0,40})\b(analyst|intern(?:ship)?|off[-\s]?cycle|industrial\s+placement|summer|graduate)\b": "Markets — Sales",
    _SPECIAL_GM_ST_REGEX: "Markets — Sales",

    # ---------- INSIGHT WEEK / GTP / PROGRAMMES ----------
    r"\binsight\s+week\b.{0,40}\b(tech|technology|engineering|software|data|cyber|it|et[r]?ading)\b": "IT / Engineering",
    r"\binsight\s+week\b.{0,40}\b(operations?|accountanc?y|finance|controllers?)\b": "Audit / Finance Control / Accounting / FP&A",
    r"\bgraduate\s+talent\s+program(?:me)?\b.{0,40}\b(tech|technology|engineering|software|data|cyber|it)\b": "IT / Engineering",
    r"\bgraduate\s+talent\s+program(?:me)?\b.{0,40}\b(ops?|operations?)\b": "Operations — Back Office / Settlement",
    r"\bgraduate\s+talent\s+program(?:me)?\b.{0,40}\b(gwm|wmch|wealth|private\s+bank(?:ing)?)\b": "Wealth Management / Private Banking",
    r"\b(summer|off[-\s]?cycle|industrial\s+placement)\s+(?:analyst|associate|intern(?:ship)?)\b.{0,40}\b(tech|technology|engineering|software|data|ml|ai|cyber|it)\b": "IT / Engineering",
    r"\btechnology\s+summer\s+analyst\b": "IT / Engineering",

    # ---------- INTERN / GRADUATE / SUMMER (enrichissement par domaine) ----------
    r"\b(global\s+markets?|sales\s*&\s*trading|s&t|ficc|fx|rates?|credit|equities?)\b.{0,40}\b(summer|graduate|off[-\s]?cycle|intern(ship)?)\b": "Markets — Sales",
    r"\boperations?\b.{0,40}\b(summer|graduate|off[-\s]?cycle|intern(ship)?)\b": "Operations — Back Office / Settlement",
    r"\b(engineering|technology|platform\s+solutions|developer)\b.{0,40}\b(summer|graduate|off[-\s]?cycle|intern(ship)?)\b": "IT / Engineering",
    r"\b(risk|finance|audit|controlling|fp&a)\b.{0,40}\b(summer|graduate|off[-\s]?cycle|intern(ship)?)\b": "Audit / Finance Control / Accounting / FP&A",
    r"\b(corporate\s+banking|coverage|transaction\s+banking|cash\s+management)\b.{0,40}\b(summer|graduate|off[-\s]?cycle|intern(ship)?)\b": "Corporate Banking / Coverage",
    r"\b(program|programme|graduate|intern(?:ship)?)\b.{0,40}\b(tech|technology|engineering|software|data|ml|ai|cyber|it)\b": "IT / Engineering",
    r"\b(program|programme|graduate|intern(?:ship)?)\b.{0,40}\b(ops?|operations?)\b": "Operations — Back Office / Settlement",
    r"\b(program|programme|graduate|intern(?:ship)?)\b.{0,40}\b(gwm|wmch|wealth|private\s+bank(?:ing)?)\b": "Wealth Management / Private Banking",
    r"\b(program|programme|graduate|intern(?:ship)?)\b.{0,40}\b(risk|operational\s+risk|non[-\s]?financial\s+risk)\b": "Risk — Operational",
    r"\b(program|programme|graduate|intern(?:ship)?)\b.{0,40}\b(compliance|aml|kyc|financial\s+crime|afc)\b": "Compliance / Financial Crime (AML/KYC)",
    r"\b(program|programme|graduate|intern(?:ship)?)\b.{0,40}\b(asset\s+management|investment\s+management|portfolio)\b": "Asset Management / Buy Side",
    r"\b(program|programme|graduate|intern(?:ship)?)\b.{0,40}\b(investment\s+banking|corporate\s+finance|m&a|mergers?\s+&\s+acquisitions?|coverage)\b": "Corporate Banking / Coverage",

    # ---------- IT / ENGINEERING ----------
    r"\b(software\s+engineering|e[-\s]?trading|etrading|penetration\s+tester|red\s+team|soc\b|siem\b|ciberseguridad|cyber\s*security|information\s+security|secops|pentest|appsec|infosec)\b": "IT / Engineering",
    r"\b(developer|software\s+engineer|full\s?stack|front\s?end|frontend|back\s?end|devops|cloud|sre|network|reseau|sysadmin|windows|linux|kubernetes|docker|terraform|sap|salesforce|servicenow|mobile|ios|android|architecte|software\s+architect|application|api|microservices|cicd|ci/?cd|typescript|react|angular|node\.?.?js?|python|java|c\+\+|c#|php|ruby|go|golang|(?:\.?net|dotnet)\b|tech(?:nical)?\s+lead|lead\s+(?:developer|engineer)|security|soc\b|siem\b|information\s+technology|market\s+data|application\s+support|prod(?:uction)?\s+support|middleware|soa\b|help(?:\s*desk)?|desktop\s+support|service\s+desk|okta|active\s+directory|\bad\b|office\s*365|m365|o365|exchange\s+online|intune|vmware|citrix|cisco|checkpoint|palo\s+alto|fortigate|zscaler|sailpoint|sso|saml|oauth|grpc|message\s+queue|\bmq\b|ibm\s+mq|tibco|mulesoft)\b": "IT / Engineering",
    r"\b(automation\s+tester|qa\s+engineer|selenium|test\s+automation|automation\s+qa)\b": "IT / Engineering",
    r"\bfachinformatiker\b": "IT / Engineering",
    r"\bprogrammer\s+analyst\b": "IT / Engineering",
    r"\bsite\s+reliability\s+engineer\b": "IT / Engineering",
    r"\bdeveloppeur\b": "IT / Engineering",     # dé-accentué par prep_text
    r"\bingenieur\b": "IT / Engineering",
    r"\bengineer\b": "IT / Engineering",
    r"\bsupport\s+technique\b": "IT / Engineering",
    r"\bsoftware\s+solutions?\s+development\b": "IT / Engineering",
    r"\bpricing\b.{0,20}\b(developer|development|engineer)\b": "IT / Engineering",
    r"\befx\b.{0,20}\b(developer|development|engineer|platform|devops)\b": "IT / Engineering",
    r"\bdeveloppeur\b|\bingenieur\b|\bengineer\b": "IT / Engineering",
    r"\bsupport\s+technique\b": "IT / Engineering",
    r"\bsoftware\s+solutions?\s+development\b": "IT / Engineering",

    # Technology internship/program (générique)
    r"\btechnology\b.{0,20}\b(intern|internship|program|programme|placement|summer)\b": "IT / Engineering",

    # ---------- DATA / QUANT ----------
    r"\b(adobe\s+analytics|cja\b|digital\s+analytics|a/?b\s*test(?:ing)?|experimentation)\b": "Data / Quant",
    r"\b(data\s+scientist|data\s+analyst(?:e)?|data\s+engineer|analytics\s+engineer|ml\s+engineer|machine\s+learning|deep\s+learning|nlp|llm|bi\b|power\s*bi|tableau|snowflake|databricks|dbt\b|spark|hadoop|airflow|kafka|sql\b|no\s?sql|quant\b|quantitative|modeller|modeler|model(?:ing|isation)|time\s+series|data\s+quality|data\s+governance|mdm\b|data\s+lineage|data\s+steward|mlops|model\s+ops?|model\s+governance|feature\s+store|feature\s+engineering|causal|bayesian|forecast(?:ing)?|xgboost|pytorch|tensorflow|sklearn|pandas|numpy|stochastic)\b": "Data / Quant",
    r"\brisk\s+analytics?\b": "Data / Quant",
    r"\bdata\s+(?:analyst|science|scientist|engineer|intern)\b": "Data / Quant",
    r"\bdata\b.{0,20}\banalyst\b": "Data / Quant",
    r"\bdata\s+and\s+analytics\b": "Data / Quant",
    r"\banalyste\s+quantitatif\b": "Data / Quant",
    r"\bdata\s+architect\b": "Data / Quant",
    r"\bdata\s+and\s+analytics\b": "Data / Quant",
    r"\banalytics\s+specialist\b": "Data / Quant",

    # ---------- PRODUCT / PMO / CHANGE ----------
    r"\b(business\s+management|project\s+manager|chef\s+de\s+projet|pmo\b|business\s+analyst|ba\b(?![a-z])|functional\s+analyst|product\s+owner|product\s+manager|scrum\s+master|agile\s+(?:coach|lead|project)|transformation|change\s+manager|moa|amoa|consultant\s+(?:moa|process|agile)|user\s+stories?|backlog|roadmap|acceptance\s+criteria|\buat\b|requirements?\s+(?:gathering|analysis)|process\s+mapping|\bbpmn\b|\braci\b|business\s+case|stakeholder\s+management|\bjira\b|\bconfluence\b|\bkanban\b|chef\s+de\s+produit|chargee?\s+de\s+produit)\b": "Product / Project / PMO / Business Analysis",
    r"\b(product\s+manager|product\s+owner|project\s+manager)\s+(?:intern|analyst|associate)?\b": "Product / Project / PMO / Business Analysis",
    r"\bbusiness\s+solutions?\s+analyst\b": "Product / Project / PMO / Business Analysis",
    r"\bproject\s+management\s+officer\b": "Product / Project / PMO / Business Analysis",

    # ---------- STRATEGY / CONSULTING ----------
    r"\b(strategy|strategie|strategic|consulting|consultant\s+strategie|transformation\s+office|operating\s+model|tom\b|target\s+operating\s+model|due\s+diligence|\bpmi\b|post[-\s]?merger\s+integration|strategy\s+consultant)\b": "Strategy / Consulting / Transformation",
    r"\bconsultant\b": "Strategy / Consulting / Transformation",

    # ---------- HR / COMMS / MARKETING ----------
    r"\b(rh|ressources\s+humaines|human\s+resources|hrbp|people\s+partner|people\s+ops?|talent\s+acquisition|recruteur|recruiter|payroll(?!\s*(provider|service|vendor|outsourc))|paie|comp(?:ensation)?(?:\s*&\s*benefits)?|benefits|c&b|learning\s*&?\s*development|l&d|personalreferent|talent\s+management|hris|sirh|workday|successfactors|cornerstone|people\s+analytics|employee\s+relations|labou?r\s+relations|reward|remuneration|avantages?\s+sociaux|total\s+rewards?|org(?:anisational|anizational)?\s+development|\bod\b|org\s+design|communications?|comms|brand|pr|relations?\s+presse)\b": "HR / People",
    r"\b(marketing|ux|ui|designer|growth|seo|sea|social\s+media|community\s+manager|content|copywriter|campaign\s+manager|marcom|go[-\s]?to[-\s]?market|\bgtm\b|\babm\b|crm\s+marketing|email\s+marketing|performance\s+marketing|paid\s+(?:search|social|media)|media\s+buy(?:ing)?|digital\s+acquisition|display\s+advertising|product\s+marketing)\b": "Design / Marketing / Comms",
    r"\bhr\b": "HR / People",
    r"\brecrutement\b": "HR / People",
    r"\badjoint(?:e)?\s+administratif(?:-ive)?\b": "Administrative / Executive Assistant",
    r"\badministrativ[oa]\b": "Administrative / Executive Assistant",
    r"\brecruitment\b": "HR / People",
    r"\bcampus\s+management\b": "HR / People",
    r"\buniversity\s+relations\b": "HR / People",
    r"\bcustomer\s+journey\s+(?:specialist|manager|lead)\b": "Design / Marketing / Comms",

    # ---------- ADMIN / EXECUTIVE ASSISTANT (générique) ----------
    r"\b(executive\s+assistant|assistant(?:e)?\s+de\s+direction|personal\s+assistant|office\s+manager)\b": "Administrative / Executive Assistant",

    # ---------- OPERATIONS / FINANCE CONTROL ----------
    r"\b(middle\s*office|trade\s+support|pnl|p&l|risk\s+pnl|product\s+control|p&l\s+control|pnl\s+control|valuation(?:s)?\s+control|valuation(?:s)?\b|independent\s+price\s+verification|ipv)\b": "Operations — Middle Office",
    r"\b(fund\s+account(?:ant|ing)|fund\s+admin(?:istration)?|transfer\s+agent|ta\b|nav\s+(?:production|calc(?:ulation)?)|dealing\s+desk|subscriptions?|redemptions?|asset\s+servicing|custody|global\s+custody|fund\s+distribution|fund\s+execution)\b": "Operations — Fund Admin / TA",
    r"\b(back\s*office|settlement[s]?|reconciliation|confirmations?|clearing|corporate\s+actions?|static\s+data|reference\s+data|securities?\s+master\s+data|collateral|margin|custody|swift|sepa|ach\b|payments?\s+operations?|banking\s+operations|securities\s+services|cheques?|checks?\s+processing|nostro|prematch(?:ing)?|affirmation|\bomgeo\b|\bctm\b|\balert\b|mt\d{3}|iso\s*20022|camt\d*|pacs\d*|\bstp\b|exceptions?\s+management|investor\s+services|referential\s+data|static\s+referential)\b": "Operations — Back Office / Settlement",
    r"\b(securities?\s+lending).{0,40}\b(ops?|operations?|middle\s*office|trade\s+support)\b": "Operations — Middle Office",
    r"\bbooking\b.{0,50}\b(ops?|operations?|support|analyst|mo|middle\s*office|trade\s+capture)\b": "Operations — Middle Office",

    # ---------- PROCUREMENT / SOURCING ----------
    r"\b(procurement|purchas(?:e|ing)|acheteur|achats?|sourcing|einkaufer|einkaeufer|einkauf|compras)\b": "Operations — Back Office / Settlement",
    r"\bsecurities?\s+operations?\s+representative\b": "Operations — Back Office / Settlement",
    r"\boperations?\s+representative\b": "Operations — Back Office / Settlement",
    r"\bclient\s+operations?\s+officer\b": "Operations — Back Office / Settlement",
    r"\bpayments?\s+(?:processing|processor)\b": "Operations — Back Office / Settlement",
    r"\boperations?\s+analyst\b": "Operations — Back Office / Settlement",
    r"\boperations?\s+officer\b": "Operations — Back Office / Settlement",
    r"\boperat(?:ions|oins)\s+processor\b": "Operations — Back Office / Settlement",
    r"\bdocument\s+administrator\b": "Operations — Back Office / Settlement",
    r"\banalista\s+operativo\b": "Operations — Back Office / Settlement",
    r"\bgestion\s+des\s+credits?\b": "Operations — Back Office / Settlement",
    r"\bcharge(?:\([^)]+\))?\s+operations?\b": "Operations — Back Office / Settlement",
    r"\bpayments?\s+(?:processing|processor)\b": "Operations — Back Office / Settlement",
    r"\boperations?\s+(?:analyst|officer)\b": "Operations — Back Office / Settlement",
    r"\bdocument\s+administrator\b": "Operations — Back Office / Settlement",
    r"\bgestion\s+des\s+credits?\b": "Operations — Back Office / Settlement",

    # ---------- COMPLIANCE / AFC / LEGAL ----------
    r"\b(anti[-\s]?financial\s+crime|afc\b|aml|kyc|onboarding|client\s+due\s+diligence|lcb\s?ft|lab/?ft|sanctions?|ofac|embargo|pep|adverse\s+media|transaction\s+monitoring|financial\s+crimes?|compliance|conformite|regulatory\s+(?:relations|affairs)|screening|name\s+screening|watchlist|transaction\s+filtering|kyc\s+remediation|sarlaft|abac|anti[-\s]?bribery|anti[-\s]?corruption|fraud\s+(?:investigation|monitoring))\b": "Compliance / Financial Crime (AML/KYC)",
    r"\bregulatory\s+control\s+analyst\b": "Risk — Operational",
    r"\brisk\s+and\s+control\b": "Risk — Operational",
    r"\bcompliance\s+(?:analyst|intern|associate|officer)\b": "Compliance / Financial Crime (AML/KYC)",
    r"\baml\s+kyc\s+(?:analyst|intern)\b": "Compliance / Financial Crime (AML/KYC)",
    r"\bfinancial\s+crime\s+(?:analyst|intern)\b": "Compliance / Financial Crime (AML/KYC)",

    # Ajouts Legal spécifiques
    r"\b(corporate|company)\s+secretary\b": "Legal / Juridique",
    r"\bdomiciliation\b": "Legal / Juridique",
    r"\bfiscaliste\b": "Legal / Juridique",
    r"\b(juriste|lawyer|attorney|solicitor|barrister|abogado(?:a)?|legal\s+counsel|\blegal\b|avocat|avocate|paralegal|contract\s+manager|droit|corporate\s+law|fiscal(?:ite|idad)?|privacy|data\s+protection|dpo|rgpd|gdpr|company\s+secretary)\b": "Legal / Juridique",

    # ---------- AUDIT / FINANCE CONTROL ----------
    r"\bfinance\b.{0,20}\b(intern|internship|off[-\s]?cycle|placement|summer|analyst)\b": "Audit / Finance Control / Accounting / FP&A",
    r"\b(audit|auditeur|controle\s+(?:interne|financier|de\s+gestion)|controleur\s+de\s+gestion|account(?:ing|ant)|general\s+ledger|gl\b|closing|cloture|ifrs|us\s+gaap|reporting|fp&a|\bbp&a\b|p&l|controlling|finance\s+business\s+partner|budget(?:ing)?|forecast(?:ing)?|variance\s+analysis|cost\s+controller|\bcapex\b|\bopex\b|consolidation|\bconso\b|group\s+reporting|sap\s+fi/?co|\bfico\b|controller[s]?\b|sox\b|product\s+control|valuation(?:s)?\s+control|independent\s+price\s+verification|ipv)\b": "Audit / Finance Control / Accounting / FP&A",
    r"\bfinance\s+(?:intern|analyst|associate)\b": "Audit / Finance Control / Accounting / FP&A",
    r"\bfinancial\s+report(?:ing)?\s+officer\b": "Audit / Finance Control / Accounting / FP&A",

    # ---------- RETAIL BANKING / BRANCH ----------
    r"\b(conseiller(?:e)?\s+(?:clientele|banque)|chargee?\s+de\s+clientele|directeur\s+d'agence|conseiller\s+pro|professionnels|retail\s+banking|front\s+office\s+agence|conseiller\s+commercial(?:\s+banque)?|guichet(?:ier)?|chargee?\s+d'accueil|banquier\s+de\s+famille|banquier\s+patrimonial\s+forum|agencia|asesor(?:a)?\s+(?:digital|universal|ventas|servicios|cobranza|comisiones)|ejecutivo\s+de\s+cuentas?|gerente\s+de\s+sucursal|sucursal|cajer[oa]|personal\s+banker|associate\s+banker|teller|branch\s+(?:manager|operations|office|coordinator)|bankhal\s+medewerker|berater\s+privatkunden|daily\s+banking|klantenservice|obslugi\s+klienta|mortgage|baufinanzierung|bankkaufmann|bankkauffrau|contact\s+center|call\s+center|ccss|voice\s+agent|remittances?)\b": "Retail Banking / Branch",
    r"\brelationship\s+banker\b": "Retail Banking / Branch",
    r"\bfinancial\s+center\b": "Retail Banking / Branch",
    r"\bconseiller\s+bancaire\b": "Retail Banking / Branch",
    r"\bgestionnaire\s+de\s+clientele\b": "Retail Banking / Branch",
    r"\bconseiller\s+d'?accueil\b": "Retail Banking / Branch",
    r"\bclientele\s+essent(?:iel|ielle)\b": "Retail Banking / Branch",
    r"\bpersonal\s+de\s+cajas\b": "Retail Banking / Branch",
    r"\bconseiller(?:\([^)]+\))?\s+(?:d'?accueil|accueil)\b": "Retail Banking / Branch",
    r"\bconseiller(?:\([^)]+\))?\s+de\s+clientele\b": "Retail Banking / Branch",
    r"\bcharge(?:\([^)]+\))?\s+de\s+clientele\s+particuliers?\b": "Retail Banking / Branch",
    r"\bclientele\s+particuliers?\b": "Retail Banking / Branch",
    r"\bconseill\w*\s+(?:en\s+)?services?\s+bancaires?\b": "Retail Banking / Branch",
    r"\bconseill\w*\s+particulier(?:s)?\b": "Retail Banking / Branch",
    r"\bbancassurance\b": "Retail Banking / Branch",
    r"\buniversal\s+banker\b": "Retail Banking / Branch",
    r"\b(call\s*center|contact\s*center|callcenter|ccc)\b": "Retail Banking / Branch",
    r"\bpersonal\s+de\s+caja[s]?\b": "Retail Banking / Branch",
    r"\bconseiller(?:\s*/\s*conseillere)?\s+accueil\b": "Retail Banking / Branch",
    r"\bkundenberater\b": "Retail Banking / Branch",
    r"\bkundenberater\b.{0,20}\bprivatkunden\b": "Retail Banking / Branch",
    r"\basesoria\s+digital\b": "Retail Banking / Branch",
    r"\bjobs?\s+de\s+(?:guichet|cajas?)\b": "Retail Banking / Branch",
    r"\bejecutivo/?a\s+hipotecario\b": "Retail Banking / Branch",
    r"\bconseill\w*(?:\s*/\s*conseill\w*)?\s+de\s+clientele\b": "Retail Banking / Branch",
    r"\bconseill\w*\s+(?:en\s+)?services?\s+bancaires?\b": "Retail Banking / Branch",
    r"\buniversal\s+banker\b": "Retail Banking / Branch",
    r"\bkundenberater\b(?:.{0,20}\bprivatkunden\b)?": "Retail Banking / Branch",
    r"\bpersonal\s+de\s+caja[s]?\b": "Retail Banking / Branch",

    # ---------- CORPORATE BANKING / COVERAGE ----------
    r"\b(relationship\s+(?:manager|management|mgmt)|rm\b(?![a-z])|coverage(?!\s*markets)|corporate\s+banking|cash\s+management|transaction\s+banking|gtb\b|gts\b|global\s+trade\s+solutions?|trade\s+finance|cib\s+coverage|corporate\s+and\s+institutional\s+banking|international\s+subsidiary\s+bank|export\s+finance|project\s+finance|structured\s+export\s+finance|working\s+capital|supply\s+chain\s+(?:finance|solutions)|escrow|bank\s+guarantees?|business\s+banking\s+manager|gps\b|payments?\s+(?:product|sales|manager)|account\s+manager|assistant\s+sales\s+manager)\b": "Corporate Banking / Coverage",
    r"\bglobal\s+capital\s+markets?\b.{0,40}\b(analyst|intern(?:ship)?|off[-\s]?cycle|industrial\s+placement|summer|graduate)\b": "Corporate Banking / Coverage",
    r"\bcharge(?:\([^)]+\))?\s+d'?affaires?\b": "Corporate Banking / Coverage",
    r"\bejecutivo/?a\s+banca\s+empresarial\b": "Corporate Banking / Coverage",
    r"\bejecutivo\s+clientes?\s+gran\s+empresa\b": "Corporate Banking / Coverage",
    r"\bejecutivo\s+negocios\b": "Corporate Banking / Coverage",
    r"\bfinancement\s+(?:pro|entreprises?|pro/ent)\b": "Corporate Banking / Coverage",
    r"\bmarches?\s+des\s+entreprises\b": "Corporate Banking / Coverage",
    r"\badvisor\s+professionals?\b": "Corporate Banking / Coverage",
    r"\b(vice\s+president|assistant\s+vice\s+president|svp|avp|associate\s+director|director)\b": "Corporate Banking / Coverage",
    r"\b(manager|associate)\b": "Corporate Banking / Coverage",
    r"\bintern(ship)?\b": "Corporate Banking / Coverage",
    r"\bstage\b": "Corporate Banking / Coverage",
    r"\bglobal\s+markets?\b": "Markets — Sales",
    r"\bcharge(?:\([^)]+\))?\s+d'?affaires?\b": "Corporate Banking / Coverage",
    r"\bejecutivo/?a\s+banca\s+empresarial\b": "Corporate Banking / Coverage",
    r"\bejecutivo\s+clientes?\s+gran\s+empresa\b": "Corporate Banking / Coverage",
    r"\bejecutivo\s+negocios\b": "Corporate Banking / Coverage",

    # FR/ES/IT libellés coverage/corp banking
    r"\b(charge(?:e)?\s+d'affaires\s+entreprises|banquier\s+conseil|gestore\s+corporate|banca\s+empresas\s+e\s+instituciones|grandes?\s+entreprises|grands?\s+comptes|march[eé]\s+entreprises)\b": "Corporate Banking / Coverage",
    r"\b(titrisation|securiti[sz]ation|origination)\b": "Corporate Banking / Coverage",
    r"\badvisory\s*&\s*financing\s+group\b": "Corporate Banking / Coverage",

    # ---------- TREASURY / ALM ----------
    r"\b(treasury|tresorerie|tesoreria|tesouraria|alm|asset\s+liability\s+management|liquidity\s+risk|nsfr|lcr|ilaap|alco|irrbb|hedg(?:e|ing)|ftp|funds?\s+transfer\s+pricing|balance\s+sheet\s+management|liquidity\s+buffer|contingency\s+funding\s+plan|\bcfp\b|liquidity\s+stress\s+testing|\blst\b|intraday\s+liquidity|repricing\s+gaps?|eve\b|nii\b|liquidity\s+portfolio\s+management|term\s+funding|wholesale\s+funding|obtain\s+and\s+maintain\s+financing)\b": "Treasury / ALM / Liquidity",
    r"\bcapital\s*&\s*liquidity\b": "Treasury / ALM / Liquidity",

    # ---------- RISK ----------
    r"\bkreditrisikomanager\b": "Risk — Credit",
    r"\b(ccar|stress\s+test(?:ing)?)\b": "Risk — Model Risk & Validation",
    r"\b(market\s+risk|var|stressed\s+var|frtb|irc|xva)\b": "Risk — Market",
    r"\b(credit\s+risk|counterparty\s+risk|pd|lgd|ead|analista\s+riesgo|risques?\s+engagements?|credit\s+analyst|credit\s+approval|watchlist|limit\s+management|covenants?)\b": "Risk — Credit",
    r"\b(operational\s+risk|op(?:erational)?\s*risk|non[-\s]?financial\s+risk|permanent\s+control|rcsa|kri|sox\s+controls?|issue\s+management|sox\s+404|scenario\s+analysis|risk\s+control)\b": "Risk — Operational",
    r"\b(model\s+risk|model\s+validation|model\s+review|ml\s+validation|backtesting|benchmarking)\b": "Risk — Model Risk & Validation",
    r"\brisk\s+(?:officer|analyst|manager)\b": "Risk — Operational",
    r"\brisk\b.{0,20}\b(intern|internship|off[-\s]?cycle|placement|summer|graduate)\b": "Risk — Operational",
    r"\brisk\s+management\s+intern\b": "Risk — Operational",
    r"\brisk\s+management\s+analyst\b": "Risk — Operational",
    r"\bcredit\s*&\s*portfolio\s+management\b": "Risk — Credit",
    r"\bcredit\s+portfolio\s+management\b": "Risk — Credit",
    r"\bcpm\b.{0,20}\b(credit|portfolio|risk)\b|\b(credit|portfolio|risk)\b.{0,20}\bcpm\b": "Risk — Credit",

    # ---------- MARKETS (Sales/Structuring/Trading/Research) ----------
    r"\b(commodit(?:y|ies)\s+broker|broker\s+(?:agricultural\s+)?commodit(?:y|ies))\b": "Markets — Sales",
    r"(?:(?:markets?|trading|derivatives?|fx|forex|rates?|equities?|equity|credit|fixed\s+income|commodit(?:y|ies)|structured\s+products?)(?:\s|[,/-])+(?:\w+\s+){0,2}?(?:sales|distribution)\b|\bsales(?:\s|[,/-])+(?:trader|trading|markets?|derivatives?|fx|rates?|equities?|credit|structured\s+products?)\b|vendeur\s+(?:salle|marches?)|sales[-\s]?trader|institutional\s+sales|client\s+coverage|coverage\s+sales|distribution\s+sales)": "Markets — Sales",
    r"\b(?:(?:(?:assistants?\s+)?vendeurs?|sales|distribution)\b.{0,40}?\b(?:produits?\s+structures?|structured\s+products?)|(?:produits?\s+structures?|structured\s+products?)\b.{0,40}?\b(?:(?:assistants?\s+)?vendeurs?|sales|distribution))\b": "Markets — Sales",
    r"\b(structurer|structuring|produits?\s+structures?|structured\s+products?|term\s*sheet|payoff|exotic(?:s)?\s+structur(?:e|ing)|autocall(?:able)?|barriers?|quanto|binary\s+options?|cliquet|basket)\b": "Markets — Structuring",
    r"\b(trader?s?|trading|market\s+maker|prop(?:rietary)?\s+trading|delta\s+one|flow\s+trading|options?|futures?|swaps?|swaptions?|exotics?|repo|money\s+markets?|g10|em(?:erging)?\s+markets?|rfq|market\s+making|vwap|twap|algo(?:rithmic)?\s+trading|hedg(?:e|ing)|delta\s+hedg(?:e|ing)|flow\s+credit|cash\s+equities|xva|otc|listed\s+derivatives?)\b": "Markets — Trading",
    r"\b(research\s+(?:analyst|associate|management)|equity\s+research|credit\s+research|macro\s+(?:research|strategy|strategist)|strategy\s+(?:analyst|associate)|sell[-\s]?side\s+research|buy[-\s]?side\s+research|(?:global|investment)\s+research|earnings\s+model|dcf|thematic\s+research)\b": "Markets — Research & Strategy",
    r"\bbond\s+analytics\b": "Markets — Research & Strategy",
    r"\bstructured\s+finance\s+(?:intern|analyst)\b": "Markets — Structuring",
    r"\bglobal\s+markets\s+(?:intern|analyst|summer)\b": "Markets — Sales",

    # ---------- BUY SIDE / WEALTH ----------
    r"\b(venture\s+capital|capital\s+risque|private\s+equity|pe\b|gp\/lp|fund\s+of\s+funds)\b": "Asset Management / Buy Side",
    r"\b(asset\s+management|buy[-\s]?side|portfolio\s+manager|fund\s+manager|gerant(?:e)?|gestion\s+d?actifs?|opcvm|ucits|aifm|fund\s+selector|multi-?manager|asset\s+allocation|fund\s+selection|manager\s+research|mandates?|managed\s+accounts?|sma\b|rfp\b|due\s+diligence\s+(?:manager|fund)|kiid|priips|aladdin)\b": "Asset Management / Buy Side",
    r"\binvestment\s+management\b": "Asset Management / Buy Side",

    r"\b(private\s+banker|banquier\s+prive(?:s|es)?|wealth\s+management|private\s+wealth|family\s+office|uhnw|hnw|private\s+banking|investment\s+advisor|financial\s+advis(?:or|er)|client\s+advis(?:or|er)y?|wealth\s+planner|estate\s+planning|succession|fiduciary|trust\s+(?:officer|services?)|discretionary\s+mandate|mandate\s+discretionnaire|lombard|credit\s+advisory|gestion\s+de\s+patrimoine|gestionnaire\s+prive?|banquero(?:a)?\s+(?:patrimonial|privado|personal)|premier\s+(?:services|bank(?:ing)?)|wpb\b|rbwm\b|wealth\s+lending)\b": "Wealth Management / Private Banking",
    r"\bclient\s+advis(?:or|er)\b": "Wealth Management / Private Banking",
    r"\badvis(?:or|er)\s+client\b": "Wealth Management / Private Banking",
    r"\bfinancial\s+solutions?\s+advisor\b": "Wealth Management / Private Banking",
    r"\bbanquier\s+patrimonial\b": "Wealth Management / Private Banking",
    r"\bconseill\w*\s+patrimonial\b": "Wealth Management / Private Banking",
    r"\bplanificateur(?:\([^)]+\))?\s+financier(?:\([^)]+\))?(?:\s+relationnel(?:le)?)?\b": "Wealth Management / Private Banking",
    r"\bclientele\s+premium\b": "Wealth Management / Private Banking",
    r"\bclient\s+service\s+(?:associate|executive)\b": "Wealth Management / Private Banking",
    r"\bkundenberater\b.{0,20}\bwertpapier\b": "Wealth Management / Private Banking",
    r"\bbanque\s+privee\b": "Wealth Management / Private Banking",
    r"\bgestion\s+privee\b": "Wealth Management / Private Banking",
    r"\bbanquero/?a\s+patrimonial\b": "Wealth Management / Private Banking",
    r"\bbanque\s+privee\b|\bgestion\s+privee\b": "Wealth Management / Private Banking",
    r"\bbanquier\s+patrimonial\b|\bconseill\w*\s+patrimonial\b": "Wealth Management / Private Banking",
    r"\bclient\s+service\s+(?:associate|executive)\b": "Wealth Management / Private Banking",

    # ---------- REAL ESTATE ----------
    r"\b(real\s+estate|immobilier|immobilien|property\s+(?:management|investing)|reits?|asset\s+manager\s+(?:logistics|bureaux|offices?|retail|residential|industrial|activites?)|acquisitions?\s+immobilieres?|promotion\s+immobiliere|lease\s+management|valuation|appraisal)\b(?!\s*(bank|banking|coverage))": "Real Estate / Investing",
    r"\bimmobilienmanagement\b": "Real Estate / Investing",

    # ---------- FALLBACKS INTELLIGENTS ----------
    r"\b(investment\s+banking|global\s+banking|ib\s+(?:analyst|off[-\s]?cycle|internship|summer|graduate)|ibd\b|corporate\s+finance|m&a|mergers?\s+&\s+acquisitions?)\b": "Corporate Banking / Coverage",
    r"\brisk\s+management\b": "Risk — Operational",
    r"\b(fixed\s+income|equities|equity|fx|forex|rates|credit|commodit(?:y|ies))\b(?:(?!research|structur|trading)[\s\w]{0,30})\b(analyst|intern(?:ship)?|off[-\s]?cycle|industrial\s+placement|summer)\b": "Markets — Sales",
}

# =============================================================
# NEW: Règles prioritaires (ajout de nouvelles feuilles)
# =============================================================

_NEW_RULES_HIGH_PRIORITY: dict[str, str] = {
    # -------- Investment Banking (granulaire) --------
    r"\b(m&a|mergers?\s+&\s+acquisitions?)\b": "IB — M&A Advisory",
    r"\b(ecm|equity\s+capital\s+markets?|ipo|follow[-\s]?on|rights?\s+issue|accelerated\s+bookbuild|abb|block\s+trade)\b": "IB — Equity Capital Markets (ECM)",
    r"\b(dcm|debt\s+capital\s+markets?|bond\s+(?:issuance|origination)|mt[np]\b|emtns?|liability\s+management|(tender|exchange)\s+offer|consent\s+solicitation)\b": "IB — Debt Capital Markets (DCM)",
    r"\b(lev(?:eraged)?\s*fin(?:ance)?|levfin|lbo|unitranche|mezz(?:anine)?|high[-\s]?yield)\b": "IB — Leveraged Finance",
    r"\b(syndicate|syndication|book\s*runner|book[-\s]*building|bookrunner)\b": "IB — Syndicate",
    r"\b(structured\s+finance|securiti[sz]ation|abs\b|clo\b|rmbs|cmbs|abcp|conduit|warehouse\s+facility)\b": "IB — Structured Finance / Securitization",
    r"\b(project\s+finance|infrastructure\s+finance|ppp|concession|non[-\s]?recourse)\b": "IB — Project & Infrastructure Finance",
    r"\b(restructuring|special\s+situations|distressed\s+(?:debt|assets?|m&a)|turnaround)\b": "IB — Restructuring / Special Situations",

    # -------- Corporate / Transaction Banking (feuilles dédiées) --------
    r"\b(cash\s+management|liquidity\s+management|notional\s+pooling|payables|receivables|host[-\s]?to[-\s]?host|gps\b|global\s+payment[s]?\s+solutions?)\b": "Transaction Banking — Cash Management / Payments",
    r"\b(trade\s+finance|documentary\s+(?:trade|collections?)|letters?\s+of\s+credit|(?:standby|sb)[-\s]?lc|bank\s+guarantees?)\b": "Transaction Banking — Trade Finance",
    r"\b(working\s+capital|supply\s+chain\s+finance|scf|receivables\s+finance|payables\s+finance|reverse\s+factoring|confirming)\b": "Transaction Banking — Working Capital & SCF",
    r"\b(export\s+finance|export\s+credit\s+agenc(?:y|ies)|eca\s+finance|ukef|sace|serv|k[-\s]?exim|bpi(?:france)?|euler\s+hermes)\b": "Transaction Banking — Export Finance",

    # -------- Operations / Support (Markets support dédié) --------
    r"\b(trade\s+support)\b": "Operations — Markets Support (Trade Support / Booking / Prime / Clearing)",
    r"\b(trade\s+capture|trade\s+booking|booking\s+(?:analyst|support))\b": "Operations — Markets Support (Trade Support / Booking / Prime / Clearing)",
    r"\b(prime\s+(?:brokerage|services)|\bpbs?\b)\b": "Operations — Markets Support (Trade Support / Booking / Prime / Clearing)",
    r"\b((?:etd|listed|futures?|options?|otc|derivatives?)\s+clearing|clearing\s+(?:member|broker|services?))\b": "Operations — Markets Support (Trade Support / Booking / Prime / Clearing)",

    # -------- Buy Side (feuilles dédiées) --------
    r"\b(private\s+equity|buy[-\s]?out(s)?|lbo\b|general\s+partner|limited\s+partner)\b": "Private Equity",
    r"\b(venture\s+capital|seed|series\s+[abcde]\b|pre[-\s]?seed|vc\b)\b": "Venture Capital",
    r"\b(hedge\s+funds?|multi[-\s]?strategy|long/?short|global\s+macro|event[-\s]?driven|arbitrage|systematic|cta\b|managed\s+futures)\b": "Hedge Funds / Alternatives",

    # -------- Wealth (feuilles dédiées) --------
    r"\b(lombard|wealth\s+lending|margin\s+loan|credit\s+advisory)\b": "Wealth — Lending & Credit Advisory",
    r"\b(trust\s+(?:officer|services?)|fiduciary|estate\s+planning|succession)\b": "Wealth — Trust / Fiduciary / Estate Planning",
    r"\b(investment\s+advis(?:or|ory))\b": "Wealth — Investment Advisory",

    # -------- IT (sous-feuilles ; fallback IT / Engineering reste) --------
    r"\b(developer|software\s+engineer|full\s?stack|front\s?end|frontend|back\s?end|typescript|react|angular|node\.?js?|python|java|c\+\+|c#|php|go|golang)\b": "IT — Software Engineering",
    r"\b(cyber\s*security|soc\b|siem\b|pentest|appsec|infosec|red\s+team|secops)\b": "IT — Cybersecurity / SecOps",
    r"\b(devops|sre|platform|cloud|kubernetes|docker|terraform)\b": "IT — Platform / Cloud / SRE / DevOps",
    r"\b(sap|salesforce|servicenow)\b": "IT — Enterprise Apps (SAP / Salesforce / ServiceNow)",
    r"\b(application\s+support|prod(?:uction)?\s+support|help\s*desk|service\s+desk|desktop\s+support|l[12]\b)\b": "IT — Application / Production Support & Helpdesk",
    r"\b(e[-\s]?trading|etrading|market\s+data|low[-\s]?latency)\b": "IT — Markets Tech (eTrading / Market Data)",

    # -------- Data / Quant (sous-feuilles ; fallback = Data / Quant) --------
    r"\b(data\s+scientist|machine\s+learning|deep\s+learning|nlp|llm)\b": "Data — Data Science / ML",
    r"\b(data\s+engineer|analytics\s+engineer|databricks|spark|airflow|kafka|hadoop|snowflake|dbt|mlops|feature\s+store)\b": "Data — Data Engineering / Platform / MLOps",
    r"\b(data\s+analyst|bi\b|power\s*bi|tableau|digital\s+analytics|a/?b\s*test(?:ing)?|experimentation)\b": "Data — Analytics / BI",
    r"\b(quants?|quantitative\s+(?:research|analyst|developer)|strats?)\b": "Quant — Research / Strats",
    r"\brisk\s+analytics?\b": "Data — Risk Analytics",

    # -------- Product / Project / Business --------
    r"\b(product\s+manager|product\s+owner|chef\s+de\s+produit)\b": "Product Management",
    r"\b(business\s+analyst|functional\s+analyst|amoa|moa)\b": "Business Analysis",
    r"\b(project\s+manager|program\s+manager|pmo\b)\b": "Project / Program Management / PMO",
    r"\b(scrum\s+master|agile\s+(?:coach|lead))\b": "Agile / Scrum / Delivery",

    # -------- Strategy / Consulting --------
    r"\b(corporate\s+strategy|strategic\s+planning)\b": "Corporate Strategy",
    r"\b(transformation\s+office|change\s+manager|operating\s+model)\b": "Transformation Office / Change",
    r"\b(target\s+operating\s+model|tom\b)\b": "Transformation Office / Change",
    r"\b(post[-\s]?merger\s+integration|pmi\b)\b": "Management Consulting",
    r"\b(management\s+consult(ing|ant))\b": "Management Consulting",

    # -------- Finance Control / Accounting / Audit (granulaire) --------
    r"\b(product\s+control|p&?l\b|pnl\b|ipv|independent\s+price\s+verification|valuation(?:s)?\s+control)\b": "Product Control / IPV",
    r"\b(account(?:ing)?|general\s+ledger|gl\b|ifrs|us\s+gaap|consolidation|group\s+reporting)\b": "Accounting / GL / Consolidation",
    r"\b(financial\s+report(?:ing)?)\b": "Financial Reporting",
    r"\b(fp&a|budget(?:ing)?|forecast(?:ing)?|planning)\b": "FP&A / Budgeting / Planning",
    r"\b(internal\s+audit|sox\b)\b": "Internal Audit / SOX",

    # -------- Retail (sous-feuilles ciblées) --------
    r"\b(call\s*center|contact\s*center|callcenter|ccc)\b": "Retail Banking — Contact Center / CCC",
    r"\b(mortgage|baufinanzierung|hipotecario)\b": "Retail Banking — Mortgage / Housing Loans",
    r"\b(conseiller\s+pro|sme\s+banking|small\s+business\s+banker|business\s+advisor)\b": "Retail Banking — Small Business / Pro Advisors",

    # -------- Legal (granulaire) --------
    r"\b(company\s+secretary|domiciliation)\b": "Legal — Company Secretary / Domiciliation",
    r"\b(privacy|data\s+protection|dpo|rgpd|gdpr)\b": "Legal — Privacy / Data Protection (DPO)",
    r"\b(fiscaliste|tax|fiscal(?:ite|idad))\b": "Legal — Tax / Fiscal",
    r"\b(contract\s+manager|contracts?|commercial\s+contracts?)\b": "Legal — Contracts / Procurement",
    r"\b(juriste|lawyer|attorney|legal\s+counsel)\b": "Legal — Corporate / Commercial",

    # -------- reroutage explicite (déjà couvert mais utile) --------
    r"\bcustomer\s+journey\s+(?:specialist|manager|lead)\b": "Design / Marketing / Comms",
}

# On met les nouvelles règles en tête (priorité)
RULE_BASED_CLASSIFICATION = {**_NEW_RULES_HIGH_PRIORITY, **RULE_BASED_CLASSIFICATION}


# -------------------------------------------------------------
# WHY (tags courts pour debug)
# -------------------------------------------------------------

WHY_TAGS: dict[str, str] = {
    _SPECIAL_GM_ST_REGEX: "gm/s&t intern → sales",
    r"\bglobal\s+markets?\b(?:(?!executive|assistant|ea|product\s+control|operations?|murex|support)[\s\w]{0,40})\b(analyst|intern(?:ship)?|off[-\s]?cycle|industrial\s+placement|summer|graduate)\b": "GM + early-career",
    r"\binsight\s+week\b": "insight week",
    r"\bgraduate\s+talent\s+program(?:me)?\b": "GTP",
    r"\b(securities?\s+lending)\b": "sec lending",
    r"\breferential\s+data|static\s+data|reference\s+data\b": "reference data",
    r"\bbooking\b": "booking / trade capture",
    r"\bgps\b": "payments/GPS",
    r"\bprivate\s+banker|banquier\s+prive|wpb|rbwm|premier\b": "wealth keywords",
    r"\bprocurement|achats|sourcing|einkauf\b": "procurement",
    r"\basset\s+servicing|fund\s+(?:admin|distribution|execution)\b": "fund admin",
    r"\bventure\s+capital|private\s+equity\b": "vc/pe",
    r"\bccar\b": "ccar",
    r"\brisk\s+(?:officer|analyst|manager)\b": "risk officer",
    r"\brisk\b.{0,20}\b(intern|internship|off[-\s]?cycle|placement|summer|graduate)\b": "risk intern",
    r"\b(corporate|company)\s+secretary\b": "corp/company secretary",
    r"\bdomiciliation\b": "domiciliation",
    r"\bclient\s+advis(?:or|er)\b": "client advisor",
    r"\badvis(?:or|er)\s+client\b": "advisor client",
    r"\binvestment\s+management\b": "investment management",
    r"\bglobal\s+capital\s+markets?\b": "GCM",
    r"\b(global\s+markets?|sales\s*&\s*trading|s&t|ficc|fx|rates?|credit|equities?)\b.{0,40}\b(summer|graduate|off[-\s]?cycle|intern(ship)?)\b": "graduate+markets",
    r"\boperations?\b.{0,40}\b(summer|graduate|off[-\s]?cycle|intern(ship)?)\b": "graduate+ops",
    r"\b(engineering|technology|platform\s+solutions|developer)\b.{0,40}\b(summer|graduate|off[-\s]?cycle|intern(ship)?)\b": "graduate+tech",
    r"\b(risk|finance|audit|controlling|fp&a)\b.{0,40}\b(summer|graduate|off[-\s]?cycle|intern(ship)?)\b": "graduate+risk/finance",
    r"\b(corporate\s+banking|coverage|transaction\s+banking|cash\s+management)\b.{0,40}\b(summer|graduate|off[-\s]?cycle|intern(ship)?)\b": "graduate+corpbank",
    r"\b(program|programme|graduate|intern(?:ship)?)\b.{0,40}\b(ops?|operations?)\b": "program → ops",
    r"\b(program|programme|graduate|intern(?:ship)?)\b.{0,40}\b(risk|operational\s+risk|non[-\s]?financial\s+risk)\b": "program → risk",
    r"\b(program|programme|graduate|intern(?:ship)?)\b.{0,40}\b(compliance|aml|kyc|financial\s+crime|afc)\b": "program → compliance",
    r"\b(program|programme|graduate|intern(?:ship)?)\b.{0,40}\b(gwm|wmch|wealth|private\s+bank(?:ing)?)\b": "program → wealth",
    r"\b(program|programme|graduate|intern(?:ship)?)\b.{0,40}\b(asset\s+management|investment\s+management|portfolio)\b": "program → buy side",
    r"\b(program|programme|graduate|intern(?:ship)?)\b.{0,40}\b(investment\s+banking|corporate\s+finance|m&a|mergers?\s+&\s+acquisitions?|coverage)\b": "program → coverage",

    # Tags pour nouvelles feuilles
    r"\b(m&a|mergers?\s+&\s+acquisitions?)\b": "IB M&A",
    r"\b(ecm|equity\s+capital\s+markets?)\b": "IB ECM",
    r"\b(dcm|debt\s+capital\s+markets?)\b": "IB DCM",
    r"\b(lev(?:eraged)?\s*fin|levfin|lbo|mezz|high[-\s]?yield)\b": "IB LevFin",
    r"\b(syndicate|bookrunner)\b": "IB Syndicate",
    r"\b(structured\s+finance|securiti[sz]ation|abs|clo)\b": "IB Structured",
    r"\b(project\s+finance|infrastructure\s+finance|ppp)\b": "IB Project/Infra",
    r"\b(restructuring|special\s+situations)\b": "IB Restructuring",
    r"\b(cash\s+management|gps|global\s+payments?)\b": "TxB Cash/Payments",
    r"\b(trade\s+finance|letters?\s+of\s+credit)\b": "TxB Trade",
    r"\b(working\s+capital|scf|receivables\s+finance)\b": "TxB SCF",
    r"\b(export\s+finance|eca)\b": "TxB Export",
    r"\b(trade\s+support|trade\s+capture|prime\s+(?:brokerage|services)|clearing)\b": "Ops Markets Support",
    r"\b(private\s+equity|lbo)\b": "PE",
    r"\b(venture\s+capital|series\s+[abcde])\b": "VC",
    r"\b(hedge\s+fund)\b": "HF/Alts",
    r"\b(lombard|wealth\s+lending)\b": "Wealth lending",
    r"\b(trust|fiduciary|estate\s+planning)\b": "Wealth trust",
    r"\b(investment\s+advis)\b": "Wealth advisory",
    r"\b(devops|sre|kubernetes|cloud)\b": "IT platform",
    r"\b(application\s+support|help\s*desk)\b": "IT support",
    r"\b(e[-\s]?trading|market\s+data)\b": "IT markets tech",
    r"\b(data\s+scientist|ml|nlp|llm)\b": "Data Science",
    r"\b(data\s+engineer|databricks|spark|airflow|dbt)\b": "Data Eng",
    r"\b(power\s*bi|tableau|digital\s+analytics|a/?b\s*test)\b": "Data Analytics",
    r"\b(quants?|strats?)\b": "Quant",
    r"\b(product\s+control|pnl|ipv)\b": "PC/IPV",
    r"\b(accounting|gl|ifrs|consolidation)\b": "Accounting",
    r"\b(financial\s+report)\b": "Fin reporting",
    r"\b(fp&a|budget|forecast)\b": "FP&A",
    r"\b(internal\s+audit|sox)\b": "Internal audit",
    r"\b(mortgage|hipotecario|baufinanzierung)\b": "Retail mortgage",
    r"\b(call\s*center|contact\s*center|ccc)\b": "Retail CCC",
    r"\b(company\s+secretary|domiciliation)\b": "CoSec/Domiciliation",
}


# Précompilation (respecte l'ordre: overrides -> règles)
_RULES_COMPILED: list[tuple[re.Pattern, str, str]] = [
    *[(re.compile(p), c, "manual override") for p, c in MANUAL_OVERRIDES],
    *[(re.compile(p), c, WHY_TAGS.get(p, "")) for p, c in RULE_BASED_CLASSIFICATION.items()]
]


# -------------------------------------------------------------
# Classification
# -------------------------------------------------------------

def classify_by_rules(text: str) -> Optional[str]:
    if not text:
        return None
    lower_clean = _soft_normalize(text)
    for regex, category, _ in _RULES_COMPILED:
        if regex.search(lower_clean):
            return category
    return None


def classify_job_with_why(text: str) -> tuple[str, str]:
    if not text:
        return ("Autre", "—")
    lower_clean = prep_text(text)
    for regex, category, why_tag in _RULES_COMPILED:
        m = regex.search(lower_clean)
        if m:
            matched = m.group(0)
            key = (why_tag or matched).strip()
            if len(key) > 60:
                key = key[:57] + "..."
            return (category, f"{key}  |  {regex.pattern}")
    return ("Autre", "—")


def classify_job(text: str, location: str = "") -> str:
    return classify_by_rules(text) or "Autre"


# -------------------------------------------------------------
# Normalisation du type de contrat
# -------------------------------------------------------------

def normalize_contract_type(title: str, raw_text: str | None) -> str:
    combined_text = strip_accents(f"{raw_text or ''} {title or ''}").lower().replace('-', ' ').replace('_', ' ')
    specific_terms = {
        'stage': 'stage', 'internship': 'stage', 'intern': 'stage', 'stagiaire': 'stage', 'summer internship': 'stage',
        'alternance': 'alternance', 'apprentissage': 'alternance', 'apprenticeship': 'alternance',
        'alternant': 'alternance', 'apprenti': 'alternance', 'work study': 'alternance',
        'contrat pro': 'alternance', 'professionalisation': 'alternance',
        'cdd': 'cdd', 'contrat a duree determinee': 'cdd', 'temporary': 'cdd', 'contract': 'cdd', 'interim': 'cdd',
        'freelance': 'freelance', 'independant': 'freelance', 'contractor': 'freelance',
        'v i e': 'vie', 'vie': 'vie',
        'graduate program': 'cdi', 'graduate': 'cdi', 'trainee program': 'cdi',
        'part time': 'cdi', 'temps partiel': 'cdi', 'full time': 'cdi',
    }
    for k, v in specific_terms.items():
        if k in combined_text:
            return v

    seniority_implies_cdi = {
        'analyst', 'associate', 'vp', 'vice president', 'director', 'managing director',
        'manager', 'specialist', 'executive', 'officer', 'engineer', 'lead', 'head'
    }
    for k in seniority_implies_cdi:
        if k in combined_text:
            return 'cdi'

    generic_terms = {'cdi': 'cdi', 'contrat a duree indeterminee': 'cdi', 'permanent': 'cdi', 'regular': 'cdi'}
    for k, v in generic_terms.items():
        if k in combined_text:
            return v

    return "non-specifie"


# -------------------------------------------------------------
# Enrichissement localisation (optionnel)
# -------------------------------------------------------------

try:
    with open(Path(__file__).parent / "city_country.pkl", "rb") as f:
        CITY_COUNTRY = pickle.load(f)
except FileNotFoundError:
    print("[CLASSIFIER] WARN: 'city_country.pkl' introuvable.")
    CITY_COUNTRY = {}


def enrich_location(raw_location: str | None) -> str | None:
    if not raw_location:
        return None
    lower = raw_location.lower()
    for city, country in CITY_COUNTRY.items():
        if city.lower() in lower:
            return f"{raw_location} ({country})"
    return raw_location


__all__ = [
    "strip_accents",
    "RULE_BASED_CLASSIFICATION",
    "classify_by_rules",
    "classify_job",
    "classify_job_with_why",
    "normalize_contract_type",
    "enrich_location",
]
