"""
schemas.py — Pydantic request/response models
"""
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import datetime


# ── Auth ──────────────────────────────────────────────────────
class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    role: Optional[str] = "customer"  # 'customer' or 'vendor'


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: str = "customer"


# ── Store ─────────────────────────────────────────────────────
class StoreCreate(BaseModel):
    name: str
    category: Optional[str] = None
    location_text: Optional[str] = None
    phone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class StoreUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    location_text: Optional[str] = None
    phone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    rating: Optional[float] = None
    is_open: Optional[bool] = None


class StoreOut(BaseModel):
    id: str
    vendor_id: str
    name: str
    category: Optional[str]
    location_text: Optional[str]
    phone: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    rating: Optional[float]
    is_open: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Product ───────────────────────────────────────────────────
class ProductCreate(BaseModel):
    name: str
    price: float = 0.0
    unit: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    is_in_stock: bool = True


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    unit: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    is_in_stock: Optional[bool] = None


class ProductOut(BaseModel):
    id: str
    store_id: str
    name: str
    price: float
    unit: Optional[str]
    category: Optional[str]
    description: Optional[str]
    is_in_stock: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Bill ──────────────────────────────────────────────────────
class BillItem(BaseModel):
    product_id: Optional[str] = None
    name: str
    qty: int
    unit_price: float
    total: float


class BillCreate(BaseModel):
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    items: List[BillItem]
    total: float


class BillOut(BaseModel):
    id: str
    store_id: str
    customer_name: Optional[str]
    customer_phone: Optional[str]
    items: List[Any]
    total: float
    created_at: datetime

    class Config:
        from_attributes = True
