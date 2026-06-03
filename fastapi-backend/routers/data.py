"""
routers/data.py — CRUD endpoints for stores, products, and bills
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
import db_models
import schemas
from routers.auth import get_current_user

router = APIRouter()


# ─────────────────────────────────────────────────────────────
# STORES
# ─────────────────────────────────────────────────────────────

@router.get("/stores", response_model=List[schemas.StoreOut])
def list_all_stores(
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all stores (public — for consumer map view)."""
    q = db.query(db_models.Store)
    if category:
        q = q.filter(db_models.Store.category.ilike(f"%{category}%"))
    return q.all()


@router.get("/stores/mine", response_model=schemas.StoreOut)
def get_my_store(
    current_user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return the authenticated vendor's store, or 404."""
    store = db.query(db_models.Store).filter(
        db_models.Store.vendor_id == current_user.id
    ).first()
    if not store:
        raise HTTPException(status_code=404, detail="No store found for this vendor")
    return store


@router.post("/stores", response_model=schemas.StoreOut)
def create_store(
    body: schemas.StoreCreate,
    current_user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new store for the authenticated vendor."""
    existing = db.query(db_models.Store).filter(
        db_models.Store.vendor_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You already have a store. Use PATCH to update it.")

    store = db_models.Store(vendor_id=current_user.id, **body.model_dump())
    db.add(store)
    db.commit()
    db.refresh(store)
    return store


@router.patch("/stores/mine", response_model=schemas.StoreOut)
def update_my_store(
    body: schemas.StoreUpdate,
    current_user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    store = db.query(db_models.Store).filter(
        db_models.Store.vendor_id == current_user.id
    ).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(store, field, value)
    db.commit()
    db.refresh(store)
    return store


@router.get("/stores/{store_id}", response_model=schemas.StoreOut)
def get_store(store_id: str, db: Session = Depends(get_db)):
    """Get a specific store by ID (public — for consumer detail view)."""
    store = db.query(db_models.Store).filter(db_models.Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    return store


# ─────────────────────────────────────────────────────────────
# PRODUCTS
# ─────────────────────────────────────────────────────────────

@router.get("/stores/{store_id}/products", response_model=List[schemas.ProductOut])
def list_store_products(
    store_id: str,
    in_stock_only: bool = False,
    db: Session = Depends(get_db)
):
    """List products for a store (public)."""
    q = db.query(db_models.Product).filter(db_models.Product.store_id == store_id)
    if in_stock_only:
        q = q.filter(db_models.Product.is_in_stock == True)
    return q.order_by(db_models.Product.name).all()


@router.post("/stores/{store_id}/products", response_model=schemas.ProductOut)
def add_product(
    store_id: str,
    body: schemas.ProductCreate,
    current_user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a new product to your store."""
    store = db.query(db_models.Store).filter(
        db_models.Store.id == store_id,
        db_models.Store.vendor_id == current_user.id
    ).first()
    if not store:
        raise HTTPException(status_code=403, detail="Store not found or access denied")

    product = db_models.Product(store_id=store_id, **body.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.patch("/products/{product_id}", response_model=schemas.ProductOut)
def update_product(
    product_id: str,
    body: schemas.ProductUpdate,
    current_user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a product (vendor only)."""
    product = db.query(db_models.Product).join(db_models.Store).filter(
        db_models.Product.id == product_id,
        db_models.Store.vendor_id == current_user.id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/products/{product_id}")
def delete_product(
    product_id: str,
    current_user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    product = db.query(db_models.Product).join(db_models.Store).filter(
        db_models.Product.id == product_id,
        db_models.Store.vendor_id == current_user.id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()
    return {"ok": True}


# ─────────────────────────────────────────────────────────────
# BILLS
# ─────────────────────────────────────────────────────────────

@router.post("/stores/{store_id}/bills", response_model=schemas.BillOut)
def create_bill(
    store_id: str,
    body: schemas.BillCreate,
    current_user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create and save a bill."""
    store = db.query(db_models.Store).filter(
        db_models.Store.id == store_id,
        db_models.Store.vendor_id == current_user.id
    ).first()
    if not store:
        raise HTTPException(status_code=403, detail="Store not found or access denied")

    bill = db_models.Bill(
        store_id=store_id,
        customer_name=body.customer_name,
        customer_phone=body.customer_phone,
        items=[item.model_dump() for item in body.items],
        total=body.total,
    )
    db.add(bill)
    db.commit()
    db.refresh(bill)
    return bill


@router.get("/bills/{bill_id}", response_model=schemas.BillOut)
def get_bill(
    bill_id: str,
    current_user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch a specific bill (must belong to your store)."""
    bill = db.query(db_models.Bill).join(db_models.Store).filter(
        db_models.Bill.id == bill_id,
        db_models.Store.vendor_id == current_user.id
    ).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    return bill
