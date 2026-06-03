"""
Local Vendor App — FastAPI Backend
Handles: Auth (JWT), MySQL CRUD (stores/products/bills),
         Speech recognition (Whisper), NLP product parsing (spaCy),
         Vision product identification (CLIP), Barcode lookup
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from routers import speech, nlp, vision, barcode
from routers import auth as auth_router
from routers import data as data_router
from database import engine
import db_models

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create DB tables on startup (safe no-op if they already exist)."""
    logger.info("⚡  Starting Vyapari backend...")
    db_models.Base.metadata.create_all(bind=engine)
    logger.info("✅  MySQL tables ready.")
    yield
    logger.info("🛑  Shutting down.")


app = FastAPI(
    title="Vyapari — Backend API",
    description="Auth, CRUD, Speech, NLP, Vision, and Barcode endpoints for Vyapari",
    version="2.0.0",
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
app.include_router(auth_router.router, prefix="/auth",   tags=["Auth"])
app.include_router(data_router.router, prefix="/api",    tags=["Data"])
app.include_router(speech.router,      prefix="/speech", tags=["Speech"])
app.include_router(nlp.router,         prefix="/nlp",    tags=["NLP"])
app.include_router(vision.router,      prefix="/vision", tags=["Vision"])
app.include_router(barcode.router,     prefix="/barcode",tags=["Barcode"])


@app.get("/", tags=["Health"])
def root():
    return {
        "status": "ok",
        "service": "vyapari-backend",
        "version": "2.0.0",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}
