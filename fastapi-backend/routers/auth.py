"""
routers/auth.py — Signup, Login, and JWT helpers

Fix: replaced passlib (incompatible with bcrypt>=4) with direct bcrypt calls.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from jose import JWTError, jwt
import bcrypt as _bcrypt
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os

from database import get_db
import db_models
import schemas

load_dotenv()

router = APIRouter()

# ── Config ────────────────────────────────────────────────────
SECRET_KEY = os.getenv("JWT_SECRET", "vyapari-super-secret-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24 * 7   # 1 week


# ── Password helpers (direct bcrypt — no passlib) ─────────────
def hash_password(plain: str) -> str:
    return _bcrypt.hashpw(plain.encode("utf-8"), _bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


# ── JWT helpers ───────────────────────────────────────────────
def create_access_token(user_id: str, role: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {"sub": user_id, "role": role, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """Returns {"user_id": str, "role": str} or raises 401."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        role: str = payload.get("role", "customer")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"user_id": user_id, "role": role}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# ── OAuth2 dependency ─────────────────────────────────────────
from fastapi.security import OAuth2PasswordBearer, HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Security

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)
bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> db_models.User:
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    info = decode_token(token)
    user = db.query(db_models.User).filter(db_models.User.id == info["user_id"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def get_optional_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> db_models.User | None:
    """Like get_current_user but returns None instead of 401 — for public endpoints."""
    if not token:
        return None
    try:
        info = decode_token(token)
        return db.query(db_models.User).filter(db_models.User.id == info["user_id"]).first()
    except HTTPException:
        return None


# ── Endpoints ─────────────────────────────────────────────────
@router.post("/signup", response_model=schemas.TokenResponse)
def signup(body: schemas.SignupRequest, db: Session = Depends(get_db)):
    """Create a new account. Default role is 'customer'."""
    existing = db.query(db_models.User).filter(db_models.User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    user = db_models.User(
        email=body.email.lower().strip(),
        hashed_password=hash_password(body.password),
        role=body.role or "customer",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.role)
    return schemas.TokenResponse(access_token=token, user_id=user.id, role=user.role)


@router.post("/login", response_model=schemas.TokenResponse)
def login(body: schemas.LoginRequest, db: Session = Depends(get_db)):
    """Authenticate and return a JWT with role embedded."""
    user = db.query(db_models.User).filter(
        db_models.User.email == body.email.lower().strip()
    ).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(user.id, user.role)
    return schemas.TokenResponse(access_token=token, user_id=user.id, role=user.role)


@router.post("/become-vendor", response_model=schemas.TokenResponse)
def become_vendor(
    current_user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upgrade a customer account to vendor. Issues a new JWT with role=vendor."""
    if current_user.role == "vendor":
        raise HTTPException(status_code=400, detail="Already a vendor")
    current_user.role = "vendor"
    db.commit()
    db.refresh(current_user)
    token = create_access_token(current_user.id, "vendor")
    return schemas.TokenResponse(access_token=token, user_id=current_user.id, role="vendor")


@router.get("/me")
def get_me(current_user: db_models.User = Depends(get_current_user)):
    """Return the currently authenticated user's basic info including role."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "has_store": current_user.store is not None,
    }
