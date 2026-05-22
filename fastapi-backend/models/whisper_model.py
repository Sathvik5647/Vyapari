"""
Whisper model loader — uses faster-whisper (CTranslate2 backend).
Singleton pattern: model loaded once, reused across all requests.
"""

import os
import logging
from functools import lru_cache

logger = logging.getLogger(__name__)

# Model size: "tiny" | "base" | "small" | "medium" | "large-v2"
# Use "base" for CPU (good speed/accuracy). Use "small" if you have GPU.
WHISPER_MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "base")
WHISPER_DEVICE     = os.getenv("WHISPER_DEVICE", "cpu")   # "cpu" or "cuda"
WHISPER_COMPUTE    = os.getenv("WHISPER_COMPUTE_TYPE", "int8")  # int8 is fastest on CPU


@lru_cache(maxsize=1)
def get_whisper_model():
    """
    Load and return the faster-whisper model (singleton).
    First call downloads the model (~150MB for 'base').
    """
    try:
        from faster_whisper import WhisperModel
        logger.info(f"Loading Whisper '{WHISPER_MODEL_SIZE}' on {WHISPER_DEVICE}...")
        model = WhisperModel(
            WHISPER_MODEL_SIZE,
            device=WHISPER_DEVICE,
            compute_type=WHISPER_COMPUTE,
        )
        logger.info("✅ Whisper model loaded.")
        return model
    except ImportError:
        raise RuntimeError(
            "faster-whisper not installed. Run: pip install faster-whisper"
        )
    except Exception as e:
        raise RuntimeError(f"Failed to load Whisper model: {e}")
