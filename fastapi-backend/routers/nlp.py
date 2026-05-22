"""
NLP router — POST /nlp/parse-product
Extracts structured product info from natural language text.
e.g. "Add 1kg Basmati Rice at 120 rupees" → {name, unit, price, category}

Two-layer approach:
  1. Regex pipeline (fast, ~85% accuracy for simple patterns)
  2. spaCy NER fallback for complex sentences
"""

import re
from fastapi import APIRouter
from pydantic import BaseModel, Field

from models.nlp_model import get_nlp_pipeline

router = APIRouter()


class ParseProductRequest(BaseModel):
    text: str = Field(..., example="Add 1kg Basmati Rice at 120 rupees")


class ParseProductResponse(BaseModel):
    name: str
    unit: str | None
    price: float | None
    price_display: str | None
    category: str | None
    raw_text: str
    confidence: str   # "high" | "medium" | "low"


# ── Category keyword map ───────────────────────────────────────────────────
CATEGORY_KEYWORDS = {
    "Grocery":     ["rice", "flour", "sugar", "salt", "oil", "dal", "masala", "atta",
                    "pulses", "ghee", "butter", "milk", "bread", "biscuit", "tea", "coffee",
                    "basmati", "poha", "sooji", "maida", "besan"],
    "Pharmacy":    ["tablet", "medicine", "syrup", "capsule", "cream", "ointment",
                    "bandage", "sanitizer", "mask", "vitamin", "paracetamol"],
    "Clothing":    ["shirt", "pant", "dress", "saree", "kurta", "jeans", "t-shirt",
                    "blouse", "lehenga", "suit", "dupatta", "sock", "underwear"],
    "Electronics": ["phone", "charger", "cable", "earphone", "headphone", "bulb",
                    "led", "battery", "adapter", "fan", "heater", "cooler"],
}

# ── Unit patterns ─────────────────────────────────────────────────────────
UNIT_PATTERN = re.compile(
    r"\b(\d+(?:\.\d+)?)\s*"
    r"(kg|g|gm|gram|grams|l|ltr|litre|ml|piece|pc|pcs|dozen|pack|box|bottle|bag|sachet|unit)\b",
    re.IGNORECASE
)

# ── Price patterns ────────────────────────────────────────────────────────
PRICE_PATTERN = re.compile(
    r"(?:(?:rs|₹|rupees?|price|at|for|costing?)\s*)"
    r"(\d+(?:\.\d{1,2})?)"
    r"(?:\s*(?:rs|₹|rupees?))?",
    re.IGNORECASE
)

# Fallback: bare number at end of sentence
PRICE_FALLBACK = re.compile(r"(\d+(?:\.\d{1,2})?)\s*(?:rs|₹|rupees?)?$", re.IGNORECASE)


def _detect_category(text: str) -> str | None:
    lower = text.lower()
    for cat, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in lower for kw in keywords):
            return cat
    return None


def _regex_parse(text: str) -> dict:
    """Fast regex-based extraction."""
    result: dict = {"raw_text": text, "confidence": "low"}

    # Price
    price_match = PRICE_PATTERN.search(text) or PRICE_FALLBACK.search(text)
    if price_match:
        result["price"] = float(price_match.group(1))
        result["price_display"] = f"₹{result['price']:.0f}"

    # Unit
    unit_match = UNIT_PATTERN.search(text)
    if unit_match:
        qty_num = unit_match.group(1)
        unit_str = unit_match.group(2).lower()
        result["unit"] = f"{qty_num}{unit_str}"

    # Product name: remove unit+price tokens, clean up
    clean = text
    if unit_match:
        clean = clean.replace(unit_match.group(0), "")
    if price_match:
        # remove everything from the price keyword onwards
        clean = re.sub(
            r"\b(at|for|costing?|price|rs|₹|rupees?)\b.*", "", clean, flags=re.IGNORECASE
        )
    # Remove filler words
    clean = re.sub(r"\b(add|please|can you|i want|put|include|a|an|the)\b", "", clean, flags=re.IGNORECASE)
    clean = re.sub(r"\s+", " ", clean).strip(" ,.")
    result["name"] = clean.title() if clean else "Unknown Product"

    # Category
    result["category"] = _detect_category(text)

    if result.get("price") and len(result.get("name", "")) > 3:
        result["confidence"] = "high"
    elif result.get("price") or len(result.get("name", "")) > 3:
        result["confidence"] = "medium"

    return result


def _spacy_parse(text: str, nlp) -> dict:
    """spaCy NER-based extraction as fallback."""
    doc = nlp(text)
    result = {"raw_text": text, "confidence": "medium"}

    # Extract quantities / products from spaCy entities
    for ent in doc.ents:
        if ent.label_ in ("QUANTITY", "CARDINAL") and not result.get("unit"):
            result["unit"] = ent.text
        if ent.label_ == "MONEY" and not result.get("price"):
            price_num = float(re.sub(r"[^0-9.]", "", ent.text) or 0)
            if price_num > 0:
                result["price"] = price_num
                result["price_display"] = f"₹{price_num:.0f}"

    # Product name = noun chunks excluding quantity/price tokens
    noun_chunks = [
        chunk.text for chunk in doc.noun_chunks
        if not any(ent.text in chunk.text for ent in doc.ents if ent.label_ in ("MONEY", "DATE"))
    ]
    result["name"] = noun_chunks[0].title() if noun_chunks else text.title()
    result["category"] = _detect_category(text)
    return result


@router.post("/parse-product", response_model=ParseProductResponse)
async def parse_product(request: ParseProductRequest):
    """
    Parse natural language product description into structured fields.
    Used by vendor voice input: Whisper → /parse-product → auto-fill form.
    """
    text = request.text.strip()
    if not text:
        return ParseProductResponse(
            name="", unit=None, price=None, price_display=None,
            category=None, raw_text="", confidence="low"
        )

    # Try regex first (fast)
    parsed = _regex_parse(text)

    # If confidence is low, try spaCy
    if parsed["confidence"] == "low":
        try:
            nlp = get_nlp_pipeline()
            spacy_result = _spacy_parse(text, nlp)
            # Merge: prefer regex where available
            for key in ("name", "unit", "price", "price_display", "category"):
                if not parsed.get(key) and spacy_result.get(key):
                    parsed[key] = spacy_result[key]
            parsed["confidence"] = "medium"
        except Exception:
            pass  # spaCy not loaded — regex result is good enough

    return ParseProductResponse(
        name=parsed.get("name", text.title()),
        unit=parsed.get("unit"),
        price=parsed.get("price"),
        price_display=parsed.get("price_display"),
        category=parsed.get("category"),
        raw_text=text,
        confidence=parsed.get("confidence", "low"),
    )
