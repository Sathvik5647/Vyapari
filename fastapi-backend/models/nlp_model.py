"""
spaCy NLP pipeline loader — used for product entity extraction.
Singleton pattern: pipeline loaded once, reused across requests.
"""

import logging
from functools import lru_cache

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_nlp_pipeline():
    """
    Load and return the spaCy English pipeline (singleton).
    Requires: python -m spacy download en_core_web_sm
    """
    try:
        import spacy
        logger.info("Loading spaCy en_core_web_sm...")
        nlp = spacy.load("en_core_web_sm")
        logger.info("✅ spaCy pipeline loaded.")
        return nlp
    except ImportError:
        raise RuntimeError("spaCy not installed. Run: pip install spacy")
    except OSError:
        raise RuntimeError(
            "spaCy English model not found. "
            "Run: python -m spacy download en_core_web_sm"
        )
