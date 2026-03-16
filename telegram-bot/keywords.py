# ─────────────────────────────────────────────────────────────────────────────
# Keyword lists aligned with PSOTS Group Etiquettes document
# All checks are case-insensitive
# ─────────────────────────────────────────────────────────────────────────────

# ── STRICTLY NOT ALLOWED ──────────────────────────────────────────────────────

# 1. Foul language and derogatory comments
FOUL_LANGUAGE_KEYWORDS = [
    # English profanity (common)
    "fuck", "shit", "bitch", "bastard", "asshole", "idiot", "stupid",
    "moron", "loser", "dumb", "fool", "rubbish", "nonsense person",
    "shut up", "get lost", "go to hell",
    # Hindi / Hinglish profanity
    "bhosdike", "bhosdi", "madarchod", "behenchod", "bc ", " bc", "mc ",
    "chutiya", "gaandu", "haramkhor", "harami", "kamina", "kameena",
    "kutte", "suar", "gadha", "ullu",
    # Derogatory / disrespectful
    "worthless", "useless person", "go away", "who asked you",
    "mind your business", "shut your mouth",
]

# 2. Personal attacks and bullying
BULLYING_KEYWORDS = [
    "you are a liar", "you are lying", "stop lying", "liar",
    "you are wrong always", "always wrong", "typical you",
    "you people", "people like you",
    "threatening", "i will complain", "i will report you",
    "i know where you live", "let's see what you do",
]

# 3. Political or religious posts
POLITICAL_KEYWORDS = [
    # Party names
    "bjp", "congress", "aap", "aam aadmi party", "shiv sena", "bsp",
    "sp ", " sp ", "ncp", "dmk", "admk", "trs", "brs", "jdu", "rjd",
    "tmc", "trinamool", "samajwadi", "bahujan",
    # Leaders
    "narendra modi", "rahul gandhi", "arvind kejriwal", "amit shah",
    "yogi adityanath", "mamata banerjee", "nitish kumar", "smriti irani",
    # Electoral
    "vote for", "election result", "political party", "manifesto",
    "lok sabha", "rajya sabha", "constituency", "mla", "vidhayak",
    "chunav", "matdan", "vote karo", "party win",
]

RELIGIOUS_KEYWORDS = [
    # Religious conflict terms (NOT festival names — those are allowed)
    "religion is better", "my religion", "your religion is wrong",
    "hinduism vs", "islam vs", "convert to", "forced conversion",
    "temple vs mosque", "mandir vs masjid",
    "religious conflict", "communal harmony broken",
    "kafir", "jihad", "dharma yuddh",
]

# 4. Communal and sensitive topic discussion
COMMUNAL_KEYWORDS = [
    "north indian", "south indian are", "these people from",
    "outsiders", "they don't belong", "go back to your state",
    "caste", "upper caste", "lower caste", "dalit should",
    "reservation is wrong", "quota system",
    "communal", "riots", "mob", "lynching",
    "minority", "majority community",
]

# ── ADVERTISEMENTS / BUY-SELL ──────────────────────────────────────────────────

AD_KEYWORDS = [
    # Direct sales
    "for sale", "selling my", "i am selling", "anyone want to buy",
    "bikau hai", "bechna hai",
    # Promotions
    "buy now", "best price", "special offer", "flat discount",
    "limited offer", "grab now", "order now", "deal of the day",
    "coupon code", "promo code", "link in bio", "check my profile",
    # Business promotion
    "my business", "my shop", "my store", "visit my", "my startup",
    "i have started", "launching soon my",
    # Financial schemes
    "earn money", "work from home opportunity", "passive income",
    "mlm", "multi level", "network marketing", "referral bonus",
    "investment opportunity", "guaranteed returns", "double your money",
    "crypto investment", "stock tips", "trading signal",
    # Contact for business
    "dm me for", "whatsapp me for price", "call me for rate",
    "contact for details", "ping me for",
    # Interior / carpenter referrals (unsolicited)
    "good carpenter", "best interior", "contact this person for work",
    "here is contractor number", "i know a good plumber",
]

# ── GOOD TO AVOID ──────────────────────────────────────────────────────────────

# Social / personal milestone messages (mass-broadcast type)
SOCIAL_BROADCAST_KEYWORDS = [
    "happy birthday", "wish you a very happy", "congratulations on your marriage",
    "welcome new baby", "happy anniversary to",
    "good morning everyone", "good night everyone",
    "good morning friends", "good night friends",
    "have a great day everyone", "blessings to all",
    "jai shri ram", "jai mata di",  # When used as mass-forward (context needed)
    "forward this", "share this with everyone", "send to all groups",
    "please forward", "viral message",
]

# ── EXTERNAL LINKS ─────────────────────────────────────────────────────────────

EXTERNAL_LINK_PATTERNS = ["http://", "https://", "www.", "bit.ly", "tinyurl", "t.me/"]

# ── WHITELIST: Society-related safe terms ─────────────────────────────────────
# Messages with 2+ of these terms are considered society-relevant and bypass keyword flags

WHITELIST_TERMS = [
    "flat", "maintenance", "parking", "lift", "elevator", "gate", "intercom",
    "security", "guard", "water supply", "water tank", "electricity", "power cut",
    "chhath", "puja", "festival", "contribution", "committee", "meeting",
    "notice", "circular", "announcement", "society", "psots", "prestige",
    "visitor", "delivery", "package", "complaint", "repair", "plumber",
    "gym", "pool", "clubhouse", "amenity", "common area", "terrace",
    "block", "tower", "wing", "floor",
]


def contains_whitelisted_context(text: str) -> bool:
    """Return True if message has enough society context to override a flag."""
    text_lower = text.lower()
    matches = sum(1 for w in WHITELIST_TERMS if w in text_lower)
    return matches >= 2


def check_keywords(text: str) -> tuple[bool, str, str]:
    """
    Stage 1 keyword check against all rule categories.
    Returns (flagged: bool, reason: str, category: str)
    """
    text_lower = text.lower()

    # Society context overrides soft flags (ads, social, communal) but NOT hard flags
    has_society_context = contains_whitelisted_context(text_lower)

    # Hard violations — always flagged regardless of context
    for kw in FOUL_LANGUAGE_KEYWORDS:
        if kw in text_lower:
            return True, f"Foul language or derogatory comment detected — please maintain respectful communication in this group", "foul_language"

    for kw in BULLYING_KEYWORDS:
        if kw in text_lower:
            return True, f"Personal attack or bullying language detected — we have a zero-tolerance policy for bullying", "bullying"

    for kw in POLITICAL_KEYWORDS:
        if kw in text_lower:
            return True, f"Political content is not permitted in this group — please keep discussions PSOTS-related", "political"

    for kw in RELIGIOUS_KEYWORDS:
        if kw in text_lower:
            return True, f"Religious conflict content is not allowed — we maintain a neutral environment for all residents", "religious"

    for kw in COMMUNAL_KEYWORDS:
        if kw in text_lower:
            return True, f"Communal or sensitive topic discussion is strictly not allowed in this group", "communal"

    # Soft violations — skipped if strong society context present
    if not has_society_context:
        for kw in AD_KEYWORDS:
            if kw in text_lower:
                return True, f"Advertisements and buy-sell activities are not allowed without prior admin approval — please contact an admin first", "advertisement"

        for kw in SOCIAL_BROADCAST_KEYWORDS:
            if kw in text_lower:
                return True, f"Mass social messages are discouraged — please keep the group focused on PSOTS society matters", "social_broadcast"

    return False, "", ""


def check_external_links(text: str) -> bool:
    """Return True if the message contains an external link."""
    text_lower = text.lower()
    return any(pattern in text_lower for pattern in EXTERNAL_LINK_PATTERNS)


# Category descriptions for /rules command
RULE_CATEGORIES = {
    "foul_language": "Foul language & derogatory comments",
    "bullying": "Personal attacks & bullying",
    "political": "Political posts",
    "religious": "Religious conflict posts",
    "communal": "Communal & sensitive discussions",
    "advertisement": "Unauthorized advertisements / buy-sell",
    "social_broadcast": "Mass social broadcast messages",
    "external_link": "Unauthorized external links",
}
