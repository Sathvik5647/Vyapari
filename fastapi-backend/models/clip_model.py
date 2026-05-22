"""
CLIP model loader — openai/clip-vit-base-patch32 via HuggingFace transformers.
Singleton pattern: model loaded once, reused across all requests.
"""

import os
import logging
from functools import lru_cache

logger = logging.getLogger(__name__)

CLIP_MODEL_ID = os.getenv("CLIP_MODEL_ID", "openai/clip-vit-base-patch32")


@lru_cache(maxsize=1)
def get_clip_model():
    """
    Load and return the CLIP model + processor (singleton tuple).
    First call downloads the model (~600MB) from HuggingFace Hub.
    Returns: (CLIPModel, CLIPProcessor)
    """
    try:
        from transformers import CLIPModel, CLIPProcessor
        logger.info(f"Loading CLIP model '{CLIP_MODEL_ID}'...")
        processor = CLIPProcessor.from_pretrained(CLIP_MODEL_ID)
        model = CLIPModel.from_pretrained(CLIP_MODEL_ID)
        model.eval()  # inference mode
        logger.info("✅ CLIP model loaded.")
        return model, processor
    except ImportError:
        raise RuntimeError(
            "transformers not installed. Run: pip install transformers torch"
        )
    except Exception as e:
        raise RuntimeError(f"Failed to load CLIP model: {e}")
