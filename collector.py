# Fichier: storage/classifier.py
# Version: 6.7.3 — Hotfix "Vendeurs Produits Structurés" (priorité Sales vs Structuring)
# -------------------------------------------------------------
# - Classification 100% par règles (regex) accent-insensibles
# - SPECIAL RULE prioritaire (affinée): ONLY "Global Markets / S&T / FICC" interns/graduates
#   → "Markets — Sales". On EXCLUT tout ce qui est Audit/Risk/Data/IT/ALM/ECM/DCM/etc.
# - Ajouts v6.7.3:
#   • Nouvelle règle prioritaire: "(assistant) vendeur·se / sales / distribution" à proximité
#     de "produits structurés / structured products" → "Markets — Sales" (évite les FP Structuring)
#   • WHY_TAGS synchronisés
# - Rappel v6.7.2:
#   • Structuring: suppression du faux positif "digital" générique (on garde digital/binary options)
#   • Legal keywords + GTS phrase
# - Normalisation du type de contrat et enrichissement localisation inchangés.
# -------------------------------------------------------------

from __future__ import annotations
import re
import pickle
import unicodedata
from pathlib import Path
from typing import Optional

# -------------------------------------------------------------
# Utils
# -------------------------------------------------------------

def strip_accents(text: str) -> str:
    """Supprime les accents pour rendre les regex accent-insensibles."""
    if not text:
        return ""
    return "".join(ch for ch in unicodedata.normalize("NFD", text) if unicodedata.category(ch) != "Mn")


# -------------------------------------------------------------
# REGLES — Taxonomie 2025 (ecrire SANS accents et en minuscule)
# L'ordre = la cascade. On scanne le texte normalise (minuscule, sans accents).
# -------------------------------------------------------------

# SPECIAL RULE (hyper stricte). On veut UNIQUEMENT les interns/graduates collees a Global Markets / S&T.
# - Evite les faux positifs: "internal", Audit, Risk, Data, IT, ALM, Corporate Banking, ECM/DCM, etc.
# - Evite "stage I/II/III" (niveau) qui n'est pas un stage (internat) francais.
_SPECIAL_GM_ST_REGEX = (
    r"(?!.{0,120}\b("
    r"capital\s+markets?|ecm\b|dcm\b|investment\s+banking|internal\s+audit|audit|risk|treasury|alm|"
    r"corporate\s+banking|cash\s+management|transaction\s+banking|\bcoverage(?!\s*markets)|"
    r"data\s+(?:analyst|scientist|engineer)|\bstrats?\b|quantitative\s+strats?|strategists?|"
    r"support|help\s*desk|l1|application\s+support|prod(?:uction)?\s+support|technology|tech\b|it\b)\b)"  # negative guardrail
    r"(?s)"  # allow '.' to span if needed (titles/descriptions)
    r"\b(?:"  # either: intern-word near GM/S&T ... OR ... GM/S&T near intern-word
      r"(?:\bintern(?!al)\b|internship|off[-\s]?cycle|industrial\s+placement|\bsummer\s+analyst\b|\bgraduate\b|placement|\bstage\b(?!\s*[ivx]+\b))"
      r".{0,40}?"
      r"(?:\bglobal\s+markets\b|\bsales\s*&\s*trading\b|\bsales\s+and\s+trading\b|\bs&?t\b|\bficc\b|"
      r"\bfx\b|\brates?\b|\bcredit\b|\bequities?\s+(?:sales|trading)\b|\bderivatives?\s+(?:sales|trading)\b)"
    r"|"
      r"(?:\bglobal\s+markets\b|\bsales\s*&\s*trading\b|\bsales\s+and\s+trading\b|\bs&?t\b|\bficc\b)"
      r".{0,40}?"
      r"(?:\bintern(?!al)\b|internship|off[-\s]?cycle|industrial\s+placement|\bsummer\s+analyst\b|\bgraduate\b|placement|\bstage\b(?!\s*[ivx]+\b))"
    r")\b"
)

# NB: On garde un dict (ordre preserve en Py3.7+) pour compat, + un mapping WHY_TAGS
RULE_BASED_CLASSIFICATION: dict[str, str] = {
    # ---------- SPECIAL (prioritaire absolu) ----------
    _SPECIAL_GM_ST_REGEX: "Markets — Sales",

    # ---------- TECH / DATA / CHANGE (prioritaire apres SPECIAL) ----------
    r"\b(developer|developpeur|software\s+engineer|full\s?stack|frontend|back\s?end|devops|cloud|sre|network|reseau|sysadmin|windows|linux|kubernetes|docker|terraform|sap|salesforce|servicenow|mobile|ios|android|architecte|software\s+architect|application|api|microservices|cicd|ci/?cd|typescript|react|angular|node\.?.?js?|python|java|c\+\+|c#|php|ruby|go|golang|(?:\.?net|dotnet)\b|tech(?:nical)?\s+lead|lead\s+(?:developer|engineer)|security|cyber(?:security)?|soc\b|siem\b|information\s+technology|market\s+data|application\s+support|prod(?:uction)?\s+support|middleware|soa\b|help(?:\s*desk)?|support\s+informatique|desktop\s+support|service\s+desk"
    r"|aws|azure|gcp|postgres(?:ql)?|mysql|oracle\s+dba|mssql|mongodb|redis|elasticsearch|ansible|chef(?:\s+(?:automate|server|infra|cookbooks?))?|puppet|jenkins|gitlab|github\s+actions|prometheus|grafana|splunk|datadog|new\s+relic"
    r"|okta|active\s+directory|\bad\b|office\s*365|m365|o365|exchange\s+online|intune|jamf|vmware|vcenter|vsphere|citrix|cisco|checkpoint|palo\s+alto|fortigate|zscaler|sailpoint|sso|saml|oauth|restful?\s+api|grpc|message\s+queue|\bmq\b|ibm\s+mq|tibco|mulesoft)\b": "IT / Engineering",

    r"\b(data\s+scientist|data\s+analyst(?:e)?|data\s+engineer|analytics\s+engineer|ml\s+engineer|machine\s+learning|deep\s+learning|nlp|llm|bi\b|power\s*bi|tableau|snowflake|databricks|dbt\b|spark|hadoop|airflow|kafka|lakehouse|sql|no\s?sql|quant\b|quantitative|modeller|modeler|model(?:ing|isation)|time\s+series|data\s+quality|data\s+governance|mdm\b|data\s+lineage|data\s+steward"
    r"|mlops|model\s+ops?|model\s+governance|model\s+validation|feature\s+store|feature\s+engineering|a/?b\s*testing|experimentation|causal|bayesian|time\s+series\s+forecast(?:ing)?|xgboost|pytorch|tensorflow|scikit-?learn|sklearn|pandas|numpy|data\s+specialist|strats?|quantitative\s+strats?|strategists?)\b": "Data / Quant",

    r"\b(project\s+manager|chef\s+de\s+projet|pmo\b|business\s+analyst|ba\b(?![a-z])|functional\s+analyst|product\s+owner|product\s+manager|scrum\s+master|agile\s+(?:coach|lead|project)|transformation|change\s+manager|moa|amoa|consultant\s+(?:moa|process|agile)"
    r"|user\s+stories?|backlog|roadmap|acceptance\s+criteria|\buat\b|requirements?\s+(?:gathering|analysis)|process\s+mapping|\bbpmn\b|\braci\b|business\s+case|stakeholder\s+management|\bjira\b|\bconfluence\b|\bkanban\b|\bscrum\b|chef\s+de\s+produit|chargee?\s+de\s+produit)\b": "Product / Project / PMO / Business Analysis",

    r"\b(strategy|strategie|strategic|consulting|consultant\s+strategie|transformation\s+office|operating\s+model"
    r"|tom\b|target\s+operating\s+model|diagnostic|benchmark(?:ing)?|due\s+diligence|\bpmi\b|post[-\s]?merger\s+integration|strategy\s+consultant)\b": "Strategy / Consulting / Transformation",

    r"\b(rh|ressources\s+humaines|human\s+resources|hrbp|people\s+partner|people\s+ops?|talent\s+acquisition|recruteur|recruiter|payroll(?!\s*(provider|service|vendor|outsourc))|paie|comp(?:ensation)?(?:\s*&\s*benefits)?|benefits|c&b|learning\s*&?\s*development|l&d|personalreferent"
    r"|talent\s+management|hris|sirh|workday|successfactors|cornerstone|people\s+analytics|employee\s+relations|labou?r\s+relations|reward|remuneration|remuneration|avantages?\s+sociaux|total\s+rewards?|organisation(?:al)?\s+development|\bod\b|org\s+design)\b": "HR / People",

    r"\b(marketing|communication|comms|brand|ux|ui|designer|growth|seo|sea|social\s+media|community\s+manager|content|pr|relations?\s+presse|copywriter|campaign\s+manager"
    r"|marcom|go[-\s]?to[-\s]?market|\bgtm\b|\babm\b|crm\s+marketing|email\s+marketing|content\s+marketing|performance\s+marketing|paid\s+(?:search|social|media)|media\s+buy(?:ing)?|digital\s+acquisition|display\s+advertising|product\s+marketing|growth\s+marketing)\b": "Design / Marketing / Comms",

    # ---------- OPERATIONS ----------
    r"\b(middle\s*office|trade\s+support|pnl|p&l|risk\s+pnl)\b": "Operations — Middle Office",

    r"\b(fund\s+accountant|fund\s+admin(?:istration)?|transfer\s+agent|ta\b|ta/agent|nav\s+production|ta\s+agent"
    r"|subscriptions?|redemptions?|switches|dealing\s+desk|unitholders?|(?:registered\s+)?shareholders?|investor\s+register|ta\s+(?:agent|ops?|kyc)|fatca|\bcrs\b(?:\s+reporting)?|nav\s+calc(?:ulation)?|transfer\s+agency)\b": "Operations — Fund Admin / TA",

    r"\b(back\s*office|settlement[s]?|reconciliation|confirmations?|clearing|corporate\s+actions?|static\s+data|reference\s+data|collateral|margin|custody|swift|sepa|ach\b|payments?\s+operations?|securities\s+services|cheques?|checks?\s+processing|cash(?:\s+and)?\s+cheques?|operations?\s+(?:summer|full-?time)\s+analyst|operations?\s+(?:analyst\s+program|program)"
    r"|nostro|breaks?|(?:settlement\s+)?fails?|ssi\b|standing\s+settlement\s+instructions|prematch(?:ing)?|affirmation|\bomgeo\b|\bctm\b|\balert\b|mt\d{3}|iso\s*20022|camt\d*|pacs\d*|samt\d*|\bstp\b|exceptions?\s+management|investor\s+services)\b": "Operations — Back Office / Settlement",

    # ---------- COMPLIANCE / FINANCE / LEGAL ----------
    r"\b(aml|kyc|onboarding|client\s+due\s+diligence|lcb\s?ft|lab/?ft|sanctions?|ofac|embargo|pep|adverse\s+media|transaction\s+monitoring|financial\s+crimes?|compliance|conformite|mifid|emir|mar|psd2|gfcd\b|regulatory\s+(?:relations|affairs)|(?:aml|kyc|pep|ofac|sanctions?|adverse\s+media|transaction)\s+screening"
    r"|cdd|edd|periodic\s+review|kyc\s+refresh|name\s+screening|watchlist|transaction\s+filtering|kyc\s+remediation|sarlaft|\bcip\b|\bfintrac\b|\bfcc\b|abac|anti[-\s]?bribery|anti[-\s]?corruption|fraud\s+(?:investigation|monitoring)|adverse\s+news|pep\s+review|sanciones?|embargos?|debida\s+diligencia|conozca\s+a\s+su\s+cliente)\b": "Compliance / Financial Crime (AML/KYC)",

    r"\b(audit|auditeur|auditing|controle\s+(?:interne|financier|de\s+gestion)|controleur\s+de\s+gestion|account(?:ing|ant)|general\s+ledger|gl\b|closing|cloture|ifrs|us\s+gaap|reporting|fp&a|p&l|profit\s*&\s*loss"
    r"|controlling|finance\s+business\s+partner|management\s+reporting|budget(?:ing)?|forecast(?:ing)?|variance\s+analysis|cost\s+controller|\bcapex\b|\bopex\b|working\s+capital|\bbfr\b|consolidation|\bconso\b|group\s+reporting|sap\s+fi/?co|\bfico\b)\b": "Audit / Finance Control / Accounting / FP&A",

    r"\b(juriste|lawyer|attorney|solicitor|barrister|abogado(?:a)?|legal\s+counsel|\blegal\b|avocat|avocate|paralegal|contract\s+manager|droit|corporate\s+law|fiscal(?:ite)?|privacy|data\s+protection|dpo|rgpd|gdpr|corporate\s+secretary|company\s+secretary|domiciliation)\b": "Legal / Juridique",

    # ---------- RETAIL / COVERAGE / TREASURY ----------
    r"\b(conseiller(?:e)?\s+(?:clientele|banque)|chargee?\s+de\s+clientele|directeur\s+d'agence|conseiller\s+pro|professionnels|retail\s+banking|front\s+office\s+agence|conseiller\s+commercial(?:\s+banque)?"
    r"|guichet(?:ier)?|chargee?\s+d'accueil|agencia|asesor(?:a)?\s+(?:de\s+servicios|universal)|ejecutivo\s+de\s+cuentas?|gerente\s+de\s+relacionamento\s+pessoa\s+fisica)\b": "Retail Banking / Branch",

    r"\b(relationship\s+(?:manager|management|mgmt)|rm\b(?![a-z])|coverage(?!\s*markets)|corporate\s+banking|coverage\s+corporate|origination\s+corporate|cash\s+management|transaction\s+banking|gtb\b|gts\b|global\s+trade\s+solutions?|trade\s+finance"
    r"|cib\s+coverage|coverage\s+(?:fig|mnc|mid(?:-)?caps?|large\s+caps?)|relationship\s+banker|global\s+subsidiaries|international\s+subsidiary\s+bank|cash\s+management\s+sales|trade\s+finance\s+sales|export\s+finance|project\s+finance|structured\s+export\s+finance|working\s+capital|supply\s+chain\s+(?:finance|solutions)|escrow|bank\s+guarantees?"
    r"|(?:equity|debt|global|sustainable)\s+capital\s+markets?|\becm\b|\bdcm\b|syndicate|leveraged\s+finance|levfin)\b": "Corporate Banking / Coverage",

    r"\b(treasury|tresorerie|alm|asset\s+liability\s+management|liquidity\s+risk|nsfr|lcr|ilaap|alco|irrbb|hedg(?:e|ing)|ftp|funds?\s+transfer\s+pricing"
    r"|balance\s+sheet\s+management|liquidity\s+buffer|contingency\s+funding\s+plan|\bcfp\b|liquidity\s+stress\s+testing|\blst\b|intraday\s+liquidity|gap\s+analysis|repricing\s+gaps?|behavio(?:u)?ral?\s+models?|deposit\s+stickiness|\beve\b|\bnii\b|interest\s+rate\s+risk\s+in\s+the\s+banking\s+book"
    r"|medium\s+(?:long|long[-\s]?term)\s+funding|mlt\s+funding|term\s+funding|wholesale\s+funding)\b": "Treasury / ALM / Liquidity",

    # ---------- RISKS ----------
    r"\b(market\s+risk|var|stressed\s+var|frtb|irc|xva)\b": "Risk — Market",

    r"\b(credit\s+risk|counterparty\s+risk|pd|lgd|ead|rating\s+model|scorecard|kreditrisiko|kreditrisikomanager|risques?\s+engagements?"
    r"|credit\s+analys(?:is|t)|credit\s+approval|credit\s+committee|obligor\s+rating|facility\s+rating|internal\s+rating|scorecards?|rating\s+models?|watchlist\s+process|limit\s+management|exposure\s+calculation|counterparty\s+credit|portfolio\s+credit|loan\s+book|covenants?)\b": "Risk — Credit",

    r"\b(operational\s+risk|op(?:erational)?\s*risk|rci|rcs|sox\s+controls?|non[-\s]?financial\s+risk|permanent\s+control|controle\s+permanent|business\s+risk"
    r"|rcsa|key\s+risk\s+indicators?|\bkri\b|loss\s+data\s+collection|\bldc\b|issue\s+management|control\s+testing|control\s+design|remediation\s+plan|sox\s+404|scenario\s+analysis|\bicaap\b|risk\s+officer|risk\s+control)\b": "Risk — Operational",

    r"\b(model\s+risk|model\s+validation|model\s+review|ml\s+validation|backtesting|benchmarking)\b": "Risk — Model Risk & Validation",

    # ---------- MARKETS (Sales / Structuring / Trading / Research) ----------
    # (1) Ventes Marches (generique) — FIX: charclass [,/-]
    r"(?:(?:markets?|trading|derivatives?|fx|forex|rates?|equities?|equity|credit|fixed\s+income|commodit(?:y|ies)|structured\s+products?)(?:\s|[,/-])+(?:\w+\s+){0,2}?(?:sales|distribution)\b|\bsales(?:\s|[,/-])+(?:trader|trading|markets?|derivatives?|fx|rates?|equities?|credit|structured\s+products?)\b|vendeur\s+(?:salle|marches?)"
    r"|sales[-\s]?trader|institutional\s+sales|investor\s+sales|client\s+coverage|coverage\s+sales|distribution\s+sales|buy[-\s]?side\s+clients?)": "Markets — Sales",

    # (1bis) Hotfix v6.7.3 — Vendeurs/Sales/Distribution <> Produits structurés (proximite)
    # → si 'vendeurs|sales|distribution' est present a proximite de 'produits structures|structured products',
    #   on force la categorie Sales meme si des mots-cle structuration existent ailleurs.
    r"\b(?:"
    r"(?:(?:assistants?\s+)?vendeurs?|sales|distribution)\b.{0,40}?\b(?:produits?\s+structures?|structured\s+products?)"
    r"|\b(?:produits?\s+structures?|structured\s+products?)\b.{0,40}?\b(?:(?:assistants?\s+)?vendeurs?|sales|distribution)"
    r")\b": "Markets — Sales",

    # (2) Structuration — FIX: ne plus matcher "digital" generique
    r"\b(structurer|structuring|produits?\s+structures?|structured\s+products?|payoff|exotic(?:s)?\s+structur(?:e|ing)"
    r"|term\s*sheet|payoff\s+design|autocall(?:able)?|barriers?|quanto|callable|(?:digital\s+(?:options?|calls?|puts?|coupons?|barriers?|payoffs?)|binary\s+options?|binaries)|cliquet|basket)\b": "Markets — Structuring",

    # (3) Trading (attention: ne pas matcher 'trade' tout seul)
    r"\b(trader?s?|trading|market\s+maker|prop(rietary)?\s+trading|delta\s+one|flow\s+trading|options?|futures?|swaps?|swaptions?|exotics?|repo|mm\b|money\s+markets?"
    r"|commodit(?:y|ies)|g10|em(?:erging)?\s+markets?|\brfq\b|market\s+making|\bvwap\b|\btwap\b|algo(?:rithmic)?\s+trading|hedg(?:e|ing)|delta\s+hedg(?:e|ing)|flow\s+credit|cash\s+equit(?:y|ies)|xva\b|\botc\b|listed\s+derivatives?)\b": "Markets — Trading",

    # (4) Recherche / Strategie marches
    r"\b(research\s+(?:analyst|associate)|equity\s+research|credit\s+research|macro\s+(?:research|strategy|strategist)|strategy\s+(?:analyst|associate)|sell[-\s]?side\s+research|buy[-\s]?side\s+research|(?:global|investment)\s+research"
    r"|initiation\s+of\s+coverage|(?:sector|company)\s+coverage|coverage\s+universe|thematic\s+research|earnings\s+model|\bdcf\b|top[-\s]?down|bottom[-\s]?up)\b": "Markets — Research & Strategy",

    # (4bis) Global Markets (générique) — fallback vers Sales si rien d’autre n’a matché
    r"\\bglobal\\s+markets?\\b": "Markets — Sales",

    # (4ter) Investment Banking (générique) — route vers Coverage/IB
    r"\\b(investment\\s+banking|ib\\s+(?:analyst|off[-\\s]?cycle|internship|summer|graduate)|ibd\\b)\\b": "Corporate Banking / Coverage",

    # ---------- BUY SIDE / WM ----------
    r"\b(asset\s+management|buy[-\s]?side|portfolio\s+manager|fund\s+manager|gerant(?:e)?|gestion\s+d?actifs?|opcvm|ucits|aifm|fund\s+selector|multi-?manager"
    r"|portfolio\s+construction|asset\s+allocation|multi[-\s]?asset|fund\s+selection|manager\s+research|mandates?|(?:separately\s+)?managed\s+accounts?|sma\b|\brfp\b|due\s+diligence\s+(?:manager|fund)|factsheets?|(?:kiid|priips?)|\bmorningstar\b|\blipper\b|\baifmd\b|investment\s+management)\b": "Asset Management / Buy Side",

    r"\b(private\s+banker|banquier\s+prive(?:s|es)?|wealth\s+management|private\s+wealth|family\s+office|uhnw|hnw"
    r"|private\s+banking|investment\s+advisor|financial\s+advis(?:or|er)|client\s+advis(?:or|er)y?|wealth\s+planner|estate\s+planning|succession|fiduciary|trust\s+(?:officer|services?)|discretionary\s+mandate|mandate\s+discretionnaire|lombard|credit\s+advisory|gestion\s+de\s+patrimoine|gestionnaire\s+prive?)\b": "Wealth Management / Private Banking",

    # ---------- REAL ESTATE ----------
    r"\b(real\s+estate|immobilier|property\s+(?:management|investing)|reits?|asset\s+manager\s+immobilier|property\s+manager|acquisitions?\s+immobilieres?|promotion\s+immobiliere|\bsiic\b|fonciere|baux?|lease\s+management|valuation|appraisal)\b(?!\s*(bank|banking|coverage))": "Real Estate / Investing",
}

WHY_TAGS: dict[str, str] = {
    # SPECIAL (why lisible)
    _SPECIAL_GM_ST_REGEX: "gm/s&t intern → sales",

    # IT
    r"\b(developer|developpeur|software\s+engineer|full\s?stack|frontend|back\s?end|devops|cloud|sre|network|reseau|sysadmin|windows|linux|kubernetes|docker|terraform|sap|salesforce|servicenow|mobile|ios|android|architecte|software\s+architect|application|api|microservices|cicd|ci/?cd|typescript|react|angular|node\.?.?js?|python|java|c\+\+|c#|php|ruby|go|golang|(?:\.?net|dotnet)\b|tech(?:nical)?\s+lead|lead\s+(?:developer|engineer)|security|cyber(?:security)?|soc\b|siem\b|information\s+technology|market\s+data|application\s+support|prod(?:uction)?\s+support|middleware|soa\b|help(?:\s*desk)?|support\s+informatique|desktop\s+support|service\s+desk"
    r"|aws|azure|gcp|postgres(?:ql)?|mysql|oracle\s+dba|mssql|mongodb|redis|elasticsearch|ansible|chef(?:\s+(?:automate|server|infra|cookbooks?))?|puppet|jenkins|gitlab|prometheus|grafana|splunk|okta|active\s+directory|\bad\b|o365|m365|vmware|citrix|palo\s+alto|fortigate|zscaler|sso|saml|oauth|restful?\s+api|grpc|mq|ibm\s+mq|tibco|mulesoft)\b": "developer",

    # Data / Quant (+ strats)
    r"\b(data\s+scientist|data\s+analyst(?:e)?|data\s+engineer|analytics\s+engineer|ml\s+engineer|machine\s+learning|deep\s+learning|nlp|llm|bi\b|power\s*bi|tableau|snowflake|databricks|dbt\b|spark|hadoop|airflow|kafka|lakehouse|sql|no\s?sql|quant\b|quantitative|modeller|modeler|model(?:ing|isation)|time\s+series|data\s+quality|data\s+governance|mdm\b|data\s+lineage|data\s+steward"
    r"|mlops|model\s+ops?|model\s+governance|feature\s+store|ab\s*testing|pytorch|tensorflow|sklearn|pandas|numpy|data\s+specialist|strats?|quantitative\s+strats?|strategists?)\b": "data / quant",

    # PM/BA
    r"\b(project\s+manager|chef\s+de\s+projet|pmo\b|business\s+analyst|ba\b(?![a-z])|functional\s+analyst|product\s+owner|product\s+manager|scrum\s+master|agile\s+(?:coach|lead|project)|transformation|change\s+manager|moa|amoa|consultant\s+(?:moa|process|agile)"
    r"|user\s+stories?|backlog|roadmap|acceptance\s+criteria|\buat\b|requirements?\s+(?:gathering|analysis)|bpmn|raci|jira|confluence|kanban|scrum|chef\s+de\s+produit|chargee?\s+de\s+produit)\b": "business analyst",

    # Strategy
    r"\b(strategy|strategie|strategic|consulting|consultant\s+strategie|transformation\s+office|operating\s+model|tom\b|target\s+operating\s+model|benchmark(?:ing)?|due\s+diligence|\bpmi\b|post[-\s]?merger\s+integration)\b": "strategy",

    # HR
    r"\b(rh|ressources\s+humaines|human\s+resources|hrbp|people\s+partner|people\s+ops?|talent\s+acquisition|recruteur|recruiter|payroll(?!\s*(provider|service|vendor|outsourc))|paie|comp(?:ensation)?(?:\s*&\s*benefits)?|benefits|c&b|learning\s*&?\s*development|l&d|personalreferent"
    r"|talent\s+management|hris|sirh|workday|successfactors|cornerstone|people\s+analytics|employee\s+relations|labou?r\s+relations|reward|remuneration|remuneration|avantages?\s+sociaux|total\s+rewards?|od|org\s+design)\b": "human resources",

    # Ops MO
    r"\b(middle\s*office|trade\s+support|pnl|p&l|risk\s+pnl)\b": "middle office",

    # Fund Admin
    r"\b(fund\s+accountant|fund\s+admin(?:istration)?|transfer\s+agent|ta\b|ta/agent|nav\s+production|ta\s+agent|subscriptions?|redemptions?|switches|dealing\s+desk|unitholders?|shareholders?|transfer\s+agency)\b": "fund accountant",

    # Ops BO
    r"\b(back\s*office|settlement[s]?|reconciliation|confirmations?|clearing|corporate\s+actions?|static\s+data|reference\s+data|collateral|margin|custody|swift|sepa|ach\b|payments?\s+operations?|securities\s+services|cheques?|checks?\s+processing|cash(?:\s+and)?\s+cheques?|operations?\s+(?:summer|full-?time)\s+analyst|operations?\s+(?:analyst\s+program|program)"
    r"|nostro|breaks?|fails?|ssi\b|prematch(?:ing)?|affirmation|\bomgeo\b|\bctm\b|mt\d{3}|iso\s*20022)\b": "back office",

    # Compliance
    r"\b(aml|kyc|onboarding|client\s+due\s+diligence|lcb\s?ft|lab/?ft|sanctions?|ofac|embargo|pep|adverse\s+media|transaction\s+monitoring|financial\s+crimes?|compliance|conformite|mifid|emir|mar|psd2|gfcd\b|regulatory\s+(?:relations|affairs)|(?:aml|kyc|pep|sanctions?|adverse\s+media|transaction)\s+screening"
    r"|cdd|edd|periodic\s+review|kyc\s+refresh|watchlist|sarlaft|abac|anti[-\s]?bribery|anti[-\s]?corruption|fraud\s+(?:investigation|monitoring))\b": "compliance",

    # Audit/Finance
    r"\b(audit|auditeur|auditing|controle\s+(?:interne|financier|de\s+gestion)|controleur\s+de\s+gestion|account(?:ing|ant)|general\s+ledger|gl\b|closing|cloture|ifrs|us\s+gaap|reporting|fp&a|p&l|profit\s*&\s*loss"
    r"|controlling|budget(?:ing)?|forecast(?:ing)?|variance\s+analysis|capex|opex|conso|sap\s+fi/?co|fico)\b": "accounting",

    # Legal (élargi)
    r"\b(juriste|lawyer|attorney|solicitor|barrister|abogado(?:a)?|legal\s+counsel|\blegal\b|avocat|avocate|paralegal|contract\s+manager|droit|corporate\s+law|fiscal(?:ite)?|privacy|data\s+protection|dpo|rgpd|gdpr|corporate\s+secretary|company\s+secretary|domiciliation)\b": "legal",

    # Retail
    r"\b(conseiller(?:e)?\s+(?:clientele|banque)|chargee?\s+de\s+clientele|directeur\s+d'agence|conseiller\s+pro|professionnels|retail\s+banking|front\s+office\s+agence|conseiller\s+commercial(?:\s+banque)?|guichet(?:ier)?|chargee?\s+d'accueil)\b": "conseiller clientele",

    # Coverage (+ ECM/DCM etc + GTS)
    r"\b(relationship\s+(?:manager|management|mgmt)|rm\b(?![a-z])|coverage(?!\s*markets)|corporate\s+banking|coverage\s+corporate|origination\s+corporate|cash\s+management|transaction\s+banking|gtb\b|gts\b|global\s+trade\s+solutions?|trade\s+finance"
    r"|cib\s+coverage|coverage\s+(?:fig|mnc|mid(?:-)?caps?|large\s+caps?)|relationship\s+banker|global\s+subsidiaries|(?:equity|debt|global|sustainable)\s+capital\s+markets?|\becm\b|\bdcm\b|syndicate|leveraged\s+finance|levfin)\b": "coverage",

    # Treasury
    r"\b(treasury|tresorerie|alm|asset\s+liability\s+management|liquidity\s+stress\s+testing|intraday\s+liquidity|cfp|eve|nii|medium\s+(?:long|long[-\s]?term)\s+funding|mlt\s+funding|term\s+funding|wholesale\s+funding)\b": "alm",

    # Risks
    r"\b(market\s+risk|var|stressed\s+var|frtb|irc|xva)\b": "market risk",
    r"\b(credit\s+risk|counterparty\s+risk|pd|lgd|ead|rating\s+model|scorecard|kreditrisiko|kreditrisikomanager|risques?\s+engagements?|credit\s+analysis|credit\s+committee)\b": "credit risk",
    r"\b(operational\s+risk|op(?:erational)?\s*risk|rci|rcs|sox\s+controls?|non[-\s]?financial\s+risk|permanent\s+control|controle\s+permanent|business\s+risk|rcsa|kri|icaap|risk\s+officer|risk\s+control)\b": "operational risk",
    r"\b(model\s+risk|model\s+validation|model\s+review|ml\s+validation|backtesting|benchmarking)\b": "model risk",

    # Markets Sales (generique) — FIX: charclass [,/-]
    r"(?:(?:markets?|trading|derivatives?|fx|forex|rates?|equities?|equity|credit|fixed\s+income|commodit(?:y|ies)|structured\s+products?)(?:\s|[,/-])+(?:\w+\s+){0,2}?(?:sales|distribution)\b|\bsales(?:\s|[,/-])+(?:trader|trading|markets?|derivatives?|fx|rates?|equities?|credit|structured\s+products?)\b|vendeur\s+(?:salle|marches?)|sales[-\s]?trader|institutional\s+sales|investor\s+sales|client\s+coverage)\b": "sales (markets)",

    # (1bis) Hotfix v6.7.3 — Vendeurs/Sales/Distribution <> Produits structurés (proximite)
    r"\b(?:(?:(?:assistants?\s+)?vendeurs?|sales|distribution)\b.{0,40}?\b(?:produits?\s+structures?|structured\s+products?)|(?:produits?\s+structures?|structured\s+products?)\b.{0,40}?\b(?:(?:assistants?\s+)?vendeurs?|sales|distribution))\b": "sales (markets)",

    # Structuring — FIX: digital/binary options only
    r"\b(structurer|structuring|produits?\s+structures?|structured\s+products?|payoff|exotic(?:s)?\s+structur(?:e|ing)|term\s*sheet|autocall(?:able)?|barriers?|digital\s+(?:options?|calls?|puts?|coupons?|barriers?|payoffs?)|binary\s+options?|binaries)\b": "structuring",

    # Trading
    r"\b(trader?s?|trading|market\s+maker|prop(rietary)?\s+trading|delta\s+one|flow\s+trading|options?|futures?|swaps?|swaptions?|exotics?|repo|mm\b|money\s+markets?|rfq\b|\bvwap\b|\btwap\b|algo(?:rithmic)?\s+trading|otc|listed\s+derivatives?)\b": "trading",

    # Research
    r"\b(research\s+(?:analyst|associate)|equity\s+research|credit\s+research|macro\s+(?:research|strategy|strategist)|strategy\s+(?:analyst|associate)|sell[-\s]?side\s+research|buy[-\s]?side\s+research|(?:global|investment)\s+research|initiation\s+of\s+coverage)\b": "research",

    # Global Markets (fallback)
    r"\\bglobal\\s+markets?\\b": "global markets",

    # Investment Banking (fallback)
    r"\\b(investment\\s+banking|ib\\s+(?:analyst|off[-\\s]?cycle|internship|summer|graduate)|ibd\\b)\\b": "investment banking",

    # Buy side / WM
    r"\b(asset\s+management|buy[-\s]?side|portfolio\s+manager|fund\s+manager|gerant(?:e)?|gestion\s+d?actifs?|opcvm|ucits|aifm|fund\s+selector|multi-?manager|rfp|multi[-\s]?asset|investment\s+management)\b": "asset management",
    r"\b(private\s+banker|banquier\s+prive(?:s|es)?|wealth\s+management|private\s+wealth|family\s+office|private\s+banking|investment\s+advisor|wealth\s+planner|trust\s+(?:officer|services?)|financial\s+advis(?:or|er)|client\s+advis(?:or|er)y?)\b": "wealth management",

    # Real Estate
    r"\b(real\s+estate|immobilier|property\s+(?:management|investing)|reits?|fonciere|siic|valuation|appraisal)\b(?!\s*(bank|banking|coverage))": "real estate",
}

# Précompilation (regex sur texte déjà "strip_accents().lower()")
_RULES_COMPILED: list[tuple[re.Pattern, str, str]] = [
    (re.compile(pattern), category, WHY_TAGS.get(pattern, "")) for pattern, category in RULE_BASED_CLASSIFICATION.items()
]


# -------------------------------------------------------------
# Classification
# -------------------------------------------------------------

def classify_by_rules(text: str) -> Optional[str]:
    """Retourne la première catégorie qui matche, sinon None."""
    if not text:
        return None
    lower_clean = strip_accents(text.lower())
    for regex, category, _why in _RULES_COMPILED:
        if regex.search(lower_clean):
            return category
    return None


def classify_job_with_why(text: str) -> tuple[str, str]:
    """
    Retourne (category, why).
    why = "<mot-cle>  |  <pattern regex>" ou "—"
    """
    if not text:
        return ("Autre", "—")
    lower_clean = strip_accents(text.lower())
    for regex, category, why_tag in _RULES_COMPILED:
        m = regex.search(lower_clean)
        if m:
            matched = m.group(0)
            # mot-clé lisible (tronqué pour rester court)
            key = (why_tag or matched).strip()
            if len(key) > 60:
                key = key[:57] + "..."
            return (category, f"{key}  |  {regex.pattern}")
    return ("Autre", "—")


def classify_job(text: str, location: str = "") -> str:
    """Retourne la catégorie via règles; sinon 'Autre' (compat historique)."""
    return classify_by_rules(text) or "Autre"


# -------------------------------------------------------------
# Normalisation du type de contrat
# -------------------------------------------------------------

def normalize_contract_type(title: str, raw_text: str | None) -> str:
    combined_text = strip_accents(f"{raw_text or ''} {title or ''}").lower().replace('-', ' ').replace('_', ' ')
    specific_terms = {
        # stages
        'stage': 'stage', 'internship': 'stage', 'intern': 'stage', 'stagiaire': 'stage', 'summer internship': 'stage',
        # alternance
        'alternance': 'alternance', 'apprentissage': 'alternance', 'apprenticeship': 'alternance',
        'alternant': 'alternance', 'apprenti': 'alternance', 'work study': 'alternance',
        'contrat pro': 'alternance', 'professionalisation': 'alternance',
        # cdd / intérim / contract
        'cdd': 'cdd', 'contrat a duree determinee': 'cdd', 'temporary': 'cdd', 'contract': 'cdd', 'interim': 'cdd',
        # freelance
        'freelance': 'freelance', 'independant': 'freelance', 'contractor': 'freelance',
        # vie (info de contrat, pas une catégorie)
        'v i e': 'vie', 'vie': 'vie',
        # programmes
        'graduate program': 'cdi', 'graduate': 'cdi', 'trainee program': 'cdi',
        # temps de travail
        'part time': 'cdi', 'temps partiel': 'cdi', 'full time': 'cdi',
    }
    for keyword, standardized_value in specific_terms.items():
        if keyword in combined_text:
            return standardized_value

    seniority_implies_cdi = {
        'analyst', 'associate', 'vp', 'vice president', 'director', 'managing director',
        'manager', 'specialist', 'executive', 'officer', 'engineer', 'lead', 'head'
    }
    for keyword in seniority_implies_cdi:
        if keyword in combined_text:
            return 'cdi'

    generic_terms = {'cdi': 'cdi', 'contrat a duree indeterminee': 'cdi', 'permanent': 'cdi', 'regular': 'cdi'}
    for keyword, standardized_value in generic_terms.items():
        if keyword in combined_text:
            return standardized_value

    return "non-specifie"


# -------------------------------------------------------------
# Enrichissement localisation (optionnel)
# -------------------------------------------------------------

try:
    with open(Path(__file__).parent / "city_country.pkl", "rb") as f:
        CITY_COUNTRY = pickle.load(f)
except FileNotFoundError:
    print("[CLASSIFIER] ERREUR: 'city_country.pkl' introuvable.")
    CITY_COUNTRY = {}

def enrich_location(raw_location: str | None) -> str | None:
    if not raw_location:
        return None
    lower = raw_location.lower()
    for city, country in CITY_COUNTRY.items():
        if city.lower() in lower:
            return f"{raw_location} ({country})"
    return raw_location


# -------------------------------------------------------------
# Exports publics
# -------------------------------------------------------------
__all__ = [
    "strip_accents",
    "RULE_BASED_CLASSIFICATION",
    "classify_by_rules",
    "classify_job",
    "classify_job_with_why",
    "normalize_contract_type",
    "enrich_location",
]
