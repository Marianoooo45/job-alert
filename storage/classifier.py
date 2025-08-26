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

# --- Normalisation légère pour tolérer les variantes de genre/slash ---
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
    # Cas remontés — on redirige vers Admin/EA
    (r"\bglobal\s+markets?\b.{0,20}\bexecutive\s+assistant\b", "Administrative / Executive Assistant"),
    (r"\bmarkets?\s+ea\b", "Administrative / Executive Assistant"),  # EA = Executive Assistant
    (r"\bexecutive\s+assistant\b.{0,20}\b(global\s+)?markets?\b", "Administrative / Executive Assistant"),
]


# -------------------------------------------------------------
# RÈGLES DE BASE (cascade)
# -------------------------------------------------------------

RULE_BASED_CLASSIFICATION: dict[str, str] = {
    # ---------- GARDE-FOUS ----------
    r"\btrade\b(?!r|ing)\b.{0,20}\b(transaction|services?|processing|operations?|ops?|operator|analyst|control|support)\b": "Operations — Middle Office",
    r"\b(transaction|services?|processing|operations?|ops?|operator|analyst|control|support)\b.{0,20}\btrade\b(?!r|ing)\b": "Operations — Middle Office",

    # Research early-career explicite
    r"\b(credit|equity|macro)\s+research\b.*\b(intern|internship|graduate|program(?:me)?|summer)\b": "Markets — Research & Strategy",
    r"\bresearch\s+analyst\b.*\b(intern|internship|graduate|program(?:me)?|summer)\b": "Markets — Research & Strategy",

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

    # ---------- INTERN / GRADUATE (par domaine) ----------
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
    r"\bdeveloppeur\b|\bingenieur\b|\bengineer\b": "IT / Engineering",
    r"\bsupport\s+technique\b": "IT / Engineering",
    r"\bsoftware\s+solutions?\s+development\b": "IT / Engineering",
    r"\bpricing\b.{0,20}\b(developer|development|engineer)\b": "IT / Engineering",
    r"\befx\b.{0,20}\b(developer|development|engineer|platform|devops)\b": "IT / Engineering",

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

    # ---------- ADMIN / EXECUTIVE ASSISTANT ----------
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
    r"\boperations?\s+(?:analyst|officer)\b": "Operations — Back Office / Settlement",
    r"\boperat(?:ions|oins)\s+processor\b": "Operations — Back Office / Settlement",
    r"\bdocument\s+administrator\b": "Operations — Back Office / Settlement",
    r"\banalista\s+operativo\b": "Operations — Back Office / Settlement",
    r"\bgestion\s+des\s+credits?\b": "Operations — Back Office / Settlement",
    r"\bcharge(?:\([^)]+\))?\s+operations?\b": "Operations — Back Office / Settlement",

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
    r"\bkundenberater\b(?:.{0,20}\bprivatkunden\b)?": "Retail Banking / Branch",

    # ---------- CORPORATE BANKING / COVERAGE ----------
    r"\b(relationship\s+(?:manager|management|mgmt)|rm\b(?![a-z])|coverage(?!\s*markets)|corporate\s+banking|cash\s+management|transaction\s+banking|gtb\b|gts\b|global\s+trade\s+solutions?|trade\s+finance|cib\s+coverage|corporate\s+and\s+institutional\s+banking|international\s+subsidiary\s+bank|export\s+finance|project\s+finance|structured\s+export\s+finance|working\s+capital|supply\s+chain\s+(?:finance|solutions)|escrow|bank\s+guarantees?|business\s+banking\s+manager|gps\b|payments?\s+(?:product|sales|manager)|account\s+manager|assistant\s+sales\s+manager)\b": "Corporate Banking / Coverage",
    r"\bglobal\s+capital\s+markets?\b.{0,40}\b(analyst|intern(?:ship)?|off[-\s]?cycle|industrial\s+placement|summer|graduate)\b": "Corporate Banking / Coverage",
    r"\bcharge(?:\([^)]+\))?\s+d'?affaires?\b": "Corporate Banking / Coverage",
    r"\bejecutivo/?a\s+banca\s+empresarial\b": "Corporate Banking / Coverage",
    r"\bejecutivo\s+clientes?\s+gran\s+empresa\b": "Corporate Banking / Coverage",
    r"\bejecutivo\s+negocios\b": "Corporate Banking / Coverage",
    r"\bfinancement\s+(?:pro|entreprises?|pro/ent)\b": "Corporate Banking / Coverage",
    r"\bmarches?\s+des\s+entreprises\b": "Corporate Banking / Coverage",
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
    r"\bcredit\s*&\s*portfolio\s+management\b": "Risk — Credit",
    r"\bcredit\s+portfolio\s+management\b": "Risk — Credit",
    r"\bcpm\b.{0,20}\b(credit|portfolio|risk)\b|\b(credit|portfolio|risk)\b.{0,20}\bcpm\b": "Risk — Credit",
    # à mettre juste AVANT la règle Sales existante
    r"\b(distribution)\b.{0,25}\b(ops?|operations?|processing|documentation)\b": "Operations — Back Office / Settlement",

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
    r"\bestructurador(?:a)?\b|\bestructuraci[oó]n\b": "Markets — Structuring",
    
    # ---------- MARKETS (Trading) ----------
    r"\b(trader?s?|trading|market\s+maker|prop(?:rietary)?\s+trading"
    r"|delta\s+one|flow\s+trading|options?|futures?|swaps?|swaptions?"
    r"|exotics?|repo|money\s+markets?\s+(?:trader?|trading|desk)"
    r"|g10|rfq|market\s+making|vwap|twap|algo(?:rithmic)?\s+trading"
    r"|hedg(?:e|ing)|delta\s+hedg(?:e|ing)|flow\s+credit|cash\s+equities"
    r"|xva|(?:otc|listed)\s+derivatives?)\b": "Markets — Trading",


    # ---------- BUY SIDE / WEALTH ----------
    r"\b(venture\s+capital|capital\s+risque|private\s+equity|pe\b|gp\/lp|fund\s+of\s+funds)\b": "Asset Management / Buy Side",
    r"\b(asset\s+management|buy[-\s]?side|portfolio\s+manager|fund\s+manager|gerant(?:e)?|gestion\s+d?actifs?|opcvm|ucits|aifm|fund\s+selector|multi-?manager|asset\s+allocation|fund\s+selection|manager\s+research|mandates?|managed\s+accounts?|sma\b|rfp\b|due\s+diligence\s+(?:manager|fund)|kiid|priips|aladdin)\b": "Asset Management / Buy Side",
    r"\binvestment\s+management\b": "Asset Management / Buy Side",

    r"\b(private\s+banker|banquier\s+prive(?:s|es)?|wealth\s+management|private\s+wealth|family\s+office|uhnw|hnw|private\s+banking|investment\s+advisor|financial\s+advis(?:or|er)|client\s+advis(?:or|er)y?|wealth\s+planner|estate\s+planning|succession|fiduciary|trust\s+(?:officer|services?)|discretionary\s+mandate|mandate\s+discretionnaire|lombard|credit\s+advisory|gestion\s+de\s+patrimoine|gestionnaire\s+prive?|banquero(?:a)?\s+(?:patrimonial|privado|personal)|premier\s+(?:services|bank(?:ing)?)|wpb\b|rbwm\b|wealth\s+lending)\b": "Wealth Management / Private Banking",
    r"\bclient\s+advis(?:or|er)\b": "Wealth Management / Private Banking",
    r"\badvis(?:or|er)\s+client\b": "Wealth Management / Private Banking",
    r"\bfinancial\s+solutions?\s+advisor\b": "Wealth Management / Private Banking",
    r"\bbanquier\s+patrimonial\b|\bconseill\w*\s+patrimonial\b": "Wealth Management / Private Banking",
    r"\bclient\s+service\s+(?:associate|executive)\b": "Wealth Management / Private Banking",
    r"\bbanque\s+privee\b|\bgestion\s+privee\b": "Wealth Management / Private Banking",

    # ---------- REAL ESTATE ----------
    r"\b(real\s+estate|immobilier|immobilien|property\s+(?:management|investing)|reits?|asset\s+manager\s+(?:logistics|bureaux|offices?|retail|residential|industrial|activites?)|acquisitions?\s+immobilieres?|promotion\s+immobiliere|lease\s+management|valuation|appraisal)\b(?!\s*(bank|banking|coverage))": "Real Estate / Investing",
    r"\bimmobilienmanagement\b": "Real Estate / Investing",

    # ---------- FALLBACKS ----------
    r"\b(investment\s+banking|global\s+banking|ib\s+(?:analyst|off[-\s]?cycle|internship|summer|graduate)|ibd\b|corporate\s+finance|m&a|mergers?\s+&\s+acquisitions?)\b": "Corporate Banking / Coverage",
    r"\brisk\s+management\b": "Risk — Operational",
    r"\b(fixed\s+income|equities|equity|fx|forex|rates|credit|commodit(?:y|ies))\b(?:(?!research|structur|trading)[\s\w]{0,30})\b(analyst|intern(?:ship)?|off[-\s]?cycle|industrial\s+placement|summer)\b": "Markets — Sales",
}


# =============================================================
# RÈGLES PRIORITAIRES (ajout de nouvelles feuilles + disambig)
# =============================================================

_NEW_RULES_HIGH_PRIORITY: dict[str, str] = {
    # --- "Trade" générique (pas trader/trading) : TFL / NCT / doc / ops -> pas Trading
    r"\btfl\b.{0,30}\btrade\b": "Transaction Banking — Trade Finance",
    r"\btrade\b\s*[-–—]?\s*(?:nct|doc|docs?|ops?|operations?|processing|documentation)\b": "Operations — Markets Support (Trade Support / Booking / Prime / Clearing)",
    # Variante plus large : si 'trade' non suivi de 'r' ou 'ing' ET présence d’un mot back/ops
    r"\btrade\b(?!r|ing)\b.{0,25}\b(ops?|operations?|documentation|processing|management|servicing)\b":
    "Operations — Markets Support (Trade Support / Booking / Prime / Clearing)",
    # --- Ops IT / Reconciliations autour des dérivés : pas Trading
    r"\b(ops?|operations?|it operations?|reconciliations?)\b.{0,30}\b(listed|derivatives?|futures?|options?)\b":
    "Operations — Markets Support (Trade Support / Booking / Prime / Clearing)",

    r"\b(listed|derivatives?|futures?|options?)\b.{0,30}\b(ops?|operations?|it operations?|reconciliations?)\b":
    "Operations — Markets Support (Trade Support / Booking / Prime / Clearing)",
    # --- Quant / Strategy (prend la main avant les règles "graduate+markets") ---
    r"\b(quant|quantitative)\b.{0,12}\b(strategy|strategist|strats?)\b.{0,40}\b(intern|internship|summer|graduate|analyst|associate)\b":
        "Quant — Research / Strats",
    r"\b(credit|rates?|fx|macro|equit(?:y|ies)|commodit(?:y|ies))\b.{0,12}\b(strategy|strategist|strategies)\b.{0,40}\b(intern|internship|summer|graduate|analyst|associate)\b":
        "Markets — Research & Strategy",
    
    # -------- Markets — Structuring (PRIORITAIRE) --------
    # Exclut explicitement sales/ops/IT/structured finance pour éviter les faux positifs
    r"(?!(?=.*\b(sales|vendeur|distribution|operations?|middle\s*office|trade\s+support|booking|developer|engineer|it|murex|technology|support|product\s+control|structured\s+finance)\b))\b("
    r"structurer|structuring|produits?\s+structures?|structured\s+products?|"
    r"term\s*sheet|pay[\s-]*off|pay[\s-]*out|"
    r"exotic(?:s)?\s*(?:options?|products?)?|autocall(?:able)?|barriers?|quanto|"
    r"binary\s+options?|cliquet|basket|reverse\s+convertible|phoenix"
    r"|"
    r"estructurador(?:a)?|estructuraci[oó]n|estruturador(?:a)?|estrutura[cç][aã]o|"
    r"strutturazione|strutturatore|strukturierer"
    r")\b": "Markets — Structuring",

    # --- Middle/Back/Support autour du "trade" ---
    r"\b(otc|listed)\b.{0,15}\b(transaction|trade)\s+management\b": "Operations — Markets Support (Trade Support / Booking / Prime / Clearing)",
    r"\btrade\s+(management|capture|booking|support)\b": "Operations — Markets Support (Trade Support / Booking / Prime / Clearing)",
    r"\bmiddle\s+officer?\b.{0,20}\b(trade|booking|capture|mo)\b": "Operations — Middle Office",
    r"\b(back[-\s]?office|operations?)\b.{0,25}\b(forex|fx|money\s+market|mm)\b": "Operations — Back Office / Settlement",
    r"\bloan\s+(documentation|processing)\b.{0,20}\b(trading)\b": "Operations — Markets Support (Trade Support / Booking / Prime / Clearing)",

    # --- Surveillance / Contrôles ---
    r"\b(market|trade)\s+surveillance\b": "Compliance / Financial Crime (AML/KYC)",
    r"\bbusiness\s+controls?\b|\bbcu\b": "Risk — Operational",

    # --- Transaction & Trade Finance / Cash Mgmt ---
    r"\btrade\s+financ(?:e|ing)\b": "Transaction Banking — Trade Finance",
    r"\bcash\s*&?\s*trade\b|\bcash\s+management\b": "Transaction Banking — Cash Management / Payments",
    r"\bimplementation\b.{0,20}\b(cash|trade)\b": "Transaction Banking — Cash Management / Payments",

    # --- Trésorerie / ALM ---
    r"\balm\b|\btreasury\b": "Treasury / ALM / Liquidity",

    # --- Risque crédit (évite Markets) ---
    r"\bcredit\s+risks?\b": "Risk — Credit",
    r"\bcredit\s+maint(?:enance)?\b": "Operations — Back Office / Settlement",

    # --- Stratégie / Research (évite Trading) ---
    r"\b(emerging\s+markets?)\b.{0,20}\bstrateg(?:y|ist)\b": "Markets — Research & Strategy",
    r"\bstrateg(?:y|ist)\b.{0,25}\b(macro|credit|equit(?:y|ies)|fx|rates?)\b": "Markets — Research & Strategy",

    # --- FX support / eTrading support ---
    r"\btrade\s+enabler\b|\bgfx\b.{0,20}\b(voic|voice|spot)\b": "Operations — Markets Support (Trade Support / Booking / Prime / Clearing)",

    # -------- IT / Ops autour des produits structurés --------
    r"\b(structured\s+products?)\b.{0,25}\b(developer|engineer|murex|technology|platform|devops|support)\b": "IT — Markets Tech (eTrading / Market Data)",
    r"\b(structured\s+products?)\b.{0,25}\b(operations?|middle\s*office|trade\s+support|booking|capture)\b": "Operations — Markets Support (Trade Support / Booking / Prime / Clearing)",

    # -------- Operations / Markets Support ciblé --------
    r"\b(trade\s+support)\b": "Operations — Markets Support (Trade Support / Booking / Prime / Clearing)",
    r"\b(trade\s+capture|trade\s+booking|booking\s+(?:analyst|support))\b": "Operations — Markets Support (Trade Support / Booking / Prime / Clearing)",
    r"\b(prime\s+(?:brokerage|services)|\bpbs?\b)\b": "Operations — Markets Support (Trade Support / Booking / Prime / Clearing)",
    r"\b((?:etd|listed|futures?|options?|otc|derivatives?)\s+clearing|clearing\s+(?:member|broker|services?))\b": "Operations — Markets Support (Trade Support / Booking / Prime / Clearing)",
    r"\bglobal\s+markets?\b.{0,30}\boperations?\b": "Operations — Markets Support (Trade Support / Booking / Prime / Clearing)",
    r"\bhead\s+of\b.{0,10}\boperations?\b.{0,30}\b(global\s+markets?)\b": "Operations — Middle Office",

    # -------- IB (granulaire) --------
    r"\b(m&a|mergers?\s+&\s+acquisitions?)\b": "IB — M&A Advisory",
    r"\b(ecm|equity\s+capital\s+markets?|ipo|follow[-\s]?on|rights?\s+issue|accelerated\s+bookbuild|abb|block\s+trade)\b": "IB — Equity Capital Markets (ECM)",
    r"\b(dcm|debt\s+capital\s+markets?|bond\s+(?:issuance|origination)|mt[np]\b|emtns?|liability\s+management|(tender|exchange)\s+offer|consent\s+solicitation)\b": "IB — Debt Capital Markets (DCM)",
    r"\b(lev(?:eraged)?\s*fin(?:ance)?|levfin|lbo|unitranche|mezz(?:anine)?|high[-\s]?yield)\b": "IB — Leveraged Finance",
    r"\b(syndicate|syndication|book\s*runner|book[-\s]*building|bookrunner)\b": "IB — Syndicate",
    r"\b(structured\s+finance|securiti[sz]ation|abs\b|clo\b|rmbs|cmbs|abcp|conduit|warehouse\s+facility)\b": "IB — Structured Finance / Securitization",
    r"\b(project\s+finance|infrastructure\s+finance|ppp|concession|non[-\s]?recourse)\b": "IB — Project & Infrastructure Finance",
    r"\b(restructuring|special\s+situations|distressed\s+(?:debt|assets?|m&a)|turnaround)\b": "IB — Restructuring / Special Situations",

    # -------- Buy Side (feuilles dédiées) --------
    r"\b(private\s+equity|buy[-\s]?out(s)?|lbo\b|general\s+partner|limited\s+partner)\b": "Private Equity",
    r"\b(venture\s+capital|seed|series\s+[abcde]\b|pre[-\s]?seed|vc\b)\b": "Venture Capital",
    r"\b(hedge\s+funds?|multi[-\s]?strategy|long/?short|global\s+macro|event[-\s]?driven|arbitrage|systematic|cta\b|managed\s+futures)\b": "Hedge Funds / Alternatives",

    # -------- Wealth (feuilles dédiées) --------
    r"\b(lombard|wealth\s+lending|margin\s+loan|credit\s+advisory)\b": "Wealth — Lending & Credit Advisory",
    r"\b(trust\s+(?:officer|services?)|fiduciary|estate\s+planning|succession)\b": "Wealth — Trust / Fiduciary / Estate Planning",
    r"\b(investment\s+advis(?:or|ory))\b": "Wealth — Investment Advisory",

    # -------- IT (sous-feuilles) --------
    r"\b(developer|software\s+engineer|full\s?stack|front\s?end|frontend|back\s?end|typescript|react|angular|node\.?js?|python|java|c\+\+|c#|php|go|golang)\b": "IT — Software Engineering",
    r"\b(cyber\s*security|soc\b|siem\b|pentest|appsec|infosec|red\s+team|secops)\b": "IT — Cybersecurity / SecOps",
    r"\b(devops|sre|platform|cloud|kubernetes|docker|terraform)\b": "IT — Platform / Cloud / SRE / DevOps",
    r"\b(sap|salesforce|servicenow)\b": "IT — Enterprise Apps (SAP / Salesforce / ServiceNow)",
    r"\b(application\s+support|prod(?:uction)?\s+support|help\s*desk|service\s+desk|desktop\s+support|l[12]\b)\b": "IT — Application / Production Support & Helpdesk",
    r"\b(e[-\s]?trading|etrading|market\s+data|low[-\s]?latency)\b": "IT — Markets Tech (eTrading / Market Data)",
    r"\bfx\b.*\bit\s+support\b": "IT — Application / Production Support & Helpdesk",
    r"\bmurex\b.*\b(specialist|consultant|analyst|support|developer|engineer)\b": "IT — Markets Tech (eTrading / Market Data)",

    # -------- Data / Quant (sous-feuilles) --------
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
    r"\b(transformation\s+office|change\s+manager|operating\s+model|target\s+operating\s+model|tom\b)\b": "Transformation Office / Change",
    r"\b(post[-\s]?merger\s+integration|pmi\b)\b": "Management Consulting",
    r"\b(management\s+consult(ing|ant))\b": "Management Consulting",

    # -------- Finance Control / Accounting / Audit --------
    r"\b(product\s+control|p&?l\b|pnl\b|ipv|independent\s+price\s+verification|valuation(?:s)?\s+control)\b": "Product Control / IPV",
    r"\b(account(?:ing)?|general\s+ledger|gl\b|ifrs|us\s+gaap|consolidation|group\s+reporting)\b": "Accounting / GL / Consolidation",
    r"\b(financial\s+report(?:ing)?)\b": "Financial Reporting",
    r"\b(fp&a|budget(?:ing)?|forecast(?:ing)?|planning)\b": "FP&A / Budgeting / Planning",
    r"\b(internal\s+audit|sox\b)\b": "Internal Audit / SOX",

    # -------- Retail (sous-feuilles) --------
    r"\b(call\s*center|contact\s*center|callcenter|ccc)\b": "Retail Banking — Contact Center / CCC",
    r"\b(mortgage|baufinanzierung|hipotecario)\b": "Retail Banking — Mortgage / Housing Loans",
    r"\b(conseiller\s+pro|sme\s+banking|small\s+business\s+banker|business\s+advisor)\b": "Retail Banking — Small Business / Pro Advisors",

    # -------- Legal (granulaire) --------
    r"\b(company\s+secretary|domiciliation)\b": "Legal — Company Secretary / Domiciliation",
    r"\b(privacy|data\s+protection|dpo|rgpd|gdpr)\b": "Legal — Privacy / Data Protection (DPO)",
    r"\b(fiscaliste|tax|fiscal(?:ite|idad))\b": "Legal — Tax / Fiscal",
    r"\b(contract\s+manager|contracts?|commercial\s+contracts?)\b": "Legal — Contracts / Procurement",
    r"\b(juriste|lawyer|attorney|legal\s+counsel)\b": "Legal — Corporate / Commercial",

    # -------- Reroutage explicite --------
    r"\bcustomer\s+journey\s+(?:specialist|manager|lead)\b": "Design / Marketing / Comms",
}

# Mise en tête des nouvelles règles (priorité)
RULE_BASED_CLASSIFICATION = {**_NEW_RULES_HIGH_PRIORITY, **RULE_BASED_CLASSIFICATION}


# -------------------------------------------------------------
# WHY (tags courts pour debug)
# -------------------------------------------------------------

WHY_TAGS: dict[str, str] = {
    _SPECIAL_GM_ST_REGEX: "gm/s&t intern → sales",
    # tag pour la règle structuring prioritaire
    r"(?!(?=.*\b(sales|vendeur|distribution|operations?|middle\s*office|trade\s+support|booking|developer|engineer|it|murex|technology|support|product\s+control|structured\s+finance)\b))\b(structurer|structuring|produits?\s+structures?|structured\s+products?|term\s*sheet|pay[\s-]*off|pay[\s-]*out|exotic(?:s)?\s*(?:options?|products?)?|autocall(?:able)?|barriers?|quanto|binary\s+options?|cliquet|basket|reverse\s+convertible|phoenix|estructurador(?:a)?|estructuraci[oó]n|estruturador(?:a)?|estrutura[cç][aã]o|strutturazione|strutturatore|strukturierer)\b": "structuring keywords",
    r"\bglobal\s+markets?\b(?:(?!executive|assistant|ea|product\s+control|operations?|murex|support)[\s\w]{0,40})\b(analyst|intern(?:ship)?|off[-\s]?cycle|industrial\s+placement|summer|graduate)\b": "GM + early-career",
    r"\binsight\s+week\b": "insight week",
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
    # tags pour nouvelles feuilles (quelques exemples)
    r"\b(ecm|equity\s+capital\s+markets?)\b": "IB ECM",
    r"\b(dcm|debt\s+capital\s+markets?)\b": "IB DCM",
    r"\b(lev(?:eraged)?\s*fin|levfin|lbo|mezz|high[-\s]?yield)\b": "IB LevFin",
    r"\b(structured\s+finance|securit)\b": "IB Structured",
    r"\b(project\s+finance|infrastructure\s+finance|ppp)\b": "IB Project/Infra",
    r"\b(trade\s+support|trade\s+capture|prime\s+(?:brokerage|services)|clearing)\b": "Ops Markets Support",
    r"\b(lombard|wealth\s+lending)\b": "Wealth lending",
    r"\b(investment\s+advis)\b": "Wealth advisory",
    r"\b(devops|sre|kubernetes|cloud)\b": "IT platform",
    r"\b(application\s+support|help\s*desk)\b": "IT support",
    r"\b(e[-\s]?trading|market\s+data)\b": "IT markets tech",
    r"\b(data\s+scientist|ml|nlp|llm)\b": "Data Science",
    r"\b(data\s+engineer|databricks|spark|airflow|dbt)\b": "Data Eng",
    r"\b(power\s*bi|tableau|digital\s+analytics|a/?b\s*test)\b": "Data Analytics",
    r"\b(product\s+control|pnl|ipv)\b": "PC/IPV",
    r"\b(accounting|gl|ifrs|consolidation)\b": "Accounting",
    r"\b(financial\s+report)\b": "Fin reporting",
    r"\b(fp&a|budget|forecast)\b": "FP&A",
    r"\b(internal\s+audit|sox)\b": "Internal audit",
    r"\b(mortgage|hipotecario|baufinanzierung)\b": "Retail mortgage",
    r"\b(call\s*center|contact\s*center|ccc)\b": "Retail CCC",
    r"\b(company\s+secretary|domiciliation)\b": "CoSec/Domiciliation",
}


# Précompilation (overrides d'abord, puis règles)
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

# COUNTRY NORMALIZATION (explicit country mention only)
# -------------------------------------------------------------
# Usage:
#   info = normalize_country_from_location(raw_location)
#   -> {'code': 'US', 'name': 'United States', 'confidence': 'high'}  OR  None
#
# Intégration :
#   - Appelle cette fonction sur le champ "lieu"/"raw_location".
#   - Stocke info['code'] / info['name'] / info['confidence'] dans ta DB.
#   - Pas de fallback villes → pays (volontairement limité à pays explicites).
# -------------------------------------------------------------

# Canonical countries (ISO alpha-2 -> canonical English name)
# --- Canonical countries (ISO alpha-2 -> canonical English name) — COMPLETED/FIXED ---
_COUNTRY_CANON = {
    "AE": "United Arab Emirates",
    "AR": "Argentina",
    "AT": "Austria",
    "AU": "Australia",
    "BD": "Bangladesh",
    "BE": "Belgium",
    "BG": "Bulgaria",
    "BH": "Bahrain",
    "BM": "Bermuda",
    "BR": "Brazil",
    "BY": "Belarus",
    "CA": "Canada",
    "CH": "Switzerland",
    "CL": "Chile",
    "CN": "China",
    "CO": "Colombia",
    "CR": "Costa Rica",
    "CU": "Cuba",
    "CZ": "Czechia",
    "DE": "Germany",
    "DK": "Denmark",
    "EE": "Estonia",
    "EG": "Egypt",
    "ES": "Spain",
    "FI": "Finland",
    "FR": "France",
    "GB": "United Kingdom",
    "GR": "Greece",
    "HK": "Hong Kong",
    "HN": "Honduras",
    "HR": "Croatia",
    "HU": "Hungary",
    "ID": "Indonesia",
    "IE": "Ireland",
    "IL": "Israel",
    "IM": "Isle of Man",
    "IN": "India",
    "IS": "Iceland",
    "IT": "Italy",
    "JE": "Jersey",
    "JP": "Japan",
    "KE": "Kenya",
    "KR": "South Korea",
    "KW": "Kuwait",
    "KZ": "Kazakhstan",
    "LK": "Sri Lanka",
    "LT": "Lithuania",
    "LU": "Luxembourg",
    "LV": "Latvia",
    "MA": "Morocco",
    "MX": "Mexico",
    "MY": "Malaysia",
    "MU": "Mauritius",
    "NG": "Nigeria",
    "NL": "Netherlands",
    "NO": "Norway",
    "NZ": "New Zealand",
    "OM": "Oman",
    "PE": "Peru",
    "PH": "Philippines",  # fixed spelling
    "PK": "Pakistan",
    "PL": "Poland",
    "PT": "Portugal",
    "QA": "Qatar",
    "RO": "Romania",
    "RS": "Serbia",
    "RU": "Russia",
    "SA": "Saudi Arabia",
    "SE": "Sweden",
    "SG": "Singapore",
    "SI": "Slovenia",
    "SK": "Slovakia",
    "TH": "Thailand",
    "TR": "Turkey",
    "TW": "Taiwan",
    "UA": "Ukraine",
    "US": "United States",
    "UY": "Uruguay",
    "VE": "Venezuela",
    "VN": "Vietnam",
    "ZA": "South Africa",
    # ⚠️ Intentionally NOT adding codes that collide with US states in your data (PA, GA, TN, MD, NC, SC, VA, MO…)
}

# --- Synonyms/aliases -> ISO alpha-2 (keys are pre-normalized by prep_text: lowercase, accents removed) ---
_COUNTRY_ALIASES = {
    # AE — United Arab Emirates
    "emirats arabes unis": "AE", "united arab emirates": "AE", "uae": "AE", "u a e": "AE",
    "dubai": "AE", "abu dhabi": "AE", "sharjah": "AE",

    # AR — Argentina
    "argentine": "AR", "argentina": "AR", "buenos aires": "AR",

    # AT — Austria
    "autriche": "AT", "austria": "AT", "osterreich": "AT", "vienna": "AT", "wien": "AT",

    # AU — Australia
    "australie": "AU", "australia": "AU", "sydney": "AU", "melbourne": "AU", "brisbane": "AU", "perth": "AU",

    # BD — Bangladesh
    "bangladesh": "BD", "dhaka": "BD",

    # BE — Belgium
    "belgique": "BE", "belgium": "BE", "bruxelles": "BE", "brussels": "BE",

    # BG — Bulgaria
    "bulgarie": "BG", "bulgaria": "BG", "sofia": "BG",

    # BH — Bahrain
    "bahrein": "BH", "bahrain": "BH", "manama": "BH",

    # BM — Bermuda
    "bermudes": "BM", "bermuda": "BM",

    # BR — Brazil
    "bresil": "BR", "brasil": "BR", "brazil": "BR", "rio de janeiro": "BR", "sao paulo": "BR",

    # BY — Belarus
    "belarus": "BY", "bielorussie": "BY",

    # CA — Canada
    "canada": "CA", "toronto": "CA", "montreal": "CA", "vancouver": "CA",

    # CH — Switzerland
    "suisse": "CH", "switzerland": "CH", "schweiz": "CH", "geneva": "CH", "zurich": "CH",

    # CL — Chile
    "chili": "CL", "chile": "CL", "santiago": "CL",

    # CN — China (Mainland)
    "chine": "CN", "china": "CN", "beijing": "CN", "shanghai": "CN", "shenzhen": "CN",

    # CO — Colombia
    "colombie": "CO", "colombia": "CO", "bogota": "CO", "medellin": "CO",

    # CR — Costa Rica
    "costa rica": "CR", "san jose cr": "CR",

    # CU — Cuba
    "cuba": "CU", "la havane": "CU", "havana": "CU",

    # CZ — Czechia
    "tchequie": "CZ", "republique tcheque": "CZ", "republique tcheque": "CZ", "czechia": "CZ",
    "czech republic": "CZ", "prague": "CZ", "praga": "CZ",

    # DE — Germany
    "allemagne": "DE", "germany": "DE", "deutschland": "DE", "berlin": "DE",
    "munich": "DE", "munchen": "DE", "frankfurt": "DE",

    # DK — Denmark
    "danemark": "DK", "denmark": "DK", "copenhague": "DK", "copenhagen": "DK",

    # EE — Estonia
    "estonie": "EE", "estonia": "EE", "tallinn": "EE",

    # EG — Egypt
    "egypte": "EG", "egypt": "EG", "le caire": "EG", "cairo": "EG",

    # ES — Spain
    "espagne": "ES", "spain": "ES", "espana": "ES", "madrid": "ES", "barcelona": "ES",

    # FI — Finland
    "finlande": "FI", "finland": "FI", "helsinki": "FI",

    # FR — France (⚠️ keep to frequent/unique names)
    "france": "FR", "fr": "FR", "paris": "FR", "marseille": "FR", "lyon": "FR",

    # GB — United Kingdom
    "royaume uni": "GB", "royaume-uni": "GB", "united kingdom": "GB", "uk": "GB",
    "great britain": "GB", "england": "GB", "scotland": "GB", "wales": "GB", "northern ireland": "GB",
    "londres": "GB", "london": "GB", "edinburgh": "GB",

    # GR — Greece
    "grece": "GR", "greece": "GR", "ellada": "GR", "athenes": "GR", "athens": "GR",

    # HK — Hong Kong
    "hong kong": "HK", "hk": "HK", "hong kong sar": "HK",

    # HN — Honduras
    "honduras": "HN", "tegucigalpa": "HN",

    # HR — Croatia
    "croatie": "HR", "croatia": "HR", "zagreb": "HR",

    # HU — Hungary
    "hongrie": "HU", "hungary": "HU", "budapest": "HU",

    # ID — Indonesia
    "indonesie": "ID", "indonesia": "ID", "jakarta": "ID", "surabaya": "ID",

    # IE — Ireland
    "irlande": "IE", "ireland": "IE", "dublin": "IE",

    # IL — Israel
    "israel": "IL", "tel aviv": "IL", "jerusalem": "IL",

    # IM — Isle of Man
    "isle of man": "IM", "douglas isle of man": "IM",

    # IN — India
    "inde": "IN", "india": "IN",
    "mumbai": "IN", "bangalore": "IN", "bengaluru": "IN", "hyderabad": "IN",
    "chennai": "IN", "delhi": "IN", "new delhi": "IN", "gurgaon": "IN",
    "karnataka": "IN", "telangana": "IN",

    # IS — Iceland
    "islande": "IS", "iceland": "IS", "reykjavik": "IS",

    # IT — Italy
    "italie": "IT", "italy": "IT", "italia": "IT", "rome": "IT", "milan": "IT", "milano": "IT", "turin": "IT", "torino": "IT",

    # JE — Jersey
    "jersey": "JE", "saint helier": "JE",

    # JP — Japan
    "japon": "JP", "japan": "JP", "tokyo": "JP", "osaka": "JP",

    # KE — Kenya
    "kenya": "KE", "nairobi": "KE",

    # KR — South Korea
    "coree": "KR", "coree du sud": "KR", "republique de coree": "KR",
    "korea": "KR", "south korea": "KR", "republic of korea": "KR", "korea republic of": "KR",
    "seoul": "KR",

    # KW — Kuwait
    "koweit": "KW", "kuwait": "KW", "kuwait city": "KW",

    # KZ — Kazakhstan
    "kazakhstan": "KZ", "almaty": "KZ", "astana": "KZ", "noursoultan": "KZ",

    # LK — Sri Lanka
    "sri lanka": "LK", "sri lanka": "LK", "lanka": "LK", "colombo": "LK",

    # LT — Lithuania
    "lituanie": "LT", "lithuania": "LT", "vilnius": "LT",

    # LU — Luxembourg
    "luxembourg": "LU",

    # LV — Latvia
    "lettonie": "LV", "latvia": "LV", "riga": "LV",

    # MA — Morocco
    "maroc": "MA", "morocco": "MA", "casablanca": "MA", "rabat": "MA",

    # MX — Mexico
    "mexique": "MX", "mexico": "MX", "mexico city": "MX",

    # MY — Malaysia
    "malaisie": "MY", "malaysia": "MY", "kuala lumpur": "MY",

    # MU — Mauritius
    "maurice": "MU", "mauritius": "MU",

    # NG — Nigeria
    "nigeria": "NG", "lagos": "NG", "abuja": "NG",

    # NL — Netherlands
    "pays-bas": "NL", "netherlands": "NL", "holland": "NL", "amsterdam": "NL", "rotterdam": "NL",

    # NO — Norway
    "norvege": "NO", "norway": "NO", "oslo": "NO",

    # NZ — New Zealand
    "nouvelle zelande": "NZ", "new zealand": "NZ", "auckland": "NZ", "wellington": "NZ",

    # OM — Oman
    "oman": "OM", "muscat": "OM", "mascate": "OM",

    # PE — Peru
    "perou": "PE", "peru": "PE", "lima": "PE",

    # PH — Philippines
    "philippines": "PH", "manille": "PH", "manila": "PH", "ncr manila": "PH",

    # PK — Pakistan
    "pakistan": "PK", "karachi": "PK", "islamabad": "PK", "lahore": "PK",

    # PL — Poland
    "pologne": "PL", "poland": "PL", "polska": "PL", "varsovie": "PL", "warsaw": "PL",

    # PT — Portugal
    "portugal": "PT", "lisbonne": "PT", "lisbon": "PT", "porto": "PT",

    # QA — Qatar
    "qatar": "QA", "doha": "QA",

    # RO — Romania
    "roumanie": "RO", "romania": "RO", "bucarest": "RO", "bucharest": "RO",

    # RS — Serbia
    "serbie": "RS", "serbia": "RS", "belgrade": "RS", "central serbia": "RS",

    # RU — Russia
    "russie": "RU", "russia": "RU", "moscou": "RU", "moscow": "RU", "saint petersbourg": "RU", "saint petersburg": "RU",

    # SA — Saudi Arabia
    "arabie saoudite": "SA", "saudi arabia": "SA", "ksa": "SA", "riyadh": "SA", "djeddah": "SA", "jeddah": "SA",

    # SE — Sweden
    "suede": "SE", "sweden": "SE", "stockholm": "SE",

    # SG — Singapore
    "singapour": "SG", "singapore": "SG",

    # SI — Slovenia
    "slovenie": "SI", "slovenia": "SI", "ljubljana": "SI",

    # SK — Slovakia
    "slovaquie": "SK", "slovakia": "SK", "bratislava": "SK",

    # TH — Thailand
    "thailande": "TH", "thailand": "TH", "bangkok": "TH",

    # TR — Turkey
    "turquie": "TR", "turkey": "TR", "turkiye": "TR", "istanbul": "TR", "ankara": "TR",

    # TW — Taiwan
    "taiwan": "TW", "taipei": "TW",

    # UA — Ukraine
    "ukraine": "UA", "kiev": "UA", "kyiv": "UA",

    # UY — Uruguay
    "uruguay": "UY", "casa central uruguay": "UY", "montevideo": "UY",

    # US — United States (include common forms seen in your data)
    "etats unis": "US", "etats unis": "US", "etats unis": "US",  # (dedup ok)
    "etats-unis": "US", "united states": "US", "america": "US",
    "usa": "US", "u s a": "US", "u s": "US", "u s a": "US", "u s a": "US",
    "u s a": "US",  # final filler
    "new york": "US", "nyc": "US", "washington dc": "US", "dc": "US",
    "los angeles": "US", "san francisco": "US", "chicago": "US", "houston": "US",
    "miami": "US", "boston": "US", "dallas": "US", "seattle": "US",
    "phoenix": "US", "las vegas": "US", "atlanta": "US", "charlotte": "US",# Virginia
    "alexandria va": "US", "arlington va": "US", "annapolis md": "US", "fairfax va": "US",
    "fredericksburg va": "US", "richmond va": "US", "hunt valley md": "US", "hyattsville md": "US",
    # Pennsylvania
    "allentown pa": "US", "conshohocken pa": "US", "doylestown pa": "US", "devon pa": "US",
    "philadelphia pa": "US", "media pa": "US", "lahaska pa": "US", "langhorne pa": "US",
    "harrisburg pa": "US", "pennsylvania": "US",
    # North Carolina
    "greensboro nc": "US", "hickory nc": "US", "jacksonville nc": "US", "monroe nc": "US",
    "pineville nc": "US", "wilmington nc": "US", "asheville nc": "US", "arden nc": "US",
    "hendersonville nc": "US",
    # South Carolina
    "fort mill sc": "US", "greenville sc": "US", "south carolina": "US",
    # Georgia
    "alpharetta ga": "US", "brunswick ga": "US", "dalton ga": "US", "lawrenceville ga": "US",
    "loganville ga": "US", "su wanee ga": "US", "woodstock ga": "US", "georgia": "US",
    # Texas
    "austin tx": "US", "browns ville tx": "US", "grand prairie tx": "US",
    "fort worth tx": "US", "duncanville tx": "US", "sugar land tx": "US", "tyler tx": "US",
    "irving tx": "US", "san antonio tx": "US", "houston tx": "US", "texas": "US",
    # Florida
    "bonita springs fl": "US", "davie fl": "US", "delray beach fl": "US", "hollywood fl": "US",
    "jacksonville fl": "US", "largo fl": "US", "miami fl": "US", "naples fl": "US",
    "north port fl": "US", "orlando fl": "US", "tampa fl": "US", "venice fl": "US",
    "vero beach fl": "US", "florida": "US",
    # California
    "antioch ca": "US", "benicia ca": "US", "brentwood ca": "US", "concord ca": "US",
    "capitola ca": "US", "carlsbad ca": "US", "milpitas ca": "US", "paso robles ca": "US",
    "pinole ca": "US", "riverside ca": "US", "corona ca": "US", "fontana ca": "US",
    "red ding ca": "US", "san jose ca": "US", "san francisco ca": "US", "los angeles ca": "US",
    "california": "US",
    # New York / NJ
    "brooklyn ny": "US", "new york ny": "US", "pennington nj": "US", "east brunswick nj": "US",
    "princeton nj": "US", "new jersey": "US",
    # Other US states
    "boise id": "US", "coeur d alene id": "US", "rupert id": "US", "burley id": "US",
    "delta junction ak": "US", "anchorage ak": "US",
    "bellingham wa": "US", "kirkland wa": "US",
    "bozeman mt": "US", "livingston mt": "US",
    "madison tn": "US", "nashville tn": "US",
    "stamford ct": "US", "hartford ct": "US", "waterbury ct": "US",
    "detroit mi": "US", "dearborn mi": "US", "bloomfield hills mi": "US",
    "minnetonka mn": "US", "oak park heights mn": "US",
    "las vegas nv": "US", "reno nv": "US", "sparks nv": "US",
    "phoenix az": "US", "chandler az": "US", "apache junction az": "US", "gilbert az": "US",
    "yuma az": "US",
    "des moines ia": "US", "ea u claire wi": "US",
    "midvale ut": "US", "salt lake city ut": "US", "dripping springs tx": "US",
    "seward ak": "US", "thayne wy": "US",
    "valley city nd": "US",
    "westlake oh": "US",

    # VE — Venezuela
    "venezuela": "VE", "caracas": "VE",

    # VN — Vietnam
    "viet nam": "VN", "vietnam": "VN", "hanoi": "VN", "ho chi minh city": "VN", "saigon": "VN",

    # ZA — South Africa
    "afrique du sud": "ZA", "south africa": "ZA", "johannesburg": "ZA", "gauteng": "ZA", "cape town": "ZA",

    # EXTRA — explicit mentions spotted in parentheses of your data
    "bhutan": "BT",
    "tchad": "TD", "chad": "TD",
    # (No MO canonical to avoid clash with US state 'MO'; if needed, keep as alias with raw code)
    "macao": "MO", "macau": "MO",
}


# --- Regex builder pour alias (FIX) ---
def _alias_to_regex(alias: str) -> re.Pattern:
    # on aligne avec prep_text pour la clé mais on matche en IGNORECASE
    a = prep_text(alias).strip()
    if not a:
        # fallback defensi f: impossible en pratique avec nos alias actuels
        return re.compile(r"(?!x)x")
    parts = re.split(r"\s+", a)
    escaped = [re.escape(p) for p in parts if p]
    pattern = r"\b" + r"\s+".join(escaped) + r"\b"
    return re.compile(pattern, flags=re.IGNORECASE)


_COUNTRY_REGEXES: list[tuple[re.Pattern, str]] = [
    (_alias_to_regex(alias), iso) for alias, iso in _COUNTRY_ALIASES.items()
]

# Set ISO codes
_ISO2_SET = set(_COUNTRY_CANON.keys())

def _prep_for_country_scan(text: str) -> str:
    if not text:
        return ""
    t = prep_text(text)  # ta fonction utilitaire: lower + strip accents
    t = re.sub(r"[()\[\]{}|•·;:,/\\\-–—]", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t

# --- Helper: trouver toutes les occurrences pays dans le texte normalisé ---
def _scan_country_hits(text_norm: str) -> list[tuple[int, str]]:
    """
    Retourne [(start_index, ISO2), ...] pour chaque alias détecté dans text_norm.
    On travaille sur le texte pré-normalisé via _prep_for_country_scan.
    """
    hits: list[tuple[int, str]] = []
    for pat, iso in _COUNTRY_REGEXES:
        for m in pat.finditer(text_norm):
            hits.append((m.start(), iso))
    # left-most d'abord (puis ISO2 pour la stabilité)
    hits.sort(key=lambda t: (t[0], t[1]))
    return hits

def normalize_country_from_location(raw_location: str | None) -> dict | None:
    if not raw_location:
        return None

    # (A) codes ISO-2 explicites : fin OU avant parenthèses/virgule
    # - couvre: ", FR", "/ DE)", " GB (United Kingdom)", ", IN (Fiji Islands)"
    m = re.search(r"(?:^|[\s,(/-])([A-Z]{2})(?=\s*(?:$|[),(]))", raw_location.strip())
    if m:
        iso_up = m.group(1).upper()
        if iso_up in _ISO2_SET:
            return {"code": iso_up, "name": _COUNTRY_CANON.get(iso_up, iso_up), "confidence": "high"}


    # (A) code ISO-2 explicite en fin de chaîne (ex: ", PL", "/ FR)")
    m = re.search(r"[\s,(/-]([A-Z]{2})\)?\s*$", raw_location.strip())
    if m:
        iso_up = m.group(1).upper()
        if iso_up in _ISO2_SET:
            return {"code": iso_up, "name": _COUNTRY_CANON.get(iso_up, iso_up), "confidence": "high"}

    # (B) recherche multi-alias + position -> choisir le plus à gauche
    t = _prep_for_country_scan(raw_location)
    hits = _scan_country_hits(t)

    # (C) si rien trouvé, retente sans points (certaines sources ont "U.K." / "U.S.")
    if not hits:
        t2 = t.replace(".", " ")
        if t2 != t:
            hits = _scan_country_hits(t2)

    if hits:
        _, iso = hits[0]  # left-most
        return {"code": iso, "name": _COUNTRY_CANON.get(iso, iso), "confidence": "high"}

    return None


def maybe_append_country(raw_location: str | None) -> str | None:
    if not raw_location:
        return None
    info = normalize_country_from_location(raw_location)
    if info:
        if info["name"].lower() in (raw_location or "").lower():
            return raw_location
        return f"{raw_location} ({info['name']})"
    return raw_location

__all__ += [
    "normalize_country_from_location",
    "maybe_append_country",
]
