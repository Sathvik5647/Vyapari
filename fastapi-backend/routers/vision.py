"""
Vision router — POST /vision/identify-product
Two modes:
  1. CLIP zero-shot classification → category + product name guess
  2. (Planned) BLIP-2 image captioning
"""

import base64
import io
import tempfile
import os
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

from models.clip_model import get_clip_model
from utils.image import preprocess_image

router = APIRouter()


# Product labels for CLIP zero-shot classification
PRODUCT_LABELS = [
    # Grocery
    "basmati rice", "wheat flour atta", "cooking oil", "sugar", "salt",
    "tea leaves", "coffee powder", "lentils dal", "milk packet", "butter",
    "bread loaf", "biscuit packet", "noodles", "masala spices", "ghee",
    # Pharmacy
    "medicine tablet strip", "vitamin supplement bottle", "bandage roll",
    "hand sanitizer", "face mask", "cough syrup bottle",
    # Clothing
    "cotton shirt", "jeans trousers", "saree", "kurta",
    # Electronics
    "mobile phone charger", "earphones headphones", "LED bulb", "battery",
    # Other
    "water bottle", "soap bar", "shampoo bottle", "toothpaste",
]


class IdentifyResponse(BaseModel):
    name: str
    category: str | None
    confidence: float
    all_scores: dict[str, float]


def _label_to_category(label: str) -> str | None:
    grocery_kws = ["rice", "flour", "oil", "sugar", "salt", "tea", "coffee",
                   "lentil", "milk", "butter", "bread", "biscuit", "noodle", "masala", "ghee"]
    pharma_kws  = ["medicine", "vitamin", "bandage", "sanitizer", "mask", "syrup"]
    cloth_kws   = ["shirt", "jeans", "saree", "kurta", "trouser"]
    elec_kws    = ["charger", "earphone", "headphone", "bulb", "battery"]

    lower = label.lower()
    if any(k in lower for k in grocery_kws):  return "Grocery"
    if any(k in lower for k in pharma_kws):   return "Pharmacy"
    if any(k in lower for k in cloth_kws):    return "Clothing"
    if any(k in lower for k in elec_kws):     return "Electronics"
    return None


@router.post("/identify-product", response_model=IdentifyResponse)
async def identify_product(image: UploadFile = File(...)):
    """
    Identify a product from a photo using CLIP zero-shot classification.
    Returns: product name guess, category, confidence score.
    Used by vendor camera → auto-fill product name.
    """
    allowed = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
    ext = os.path.splitext(image.filename or "image.jpg")[1].lower()
    if ext not in allowed:
        raise HTTPException(400, f"Unsupported image format: {ext}. Use JPEG/PNG.")

    content = await image.read()

    try:
        model, processor = get_clip_model()
        img = preprocess_image(content)

        import torch
        inputs = processor(
            text=PRODUCT_LABELS,
            images=img,
            return_tensors="pt",
            padding=True,
        )

        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits_per_image  # shape: [1, num_labels]
            probs = logits.softmax(dim=1)[0]

        scores = {label: float(prob) for label, prob in zip(PRODUCT_LABELS, probs)}
        best_label = max(scores, key=scores.get)  # type: ignore
        best_score = scores[best_label]

        # Format name nicely
        name = best_label.title()
        category = _label_to_category(best_label)

        # Return top-10 scores sorted descending
        top_scores = dict(sorted(scores.items(), key=lambda x: x[1], reverse=True)[:10])

        return IdentifyResponse(
            name=name,
            category=category,
            confidence=round(best_score, 4),
            all_scores=top_scores,
        )

    except Exception as e:
        raise HTTPException(500, f"Vision inference failed: {str(e)}")


@router.post("/identify-product-base64", response_model=IdentifyResponse)
async def identify_product_base64(payload: dict):
    """
    Same as /identify-product but accepts base64-encoded image string.
    Useful when sending from React Native without FormData.
    """
    b64 = payload.get("image_base64", "")
    if not b64:
        raise HTTPException(400, "Missing 'image_base64' field.")

    try:
        content = base64.b64decode(b64)
        model, processor = get_clip_model()
        img = preprocess_image(content)

        import torch
        inputs = processor(
            text=PRODUCT_LABELS, images=img, return_tensors="pt", padding=True
        )
        with torch.no_grad():
            outputs = model(**inputs)
            probs = outputs.logits_per_image.softmax(dim=1)[0]

        scores = {label: float(prob) for label, prob in zip(PRODUCT_LABELS, probs)}
        best_label = max(scores, key=scores.get)  # type: ignore

        return IdentifyResponse(
            name=best_label.title(),
            category=_label_to_category(best_label),
            confidence=round(scores[best_label], 4),
            all_scores=dict(sorted(scores.items(), key=lambda x: x[1], reverse=True)[:10]),
        )
    except Exception as e:
        raise HTTPException(500, f"Vision inference failed: {str(e)}")
