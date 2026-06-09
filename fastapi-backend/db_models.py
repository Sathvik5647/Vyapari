"""
db_models.py — SQLAlchemy ORM models (tables in MySQL)
"""
# pyrefly: ignore [missing-import]
from sqlalchemy import (
    Column, String, Float, Boolean, Text, DateTime, ForeignKey, Integer, JSON
)
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import relationship
# pyrefly: ignore [missing-import]
from sqlalchemy.sql import func
import uuid

from database import Base


def new_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=new_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    # 'customer' (default) or 'vendor'
    role = Column(String(20), nullable=False, default="customer")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    store = relationship("Store", back_populates="vendor", uselist=False)


class Store(Base):
    __tablename__ = "stores"

    id = Column(String(36), primary_key=True, default=new_uuid)
    vendor_id = Column(String(36), ForeignKey("users.id"), nullable=False, unique=True)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=True)
    location_text = Column(String(500), nullable=True)
    phone = Column(String(20), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    rating = Column(Float, nullable=True)
    is_open = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    vendor = relationship("User", back_populates="store")
    products = relationship("Product", back_populates="store", cascade="all, delete-orphan")
    bills = relationship("Bill", back_populates="store", cascade="all, delete-orphan")


class Product(Base):
    __tablename__ = "products"

    id = Column(String(36), primary_key=True, default=new_uuid)
    store_id = Column(String(36), ForeignKey("stores.id"), nullable=False)
    name = Column(String(255), nullable=False)
    price = Column(Float, nullable=False, default=0.0)
    unit = Column(String(50), nullable=True)
    category = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    is_in_stock = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    store = relationship("Store", back_populates="products")


class Bill(Base):
    __tablename__ = "bills"

    id = Column(String(36), primary_key=True, default=new_uuid)
    store_id = Column(String(36), ForeignKey("stores.id"), nullable=False)
    customer_name = Column(String(255), nullable=True)
    customer_phone = Column(String(20), nullable=True)
    # items stored as JSON: [{name, qty, unit_price, total, product_id?}]
    items = Column(JSON, nullable=False, default=list)
    total = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    store = relationship("Store", back_populates="bills")
