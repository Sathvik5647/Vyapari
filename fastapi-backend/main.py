"""
Local Vendor App — FastAPI ML Backend
Handles: Speech recognition (Whisper), NLP product parsing (spaCy),
         Vision product identification (CLIP), Barcode lookup
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from routers import speech, nlp, vision, barcode

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load ML models once at startup — keeps them warm for all requests."""
    logger.info("⚡  Loading ML models...")

    # Whisper — loaded lazily on first request to keep startup fast
    # CLIP — same
    # spaCy — same
    logger.info("✅  FastAPI ML backend ready.")
    yield
    logger.info("🛑  Shutting down.")


app = FastAPI(
    title="Local Vendor App — ML API",
    description="Speech, NLP, Vision, and Barcode endpoints for the Local Vendor App",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────
app.include_router(speech.router, prefix="/speech",  tags=["Speech"])
app.include_router(nlp.router,    prefix="/nlp",     tags=["NLP"])
app.include_router(vision.router, prefix="/vision",  tags=["Vision"])
app.include_router(barcode.router,prefix="/barcode", tags=["Barcode"])


@app.get("/", tags=["Health"])
def health():
    return {
        "status": "ok",
        "service": "local-vendor-ml-api",
        "endpoints": [
            "POST /speech/transcribe",
            "POST /nlp/parse-product",
            "POST /vision/identify-product",
            "GET  /barcode/lookup/{barcode}",
        ],
    }


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}
