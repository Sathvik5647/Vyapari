"""
Barcode router — GET /barcode/lookup/{barcode}
Looks up product info from a local SQLite database seeded from Open Food Facts.
No live API calls — fully offline after initial seed.
"""

import os
import sqlite3
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

# Path to the local SQLite database (seeded from Open Food Facts dump)
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "products.db")


class BarcodeResult(BaseModel):
    barcode: str
    name: str
    brand: str | None
    category: str | None
    unit: str | None
    image_url: str | None
    source: str    # "local_db" | "not_found"


def get_db():
    """Get a read-only connection to the local products SQLite DB."""
    if not os.path.exists(DB_PATH):
        return None
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


@router.get("/lookup/{barcode}", response_model=BarcodeResult)
def barcode_lookup(barcode: str):
    """
    Look up a product by barcode (EAN-13, UPC-A, QR).
    Database is seeded from Open Food Facts — covers most packaged goods.
    """
    barcode = barcode.strip()
    if not barcode.isdigit():
        raise HTTPException(400, "Barcode must be numeric (EAN-13 / UPC-A).")

    conn = get_db()
    if conn is None:
        # DB not seeded yet — return a helpful fallback
        raise HTTPException(
            503,
            "Product database not yet seeded. "
            "Run: python scripts/seed_products_db.py"
        )

    try:
        cur = conn.cursor()
        row = cur.execute(
            "SELECT * FROM products WHERE barcode = ? LIMIT 1", (barcode,)
        ).fetchone()
        conn.close()

        if not row:
            raise HTTPException(404, f"Barcode {barcode} not found in local database.")

        return BarcodeResult(
            barcode=barcode,
            name=row["name"] or "Unknown Product",
            brand=row["brand"],
            category=row["category"],
            unit=row["quantity"],
            image_url=row["image_url"],
            source="local_db",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Database error: {str(e)}")


@router.get("/stats", tags=["Barcode"])
def barcode_db_stats():
    """Return stats about the local product database."""
    conn = get_db()
    if conn is None:
        return {"seeded": False, "product_count": 0, "path": DB_PATH}
    try:
        count = conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]
        conn.close()
        return {"seeded": True, "product_count": count, "path": DB_PATH}
    except Exception:
        return {"seeded": False, "product_count": 0, "path": DB_PATH}
